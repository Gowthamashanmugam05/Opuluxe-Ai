from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('api/signup/', views.api_signup, name='api_signup'),
    path('api/login/', views.api_login, name='api_login'),
    path('api/chat/', views.api_chat, name='api_chat'),
    path('api/chat-history/', views.api_get_chat_history, name='api_get_chat_history'),
    path('api/chat-session/', views.api_get_session_detail, name='api_get_session_detail'),
    path('api/delete-chat/', views.api_delete_chat, name='api_delete_chat'),
    path('api/tryon/', views.api_tryon, name='api_tryon'),
    path('api/save-profile/', views.api_save_profile, name='api_save_profile'),
    path('api/get-profiles/', views.api_get_profiles, name='api_get_profiles'),
    path('api/get-profile/<str:profile_id>/', views.api_get_single_profile, name='api_get_single_profile'),
    path('api/delete-profile/', views.api_delete_profile, name='api_delete_profile'),
]
