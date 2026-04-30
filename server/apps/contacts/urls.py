from django.urls import path
from .views import GoogleContactsView, InviteContactView

urlpatterns = [
    path('google-contacts/', GoogleContactsView.as_view(), name='google-contacts'),
    path('invite/', InviteContactView.as_view(), name='invite-contact'),
]
