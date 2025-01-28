import json
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache
from asgiref.sync import sync_to_async

class JustChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """ 웹소켓 연결 """
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.nickname = self.scope['user'].nickname
        self.room_group_name = f"just_chat_{self.room_id}"

        print(f"[DEBUG] WebSocket 연결됨 - 방 ID: {self.room_id}, 닉네임: {self.nickname}")

        # ✅ WebSocket 그룹 추가
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # ✅ 참가자 추가 및 참가자 목록 전송
        participants = await self.add_participant()
        print(f"[DEBUG] 참가자 추가됨: {participants}")
        await self.broadcast_participants(participants)

    async def disconnect(self, close_code):
        """ 웹소켓 연결 해제 """
        print(f"[DEBUG] WebSocket 연결 해제됨 - 방 ID: {self.room_id}, 닉네임: {self.nickname}")

        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

        # ✅ 참가자 제거 후 참가자 목록 업데이트
        participants = await self.remove_participant()
        print(f"[DEBUG] 참가자 제거됨 - 현재 참가자 목록: {participants}")
        await self.broadcast_participants(participants)

    async def receive(self, text_data):
        """ 클라이언트로부터 메시지 수신 후 브로드캐스트 """
        print(f"[DEBUG] WebSocket 메시지 수신 - 데이터: {text_data}")

        try:
            data = json.loads(text_data)
            action = data.get("action")
            print(f"[DEBUG] 액션: {action}")

            if action == "message":
                message = data.get("message", "")
                print(f"[DEBUG] 채팅 메시지 - 닉네임: {self.nickname}, 메시지: {message}")
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "chat_message",
                        "nickname": self.nickname,
                        "message": message
                    }
                )

            elif action == "update_log":
                log_message = data.get("log", "")
                participant = data.get("participant", "")
                print(f"[DEBUG] 참가자 글 업데이트 - 닉네임: {participant}, 로그: {log_message}")

                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "log_update",
                        "participant": participant,
                        "log": log_message,
                    }
                )

        except json.JSONDecodeError as e:
            print(f"[ERROR] JSON 파싱 오류: {e}, 받은 데이터: {text_data}")

    async def chat_message(self, event):
        """ 채팅 메시지 클라이언트에 전달 """
        print(f"[DEBUG] 채팅 메시지 전송 - 닉네임: {event['nickname']}, 메시지: {event['message']}")

        await self.send(text_data=json.dumps({
            "type": "message",
            "nickname": event["nickname"],
            "message": event["message"]
        }))

    async def log_update(self, event):
        """ 참가자의 로그 업데이트 """
        print(f"[DEBUG] 로그 업데이트 전송 - 닉네임: {event['participant']}, 로그: {event['log']}")

        await self.send(text_data=json.dumps({
            "type": "log_update",
            "participant": event["participant"],
            "log": event["log"],
        }))

    async def broadcast_participants(self, participants):
        """ 참가자 목록을 그룹 내 모든 클라이언트에게 전송 """
        print(f"[DEBUG] 참가자 목록 브로드캐스트 - 참가자: {participants}")

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "update_participants",
                "participants": participants,
            }
        )

    async def update_participants(self, event):
        """ 참가자 목록을 클라이언트에게 전달 """
        print(f"[DEBUG] 참가자 목록 업데이트 - 참가자: {event['participants']}")

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

        print(f"[DEBUG] 참가자 추가 완료 - 현재 참가자 목록: {participants}")
        return participants

    async def remove_participant(self):
        """ 참가자 제거 (캐시 활용) """
        participants = await sync_to_async(cache.get)(f"just_chat_{self.room_id}_participants") or []
        if self.nickname in participants:
            participants.remove(self.nickname)
            await sync_to_async(cache.set)(f"just_chat_{self.room_id}_participants", participants, timeout=3600)

        print(f"[DEBUG] 참가자 제거 완료 - 현재 참가자 목록: {participants}")
        return participants
