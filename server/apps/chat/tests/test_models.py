import pytest
from apps.chat.models import Conversation, ConversationParticipant, Message
from apps.accounts.models import User

@pytest.mark.django_db
def test_create_conversation():
    user1 = User.objects.create_user(email="user1@example.com", password="password")
    user2 = User.objects.create_user(email="user2@example.com", password="password")

    # 1:1 conversation
    conv = Conversation.objects.create(is_group=False)
    ConversationParticipant.objects.create(conversation=conv, user=user1)
    ConversationParticipant.objects.create(conversation=conv, user=user2)

    assert conv.participants.count() == 2

    # Group conversation
    group = Conversation.objects.create(is_group=True, name="Test Group")
    ConversationParticipant.objects.create(conversation=group, user=user1, is_admin=True)
    assert group.name == "Test Group"
    assert group.participants.filter(is_admin=True).count() == 1

@pytest.mark.django_db
def test_message_persistence():
    user1 = User.objects.create_user(email="user1@example.com", password="password")
    conv = Conversation.objects.create(is_group=False)
    
    # Simulate encrypted bytea
    msg = Message.objects.create(
        conversation=conv,
        sender=user1,
        content=b'encrypted_content'
    )
    
    assert msg.content == b'encrypted_content'
    assert conv.messages.count() == 1
