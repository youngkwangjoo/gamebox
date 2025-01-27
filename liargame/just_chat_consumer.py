from channels.generic.websocket import AsyncWebsocketConsumer
import json

class JustChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """
        사용자가 Just Chat에 연결될 때 실행되는 함수
        """
        self.room_group_name = "just_chat"

        # WebSocket 그룹에 참가
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        print("[DEBUG] 사용자가 Just Chat에 연결됨")

    async def disconnect(self, close_code):
        """
        사용자가 Just Chat에서 나갈 때 실행되는 함수
        """
        # WebSocket 그룹에서 제거
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        print("[DEBUG] 사용자가 Just Chat에서 나감")

    async def receive(self, text_data):
        """
        클라이언트가 메시지를 보낼 때 실행되는 함수
        """
        try:
            data = json.loads(text_data)
            action = data.get("action")

            if action == "message":
                message = data.get("message", "")
                nickname = data.get("nickname", "익명")

                # WebSocket 그룹에 메시지 전송
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "chat_message",
                        "message": message,
                        "nickname": nickname
                    }
                )
                print(f"[DEBUG] {nickname}가 메시지를 전송함: {message}")

        except json.JSONDecodeError:
            print("[ERROR] JSON 디코딩 오류 발생")
        except Exception as e:
            print(f"[ERROR] WebSocket 메시지 처리 중 오류 발생: {e}")

    async def chat_message(self, event):
        """
        WebSocket 그룹에서 메시지를 받아 클라이언트에게 전송하는 함수
        """
        message = event["message"]
        nickname = event["nickname"]

        # WebSocket을 통해 클라이언트에게 메시지 전송
        await self.send(text_data=json.dumps({
            "type": "message",
            "message": message,
            "nickname": nickname
        }))
        print(f"[DEBUG] WebSocket 메시지 전송 완료: {nickname}: {message}")
