from channels.generic.websocket import AsyncWebsocketConsumer
from django.apps import apps  # 동적 모델 접근을 위한 apps import
from asgiref.sync import sync_to_async
import json


class LobbyConsumer(AsyncWebsocketConsumer):
    lobby_participants = []  # 로비 참가자 관리

    async def connect(self):
        # WebSocket 연결 수락
        await self.channel_layer.group_add("lobby", self.channel_name)
        await self.accept()

        # 참가자 추가
        nickname = self.scope['user'].nickname
        self.lobby_participants.append(nickname)

        # 참가자 목록 전송
        await self.broadcast_participants()

    async def disconnect(self, close_code):
        # WebSocket 연결 종료
        nickname = self.scope['user'].nickname
        if nickname in self.lobby_participants:
            self.lobby_participants.remove(nickname)
        await self.channel_layer.group_discard("lobby", self.channel_name)

        # 참가자 목록 업데이트
        await self.broadcast_participants()

    async def receive(self, text_data):
        # 메시지 수신 처리
        data = json.loads(text_data)
        action = data.get("action")

        if action == "refresh":
            await self.broadcast_participants()

    async def broadcast_participants(self):
        # 참가자 목록 브로드캐스트
        await self.channel_layer.group_send(
            "lobby",
            {
                "type": "update_participants",
                "participants": self.lobby_participants,
            }
        )

    async def update_participants(self, event):
        # 참가자 목록 클라이언트에 전송
        await self.send(text_data=json.dumps({
            "type": "participants",
            "participants": event["participants"],
        }))

class GameRoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # URL 경로에서 room_id 가져오기
        self.room_id = self.scope["url_route"]["kwargs"].get("room_id", None)  # 기본값 None 설정

        if not self.room_id:
            await self.close(code=4001)  # 방 ID가 없으면 연결 종료
            print("[ERROR] Room ID is required for connection.")
            return

        nickname = getattr(self.scope['user'], 'nickname', None)  # 사용자 닉네임 가져오기
        if not nickname:
            await self.close(code=4002)  # 닉네임이 없으면 연결 종료
            print("[ERROR] Nickname is required to join a room.")
            return

        participants = []

        if self.room_id == "lobby":
            # 로비 처리
            self.room_group_name = "lobby"
            participants = await sync_to_async(self.add_to_lobby)(nickname)
        elif self.room_id == "new":
            # 새로운 room_id 생성
            self.room_id, participants = await sync_to_async(self.add_to_room)(nickname=nickname)
            self.room_group_name = f"room_{self.room_id}"
        else:
            try:
                # 기존 방에 참가
                participants = await sync_to_async(self.add_to_room)(room_id=int(self.room_id), nickname=nickname)
                self.room_group_name = f"room_{self.room_id}"
            except ValueError as e:
                await self.close(code=4003)  # 잘못된 방 ID
                print(f"[ERROR] Invalid room ID: {e}")
                return

        # WebSocket 그룹에 추가
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # 현재 참가자 목록을 클라이언트에 전송
        await self.send(text_data=json.dumps({
            "type": "participants",
            "participants": participants,
        }))

    async def disconnect(self, close_code):
        nickname = self.scope['user'].nickname
        participants = await sync_to_async(self.remove_from_room)(self.room_id, nickname)

        # 방장이 나가면 방 삭제
        if len(participants) == 0:
            Room = apps.get_model('liargame', 'Room')
            try:
                room = Room.objects.get(room_number=self.room_id)
                room.delete()  # 방 삭제
                print(f"[DEBUG] Room {self.room_id} deleted due to inactivity.")
            except Room.DoesNotExist:
                print(f"[DEBUG] Room {self.room_id} not found for deletion.")

        # 그룹에서 제거
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get("action")
        nickname = data.get("nickname", "익명")

        if action == "join":
            participants = await sync_to_async(self.add_to_room)(self.room_id, nickname)
            await self.broadcast_participants(participants)
        elif action == "leave":
            participants = await sync_to_async(self.remove_from_room)(self.room_id, nickname)
            await self.broadcast_participants(participants)

    async def broadcast_participants(self, participants):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "update_participants",
                "participants": participants,
            }
        )

    async def update_participants(self, event):
        participants = event["participants"]
        await self.send(text_data=json.dumps({
            "type": "participants",
            "participants": participants,
        }))

    def add_to_lobby(self, username):
        # 로비 관리 함수 (로비 관련 추가 처리)
        if username not in self.lobby_participants:
            self.lobby_participants.append(username)
        return self.lobby_participants

    def add_to_room(self, room_id=None, nickname=None):
        Room = apps.get_model('liargame', 'Room')

        # room_id가 없으면 새로 생성
        if room_id is None:
            room_id = self.generate_room_id()

        # 방을 생성하거나 가져오기
        room, _ = Room.objects.get_or_create(room_number=room_id)

        CustomUser = apps.get_model('liargame', 'CustomUser')
        user = CustomUser.objects.get(nickname=nickname)
        room.players.add(user)

        participants = [player.nickname for player in room.players.all()]
        print(f"[DEBUG] add_to_room: Room ID {room_id}, Participants: {participants}")
        return participants

    def remove_from_room(self, room_id, nickname):
        Room = apps.get_model("liargame", "Room")
        room = Room.objects.get(room_number=room_id)
        CustomUser = apps.get_model("liargame", "CustomUser")
        user = CustomUser.objects.get(nickname=nickname)
        room.players.remove(user)

        participants = [player.nickname for player in room.players.all()]
        print(f"[DEBUG] remove_from_room: Room ID {room_id}, Participants: {participants}")
        return participants

    def generate_room_id(self):
        Room = apps.get_model('liargame', 'Room')
        existing_ids = set(Room.objects.values_list('room_number', flat=True))
        for room_id in range(1, 1000):  # 1부터 1000까지의 ID 사용
            if room_id not in existing_ids:
                return room_id
        raise ValueError("No available room IDs.")



class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'

        # 방 그룹에 WebSocket 연결 추가
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # 방 그룹에서 WebSocket 연결 제거
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data.get('message')
        nickname = data.get('nickname', '익명')  # 기본 닉네임 설정

        # 메시지를 브로드캐스트
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'nickname': nickname,
            }
        )

    async def chat_message(self, event):
        message = event['message']
        nickname = event['nickname']

        # 클라이언트로 메시지 전송
        await self.send(text_data=json.dumps({
            'message': message,
            'nickname': nickname,
        }))
