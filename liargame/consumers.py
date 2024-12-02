from channels.generic.websocket import AsyncWebsocketConsumer
from django.apps import apps  # 동적 모델 접근을 위한 apps import
from asgiref.sync import sync_to_async
import json

class GameRoomConsumer(AsyncWebsocketConsumer):
    lobby_participants = []
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'room_{self.room_id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        # 닉네임 설정
        nickname = self.scope['user'].nickname if self.scope['user'].is_authenticated else "익명"
        print(f"[DEBUG] add_to_lobby: Adding nickname {nickname}")

        participants = await sync_to_async(self.add_to_lobby)(nickname)
        print(f"[DEBUG] add_to_lobby (updated): {participants}")

        # 현재 참가자 목록을 클라이언트로 전송
        await self.send(text_data=json.dumps({
            'type': 'participants',
            'participants': participants
        }))

    async def disconnect(self, close_code):
        if self.room_id == "lobby":
            await sync_to_async(self.remove_from_lobby)(self.scope['user'].nickname)
        else:
            await sync_to_async(self.remove_from_room)(self.room_id, self.scope['user'].nickname)

        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')
        nickname = data.get('nickname', "익명")

        print(f"[DEBUG] Received action: {action}, nickname: {nickname}")

        if action == 'join' and nickname:
            participants = await sync_to_async(self.add_to_lobby)(nickname)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'update_participants',
                    'participants': participants,
                }
            )
        elif action == 'leave' and nickname:
            participants = await sync_to_async(self.remove_from_lobby)(nickname)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'update_participants',
                    'participants': participants,
                }
            )


    def add_to_lobby(self, username):
        if not username or username.strip() == "":
            print("[DEBUG] add_to_lobby: Received empty or invalid username")
            return self.lobby_participants  # 익명을 추가하지 않음

        if username not in self.lobby_participants:
            self.lobby_participants.append(username)
            print(f"[DEBUG] add_to_lobby (updated): {self.lobby_participants}")

        return self.lobby_participants  

    def remove_from_lobby(self, username):
        if username in self.lobby_participants:
            self.lobby_participants.remove(username)
        return self.lobby_participants
    
    def get_lobby_participants(self):
        from django.core.cache import cache
        participants = cache.get('lobby_participants', [])
        print(f"[DEBUG] get_lobby_participants: {participants}")  # 디버깅 로그
        return participants

    def add_to_room(self, room_id, nickname):
        Room = apps.get_model('liargame', 'Room')
        room, created = Room.objects.get_or_create(room_number=room_id)
        CustomUser = apps.get_model('liargame', 'CustomUser')
        user = CustomUser.objects.get(nickname=nickname)
        room.players.add(user)
        return [player.nickname for player in room.players.all()]

    def remove_from_room(self, room_id, nickname):
        Room = apps.get_model('liargame', 'Room')
        room = Room.objects.get(room_number=room_id)
        CustomUser = apps.get_model('liargame', 'CustomUser')
        user = CustomUser.objects.get(nickname=nickname)
        room.players.remove(user)
        return [player.nickname for player in room.players.all()]

    def get_room_participants(self, room_id):
        Room = apps.get_model('liargame', 'Room')
        room = Room.objects.get(room_number=room_id)
        return [player.nickname for player in room.players.all()]

    async def update_participants(self, event):
        participants = event['participants']
        print(f"[DEBUG] Sending participants to client: {participants}")
        await self.send(text_data=json.dumps({
            'type': 'participants',
            'participants': participants,
        }))

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
