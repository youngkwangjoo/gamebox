import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from liargame.routing import websocket_urlpatterns  # WebSocket 라우팅 가져오기

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gamebox.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),  # HTTP 요청 처리
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns  # WebSocket URL 라우팅
        )
    ),
})
