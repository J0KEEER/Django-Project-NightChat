import json
import base64
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from .models import Conversation, Message, ConversationParticipant
from .presence import set_user_online, set_user_offline

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        if self.user.is_anonymous:
            await self.close()
            return
        
        # Subscribe to personal channel
        self.user_room_name = f"user_{self.user.id}"
        await self.channel_layer.group_add(self.user_room_name, self.channel_name)

        # Find all conversations User is part of and subscribe
        self.conversations_ids = await self.get_user_conversations()
        for c_id in self.conversations_ids:
            room_name = f"conversation_{c_id}"
            await self.channel_layer.group_add(room_name, self.channel_name)
            # Notify others in this conversation that user is online
            await self.channel_layer.group_send(
                room_name,
                {
                    'type': 'presence_update',
                    'user_id': str(self.user.id),
                    'status': 'online'
                }
            )

        # Set presence in Redis
        await self.update_presence(True)
        await self.accept()

    async def disconnect(self, close_code):
        if not self.user.is_anonymous:
            await self.channel_layer.group_discard(self.user_room_name, self.channel_name)
            for c_id in self.conversations_ids:
                room_name = f"conversation_{c_id}"
                await self.channel_layer.group_discard(room_name, self.channel_name)
                # Notify others that user is offline
                await self.channel_layer.group_send(
                    room_name,
                    {
                        'type': 'presence_update',
                        'user_id': str(self.user.id),
                        'status': 'offline'
                    }
                )
            
            # Set presence in Redis
            await self.update_presence(False)

    async def receive(self, text_data=None, bytes_data=None):
        if text_data:
            data = json.loads(text_data)
            type = data.get('type')
            
            if type == 'message.send':
                await self.handle_message_send(data)
            elif type == 'presence.heartbeat':
                await self.update_presence(True)
            elif type in ['typing.start', 'typing.stop']:
                await self.handle_typing_event(data)
            elif type == 'message.read':
                await self.handle_message_read(data)
            elif type == 'webrtc.signal':
                await self.handle_webrtc_signal(data)

    async def handle_webrtc_signal(self, data):
        conversation_id = data.get('conversation_id')
        is_member = await self.verify_membership(conversation_id)
        if is_member:
            room_name = f"conversation_{conversation_id}"
            await self.channel_layer.group_send(
                room_name,
                {
                    'type': 'webrtc_signal',
                    'user_id': str(self.user.id),
                    'conversation_id': str(conversation_id),
                    'signal': data.get('signal')
                }
            )

    async def handle_message_send(self, data):
        conversation_id = data.get('conversation_id')
        content_base64 = data.get('content')
        
        is_member = await self.verify_membership(conversation_id)
        if is_member and content_base64:
            message = await self.save_message(conversation_id, content_base64)
            
            # Late import to avoid circular dependency
            from .serializers import MessageSerializer
            serializer = MessageSerializer(message)
            
            room_name = f"conversation_{conversation_id}"
            await self.channel_layer.group_send(
                room_name,
                {
                    'type': 'chat_message',
                    'message': serializer.data
                }
            )

    async def handle_typing_event(self, data):
        conversation_id = data.get('conversation_id')
        is_member = await self.verify_membership(conversation_id)
        if is_member:
            room_name = f"conversation_{conversation_id}"
            await self.channel_layer.group_send(
                room_name,
                {
                    'type': 'typing_update',
                    'user_id': str(self.user.id),
                    'conversation_id': str(conversation_id),
                    'event': data['type'] # typing.start or typing.stop
                }
            )

    async def handle_message_read(self, data):
        conversation_id = data.get('conversation_id')
        is_member = await self.verify_membership(conversation_id)
        if is_member:
            # Update last_read_at in DB
            await self.update_last_read(conversation_id)
            room_name = f"conversation_{conversation_id}"
            await self.channel_layer.group_send(
                room_name,
                {
                    'type': 'read_update',
                    'user_id': str(self.user.id),
                    'conversation_id': str(conversation_id),
                    'read_at': timezone.now().isoformat()
                }
            )

    async def chat_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'message.receive',
            **message
        }))

    async def presence_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'presence.update',
            'user_id': event['user_id'],
            'status': event['status']
        }))

    async def typing_update(self, event):
        # Don't send typing update back to the person who is typing
        if event['user_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': event['event'],
                'user_id': event['user_id'],
                'conversation_id': event['conversation_id']
            }))

    async def read_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message.read',
            'user_id': event['user_id'],
            'conversation_id': event['conversation_id'],
            'read_at': event['read_at']
        }))

    async def reaction_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'reaction.update',
            'message_id': event['message_id'],
            'user_id': event['user_id'],
            'emoji': event['emoji'],
            'action': event['action']
        }))

    async def webrtc_signal(self, event):
        # Don't send signal back to the sender
        if event['user_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'webrtc.signal',
                'user_id': event['user_id'],
                'conversation_id': event['conversation_id'],
                'signal': event['signal']
            }))

    async def update_presence(self, is_online):
        if is_online:
            await database_sync_to_async(set_user_online)(self.user.id)
        else:
            await database_sync_to_async(set_user_offline)(self.user.id)

    @database_sync_to_async
    def update_last_read(self, conversation_id):
        ConversationParticipant.objects.filter(
            conversation_id=conversation_id, 
            user=self.user
        ).update(last_read_at=timezone.now())

    @database_sync_to_async
    def get_user_conversations(self):
        return list(self.user.memberships.values_list('conversation_id', flat=True))

    @database_sync_to_async
    def verify_membership(self, conversation_id):
        return self.user.memberships.filter(conversation_id=conversation_id).exists()

    @database_sync_to_async
    def save_message(self, conversation_id, content_base64):
        binary_content = base64.b64decode(content_base64)
        return Message.objects.create(
            conversation_id=conversation_id,
            sender=self.user,
            content=binary_content
        )
