from django.urls import path
from .consumers import LobbyConsumer, GameRoomConsumer
from .just_chat_consumer import JustChatConsumer
from .just_chat_view import just_chat_room

websocket_urlpatterns = [
    path('ws/room/lobby/', LobbyConsumer.as_asgi()),
    path('ws/room/<str:room_id>/', GameRoomConsumer.as_asgi()),
    path('ws/just_chat/<int:room_id>/', JustChatConsumer.as_asgi()),
]