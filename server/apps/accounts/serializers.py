from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token['email'] = user.email
        token['public_key'] = user.public_key
        return token

class UserSerializer(serializers.ModelSerializer):
    google_connected = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'display_name', 'bio', 'avatar', 'public_key', 'password', 'google_connected')
        extra_kwargs = {'password': {'write_only': True}}

    def get_google_connected(self, obj):
        from allauth.socialaccount.models import SocialToken
        return SocialToken.objects.filter(account__user=obj, account__provider='google').exists()

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            display_name=validated_data.get('display_name', ''),
            public_key=validated_data.get('public_key', '')
        )
        return user
