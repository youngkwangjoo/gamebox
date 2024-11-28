from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),         # 1페이지
    path('join/', views.join, name='join'),   # 2페이지
    path('game/', views.game, name='game'),   # 3페이지
    path('create-room/', views.create_room, name='create_room'),  # 4페이지
]