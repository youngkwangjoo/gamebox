from channels.generic.websocket import AsyncWebsocketConsumer
from django.apps import apps  # 동적 모델 접근을 위한 apps import
from asgiref.sync import sync_to_async
import json


class LobbyConsumer(AsyncWebsocketConsumer):
    lobby_participants = []  # 클래스 수준의 로비 참가자 관리

    async def connect(self):
        await self.channel_layer.group_add("lobby", self.channel_name)
        await self.accept()

        nickname = self.scope['user'].nickname
        if nickname not in LobbyConsumer.lobby_participants:
            LobbyConsumer.lobby_participants.append(nickname)

        await self.broadcast_participants()

    async def disconnect(self, close_code):
        nickname = self.scope['user'].nickname
        if nickname in LobbyConsumer.lobby_participants:
            LobbyConsumer.lobby_participants.remove(nickname)
        await self.channel_layer.group_discard("lobby", self.channel_name)

        await self.broadcast_participants()

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get("action") == "refresh":
            await self.broadcast_participants()

    async def broadcast_participants(self):
        await self.channel_layer.group_send(
            "lobby",
            {
                "type": "update_participants",
                "participants": LobbyConsumer.lobby_participants,
            }
        )

    async def update_participants(self, event):
        await self.send(text_data=json.dumps({
            "type": "participants",
            "participants": event["participants"],
        }))


class GameRoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope["url_route"]["kwargs"].get("room_id", None)

        if not self.room_id:
            await self.close(code=4001)
            print("[ERROR] Room ID is required for connection.")
            return

        nickname = getattr(self.scope['user'], 'nickname', None)
        if not nickname:
            await self.close(code=4002)
            print("[ERROR] Nickname is required to join a room.")
            return

        participants = []
        if self.room_id == "new":
            self.room_id, participants = await sync_to_async(self.add_to_room)(nickname=nickname)
            self.room_group_name = f"room_{self.room_id}"
        else:
            try:
                participants = await sync_to_async(self.add_to_room)(room_id=int(self.room_id), nickname=nickname)
                self.room_group_name = f"room_{self.room_id}"
            except ValueError as e:
                await self.close(code=4003)
                print(f"[ERROR] Invalid room ID: {e}")
                return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        await self.send(text_data=json.dumps({
            "type": "participants",
            "participants": participants,
        }))

    async def disconnect(self, close_code):
        nickname = self.scope['user'].nickname
        try:
            participants = await sync_to_async(self.remove_from_room)(self.room_id, nickname)
        except Exception as e:
            print(f"[ERROR] Exception during disconnect: {e}")
            return

        if len(participants) == 0:
            Room = apps.get_model('liargame', 'Room')
            try:
                room = await sync_to_async(Room.objects.get)(room_number=self.room_id)
                await sync_to_async(room.delete)()
                print(f"[DEBUG] Room {self.room_id} deleted because it's empty.")
            except Room.DoesNotExist:
                print(f"[DEBUG] Room {self.room_id} not found for deletion.")

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

    def add_to_room(self, room_id=None, nickname=None):
        Room = apps.get_model('liargame', 'Room')

        if room_id is None:
            room_id = self.generate_room_id()

        room, _ = Room.objects.get_or_create(room_number=room_id)

        CustomUser = apps.get_model('liargame', 'CustomUser')
        user = CustomUser.objects.get(nickname=nickname)
        room.players.add(user)

        participants = [player.nickname for player in room.players.all()]
        print(f"[DEBUG] add_to_room: Room ID {room_id}, Participants: {participants}")
        return participants

    def remove_from_room(self, room_id, nickname):
        Room = apps.get_model("liargame", "Room")
        try:
            room = Room.objects.get(room_number=room_id)
        except Room.DoesNotExist:
            print(f"[DEBUG] Room {room_id} not found.")
            return []

        CustomUser = apps.get_model("liargame", "CustomUser")
        user = CustomUser.objects.get(nickname=nickname)
        room.players.remove(user)

        participants = [player.nickname for player in room.players.all()]
        print(f"[DEBUG] remove_from_room: Room ID {room_id}, Participants: {participants}")
        return participants

    def generate_room_id(self):
        Room = apps.get_model('liargame', 'Room')
        existing_ids = set(Room.objects.values_list('room_number', flat=True))
        for room_id in range(1, 1000):
            if room_id not in existing_ids:
                return room_id
        raise ValueError("No available room IDs.")
