import json
from channels.generic.websocket import AsyncWebsocketConsumer

class JustChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """ 웹소켓 연결 """
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.room_group_name = f"just_chat_{self.room_id}"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        """ 웹소켓 종료 """
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        """ 클라이언트로부터 메시지 수신 후 브로드캐스트 """
        data = json.loads(text_data)
        nickname = data.get("nickname", "익명")
        message = data.get("message", "")

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "nickname": nickname,
                "message": message
            }
        )

    async def chat_message(self, event):
        """ 메시지를 클라이언트에 전달 """
        await self.send(text_data=json.dumps({
            "action": "message",  # ✅ `type` → `action` 변경 (JS와 일관성 유지)
            "nickname": event["nickname"],
            "message": event["message"]
        }))
