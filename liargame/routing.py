from django.urls import path
from .consumers import LobbyConsumer, GameRoomConsumer

websocket_urlpatterns = [
    path('ws/room/lobby/', LobbyConsumer.as_asgi()),
    path('ws/room/<str:room_id>/', GameRoomConsumer.as_asgi()),
]