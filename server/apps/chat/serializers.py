import base64
from rest_framework import serializers
from .models import Conversation, ConversationParticipant, Message, Reaction
from apps.accounts.serializers import UserSerializer

class ReactionSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = Reaction
        fields = ['id', 'user', 'user_email', 'emoji', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

class MessageContentField(serializers.CharField):
    def to_representation(self, value):
        if value:
            if isinstance(value, memoryview):
                value = value.tobytes()
            elif isinstance(value, str):
                value = value.encode('utf-8')
            return base64.b64encode(value).decode('utf-8')
        return ""

    def to_internal_value(self, data):
        return base64.b64decode(data.encode('utf-8'))

class MessageSerializer(serializers.ModelSerializer):
    content = MessageContentField()
    sender_details = UserSerializer(source='sender', read_only=True)
    reactions = ReactionSerializer(many=True, read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_details', 'content', 'attachment', 'attachment_name', 'created_at', 'reactions']
        read_only_fields = ['id', 'created_at', 'sender', 'sender_details', 'reactions']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['sender'] = request.user
        return super().create(validated_data)


class EncryptedKeyField(serializers.CharField):
    def to_representation(self, value):
        if value:
            if isinstance(value, memoryview):
                value = value.tobytes()
            return base64.b64encode(value).decode('utf-8')
        return None

    def to_internal_value(self, data):
        if data:
            return base64.b64decode(data.encode('utf-8'))
        return None

class ConversationParticipantSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    encrypted_conversation_key = EncryptedKeyField(required=False, allow_null=True)

    class Meta:
        model = ConversationParticipant
        fields = ['id', 'user', 'user_details', 'joined_at', 'is_admin', 'last_read_at', 'encrypted_conversation_key', 'key_sender_public_key']
        read_only_fields = ['id', 'joined_at', 'last_read_at']


class ConversationSerializer(serializers.ModelSerializer):
    participants = ConversationParticipantSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = ['id', 'is_group', 'name', 'created_at', 'updated_at', 'participants', 'last_message', 'unread_count']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_last_message(self, obj):
        last_msg = obj.messages.first()
        if last_msg:
            return MessageSerializer(last_msg).data
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            participant = obj.participants.filter(user=request.user).first()
            if participant:
                return obj.messages.filter(created_at__gt=participant.last_read_at).count()
        return 0
