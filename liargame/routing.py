from django.urls import path
from .consumers import LobbyConsumer, GameRoomConsumer
from .just_chat_consumer import JustChatConsumer


websocket_urlpatterns = [
    path('ws/room/lobby/', LobbyConsumer.as_asgi()),
    path('ws/room/<str:room_id>/', GameRoomConsumer.as_asgi()),
    path('ws/just_chat/', JustChatConsumer.as_asgi())
]