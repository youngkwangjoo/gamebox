from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),  # 기본 페이지 엔드포인트
    path('chat/', views.chat, name='chat'),
]
