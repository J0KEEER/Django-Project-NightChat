import pytest
from asgiref.sync import sync_to_async
from channels.testing import WebsocketCommunicator
from rest_framework_simplejwt.tokens import AccessToken
from config.asgi import application
from apps.accounts.models import User
from apps.chat.models import Conversation

@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_ws_auth():
    # Valid auth
    user = await sync_to_async(User.objects.create_user)(email="ws_auth@example.com", password="password")
    token = str(AccessToken.for_user(user))
    
    communicator = WebsocketCommunicator(application, f"/ws/chat/?token={token}")
    connected, _ = await communicator.connect()
    assert connected
    await communicator.disconnect()
    
    # Invalid auth
    communicator_invalid = WebsocketCommunicator(application, "/ws/chat/?token=invalid")
    connected_invalid, _ = await communicator_invalid.connect()
    assert not connected_invalid

@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_ws_send_receive_message():
    user = await sync_to_async(User.objects.create_user)(email="ws_msg@example.com", password="password")
    token = str(AccessToken.for_user(user))
    
    conv = await sync_to_async(Conversation.objects.create)(is_group=False)
    await sync_to_async(conv.participants.create)(user=user)
    
    communicator = WebsocketCommunicator(application, f"/ws/chat/?token={token}")
    connected, _ = await communicator.connect()
    assert connected
    
    # Send message
    await communicator.send_json_to({
        "type": "message.send",
        "conversation_id": str(conv.id),
        "content": "encrypted_payload",
        "temp_id": "test-123"
    })
    
    # Receive response
    response = await communicator.receive_json_from()
    assert response["type"] == "message.receive"
    assert response["conversation"] == str(conv.id)
    assert response["content"] == "encrypted_payload"
    assert response["sender"] == str(user.id)
    
    await communicator.disconnect()
