import base64
from django.db import models
from rest_framework import viewsets, permissions, status, pagination
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Conversation, ConversationParticipant, Message, Reaction
from .serializers import ConversationSerializer, MessageSerializer, ReactionSerializer

class CursorSetPagination(pagination.CursorPagination):
    page_size = 20
    ordering = '-created_at'


class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(participants__user=self.request.user).distinct()

    def perform_create(self, serializer):
        with transaction.atomic():
            conversation = serializer.save()
            encrypted_keys = self.request.data.get('encrypted_keys', {})
            
            # Creator participant
            ConversationParticipant.objects.create(
                conversation=conversation, 
                user=self.request.user, 
                is_admin=True,
                encrypted_conversation_key=base64.b64decode(encrypted_keys.get(str(self.request.user.id))) if encrypted_keys.get(str(self.request.user.id)) else None,
                key_sender_public_key=self.request.data.get('creator_public_key')
            )
            
            members = self.request.data.get('members', [])
            if members:
                for user_id in members:
                    if str(user_id) != str(self.request.user.id):
                        key_b64 = encrypted_keys.get(str(user_id))
                        ConversationParticipant.objects.create(
                            conversation=conversation,
                            user_id=user_id,
                            encrypted_conversation_key=base64.b64decode(key_b64) if key_b64 else None,
                            key_sender_public_key=self.request.data.get('creator_public_key')
                        )

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        conversation = self.get_object()
        if not conversation.is_group:
            return Response({"detail": "Cannot add members to a 1:1 conversation."}, status=status.HTTP_400_BAD_REQUEST)
        
        participant = get_object_or_404(ConversationParticipant, conversation=conversation, user=request.user)
        if not participant.is_admin:
            return Response({"detail": "Only admins can add members."}, status=status.HTTP_403_FORBIDDEN)

        user_id = request.data.get('user_id')
        if not user_id:
            return Response({"user_id": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)

        cp, created = ConversationParticipant.objects.get_or_create(
            conversation=conversation,
            user_id=user_id,
        )
        if created:
            return Response({"detail": "User added"}, status=status.HTTP_201_CREATED)
        return Response({"detail": "User is already a member"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['GET'])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        messages = conversation.messages.all()

        paginator = CursorSetPagination()
        page = paginator.paginate_queryset(messages, request)
        if page is not None:
            serializer = MessageSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['POST'])
    def send_message(self, request, pk=None):
        conversation = self.get_object()
        serializer = MessageSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            # If there's an attachment but no attachment_name, try to get it from the file
            attachment = request.FILES.get('attachment')
            attachment_name = request.data.get('attachment_name')
            if attachment and not attachment_name:
                attachment_name = attachment.name
            
            message = serializer.save(conversation=conversation, attachment_name=attachment_name)
            
            # Broadcast to WebSocket group
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"conversation_{conversation.id}",
                {
                    'type': 'chat_message',
                    'message': serializer.data
                }
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['GET'])
    def search(self, request, pk=None):
        conversation = self.get_object()
        query = request.query_params.get('q', '')
        if not query:
            return Response({"detail": "Search query 'q' is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Search by attachment name or sender username
        messages = conversation.messages.filter(
            models.Q(attachment_name__icontains=query) |
            models.Q(sender__username__icontains=query)
        ).distinct()

        paginator = CursorSetPagination()
        page = paginator.paginate_queryset(messages, request)
        if page is not None:
            serializer = MessageSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['POST'])
    def mark_as_read(self, request, pk=None):
        conversation = self.get_object()
        participant = get_object_or_404(ConversationParticipant, conversation=conversation, user=request.user)
        participant.last_read_at = timezone.now()
        participant.save()
        
        # Optionally broadcast read receipt via WebSocket here if not already handled by client sending websocket event
        # But per plan, client sends 'message.read' via websocket. 
        # This API endpoint is a fallback or for non-websocket clients.
        
        return Response({"detail": "Conversation marked as read"}, status=status.HTTP_200_OK)


class MessageViewSet(viewsets.GenericViewSet):
    queryset = Message.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['POST'])
    def toggle_reaction(self, request, pk=None):
        message = self.get_object()
        emoji = request.data.get('emoji')
        if not emoji:
            return Response({"emoji": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)
        
        reaction, created = Reaction.objects.get_or_create(
            message=message,
            user=request.user,
            emoji=emoji
        )
        
        if not created:
            reaction.delete()
            action_taken = 'removed'
        else:
            action_taken = 'added'
            
        # Broadcast reaction update to conversation group
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"conversation_{message.conversation.id}",
            {
                'type': 'reaction_update',
                'message_id': str(message.id),
                'user_id': str(request.user.id),
                'emoji': emoji,
                'action': action_taken
            }
        )
        
        return Response({"detail": f"Reaction {action_taken}", "action": action_taken}, status=status.HTTP_200_OK)

    # Add reaction_update handler for consumers if needed, 
    # but we should add it to ChatConsumer to send to clients.

