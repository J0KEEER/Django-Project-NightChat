from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, CustomTokenObtainPairSerializer
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView

User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserSerializer

class LogoutView(generics.GenericAPIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response(status=status.HTTP_400_BAD_REQUEST)

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.conf import settings

from allauth.socialaccount.models import SocialApp, SocialAccount, SocialToken

class GoogleLogin(generics.GenericAPIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        token = request.data.get('access_token') # This is the ID Token (credential)
        access_token = request.data.get('google_access_token')  # OAuth access token
        public_key = request.data.get('public_key')
        
        try:
            # Verify the ID token
            idinfo = id_token.verify_oauth2_token(
                token, 
                google_requests.Request(), 
                settings.SOCIALACCOUNT_PROVIDERS['google']['APP']['client_id']
            )

            email = idinfo['email']
            user, created = User.objects.get_or_create(email=email)
            
            if created:
                user.display_name = idinfo.get('name', '')
                user.avatar = idinfo.get('picture', '')
                if public_key:
                    user.public_key = public_key
                user.save()
            elif not user.public_key and public_key:
                user.public_key = public_key
                user.save()

            # ✅ Store the OAuth access token for Google API calls
            if access_token:
                try:
                    social_app = SocialApp.objects.get(provider='google')
                    social_account, _ = SocialAccount.objects.get_or_create(
                        user=user,
                        provider='google',
                        defaults={'uid': idinfo['sub'], 'extra_data': idinfo}
                    )
                    SocialToken.objects.update_or_create(
                        account=social_account,
                        app=social_app,
                        defaults={'token': access_token}
                    )
                except SocialApp.DoesNotExist:
                    pass  # Google app not configured in DB — contacts won't work

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'access_token': str(refresh.access_token),
                'refresh_token': str(refresh),
                'user': UserSerializer(user).data
            })

        except ValueError:
            return Response({'detail': 'Invalid Google token'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
