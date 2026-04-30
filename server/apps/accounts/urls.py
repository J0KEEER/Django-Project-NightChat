from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, LogoutView, CustomTokenObtainPairView, GoogleLogin
from dj_rest_auth.views import UserDetailsView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('google/', GoogleLogin.as_view(), name='google_login'),
    path('user/', UserDetailsView.as_view(), name='user_details'),
]
