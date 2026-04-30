import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.chat.models import Conversation, Message

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def auth_client(api_client):
    user = User.objects.create_user(email="test@example.com", password="password")
    api_client.force_authenticate(user=user)
    return api_client, user

@pytest.mark.django_db
def test_create_group_conversation(auth_client):
    client, user = auth_client
    other_user = User.objects.create_user(email="other@example.com", password="password")

    url = reverse("conversation-list")
    data = {
        "is_group": True,
        "name": "API Group",
        "members": [str(other_user.id)]
    }
    
    response = client.post(url, data, format="json")
    assert response.status_code == 201
    assert response.data["name"] == "API Group"
    assert len(response.data["participants"]) == 2

@pytest.mark.django_db
def test_message_pagination(auth_client):
    client, user = auth_client
    conv = Conversation.objects.create(is_group=False)
    conv.participants.create(user=user)
    
    for i in range(25):
        Message.objects.create(conversation=conv, sender=user, content=f"msg_{i}".encode('utf-8'))
        
    url = reverse("conversation-messages", kwargs={"pk": conv.id})
    response = client.get(url)
    
    assert response.status_code == 200
    assert "results" in response.data
    assert len(response.data["results"]) == 20
    assert response.data["next"] is not None
