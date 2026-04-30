from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

User = get_user_model()

class RegistrationTests(APITestCase):
    def test_register_user(self):
        """
        Ensure we can create a new user object.
        """
        url = reverse('register')
        data = {
            'email': 'test@example.com',
            'password': 'securepassword123',
            'display_name': 'Test User',
            'public_key': 'test123publickeyhex'
        }
        response = self.client.post(url, data, format='json')
        print("\nRegistration Response:", response.data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(User.objects.get().email, 'test@example.com')
        self.assertEqual(User.objects.get().public_key, 'test123publickeyhex')

    def test_login_user(self):
        """
        Ensure user can login and receive JWT tokens with custom claims.
        """
        # First register
        user = User.objects.create_user(
            email='test@example.com', 
            password='securepassword123',
            public_key='test123publickeyhex'
        )
        
        url = reverse('token_obtain_pair')
        data = {
            'email': 'test@example.com',
            'password': 'securepassword123'
        }
        response = self.client.post(url, data, format='json')
        print("\nLogin Response:", response.data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
