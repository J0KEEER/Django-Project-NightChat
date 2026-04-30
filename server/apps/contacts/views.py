from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from allauth.socialaccount.models import SocialToken
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

User = get_user_model()

class GoogleContactsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            token = SocialToken.objects.get(
                account__user=request.user,
                account__provider='google'
            )
        except SocialToken.DoesNotExist:
            return Response(
                {"error": "Google account not linked or token missing"},
                status=status.HTTP_400_BAD_REQUEST
            )

        creds = Credentials(
            token=token.token,
            refresh_token=token.token_secret,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=settings.SOCIALACCOUNT_PROVIDERS['google']['APP']['client_id'],
            client_secret=settings.SOCIALACCOUNT_PROVIDERS['google']['APP']['secret']
        )

        try:
            service = build('people', 'v1', credentials=creds)
            results = service.people().connections().list(
                resourceName='people/me',
                pageSize=100,
                personFields='names,emailAddresses'
            ).execute()
            
            connections = results.get('connections', [])
            contacts = []
            
            emails_to_check = []
            for person in connections:
                email_addresses = person.get('emailAddresses', [])
                if email_addresses:
                    email = email_addresses[0].get('value')
                    name = person.get('names', [{}])[0].get('displayName', email)
                    emails_to_check.append(email)
                    contacts.append({
                        'name': name,
                        'email': email,
                        'is_on_nightchat': False
                    })

            # Check matching users
            existing_users = User.objects.filter(email__in=emails_to_check).values_list('email', flat=True)
            for contact in contacts:
                if contact['email'] in existing_users:
                    contact['is_on_nightchat'] = True

            return Response(contacts)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class InviteContactView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        subject = f"Join {request.user.username} on Nightchat!"
        message = f"Hi,\n\n{request.user.username} has invited you to join Nightchat, a secure E2EE messaging app.\n\nSign up here: {settings.FRONTEND_URL}/register"
        
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            return Response({"message": "Invitation sent successfully"})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
