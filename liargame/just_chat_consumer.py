import json
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache
from asgiref.sync import sync_to_async
from .models import Room

class JustChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """ 웹소켓 연결 """
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.nickname = self.scope['user'].nickname
        self.room_group_name = f"just_chat_{self.room_id}"

        # ✅ WebSocket 그룹 추가 (해당 방의 모든 클라이언트가 같은 그룹을 공유)
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # ✅ 참가자 추가 (캐시를 이용한 저장)
        participants = await self.add_participant()
        await self.broadcast_participants(participants)

    async def disconnect(self, close_code):
        """ 웹소켓 연결 해제 """
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

        # ✅ 참가자 제거 후 목록 업데이트
        participants = await self.remove_participant()
        await self.broadcast_participants(participants)

    async def receive(self, text_data):
        """ 클라이언트로부터 메시지 수신 후 브로드캐스트 """
        data = json.loads(text_data)
        action = data.get("action")

        if action == "message":
            message = data.get("message", "")
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_message",
                    "nickname": self.nickname,
                    "message": message
                }
            )
        elif action == "join":
            participants = await self.add_participant()
            await self.broadcast_participants(participants)


    async def chat_message(self, event):
        """ 클라이언트에게 메시지 전달 """
        await self.send(text_data=json.dumps({
            "type": "message",
            "nickname": event["nickname"],
            "message": event["message"]
        }))

    async def broadcast_participants(self, participants):
        """ 참가자 목록을 그룹 내 모든 클라이언트에게 전송 """
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "update_participants",
                "participants": participants,
            }
        )

    async def update_participants(self, event):
        """ 참가자 목록을 클라이언트에게 전달 """
        await self.send(text_data=json.dumps({
            "type": "participants",
            "participants": event["participants"],
        }))

    async def add_participant(self):
        """ 참가자 추가 (캐시 활용) """
        participants = await sync_to_async(cache.get)(f"just_chat_{self.room_id}_participants") or []
        if self.nickname not in participants:
            participants.append(self.nickname)
            await sync_to_async(cache.set)(f"just_chat_{self.room_id}_participants", participants, timeout=3600)
        return participants

    async def remove_participant(self):
        """ 참가자 제거 (캐시 활용) """
        participants = await sync_to_async(cache.get)(f"just_chat_{self.room_id}_participants") or []
        if self.nickname in participants:
            participants.remove(self.nickname)
            await sync_to_async(cache.set)(f"just_chat_{self.room_id}_participants", participants, timeout=3600)
        return participants
