from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),         
    path('join/', views.join, name='join'),   
    path('game/', views.game, name='game'),   
    path('create-room/', views.create_room, name='create_room'), 
    path('room/<int:room_id>/', views.room_detail, name='room_detail'),  # 방 상세 페이지
]
