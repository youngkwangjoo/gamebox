from channels.generic.websocket import AsyncWebsocketConsumer
from django.apps import apps  # 동적 모델 접근을 위한 apps import
from asgiref.sync import sync_to_async
import json



class LobbyConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add("lobby", self.channel_name)
        await self.accept()

        nickname = self.scope['user'].nickname
        await self.add_participant(nickname)
        await self.broadcast_participants()

    async def disconnect(self, close_code):
        nickname = self.scope['user'].nickname
        await self.remove_participant(nickname)
        await self.channel_layer.group_discard("lobby", self.channel_name)
        await self.broadcast_participants()

    async def add_participant(self, nickname):
        participants = await self.get_participants()
        if nickname not in participants:
            participants.append(nickname)
            await self.save_participants(participants)

    async def remove_participant(self, nickname):
        participants = await self.get_participants()
        if nickname in participants:
            participants.remove(nickname)
            await self.save_participants(participants)

    async def get_participants(self):
        return await self.channel_layer.get("lobby_participants", [])

    async def save_participants(self, participants):
        await self.channel_layer.set("lobby_participants", participants)




class GameRoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope["url_route"]["kwargs"].get("room_id", None)
        print(f"[DEBUG] Attempting to connect. Room ID: {self.room_id}")

        if not self.room_id:
            await self.close(code=4001)
            print("[ERROR] Room ID is required for connection.")
            return

        nickname = getattr(self.scope['user'], 'nickname', None)
        print(f"[DEBUG] User nickname: {nickname}")

        if not nickname:
            await self.close(code=4002)
            print("[ERROR] Nickname is required to join a room.")
            return

        participants = []
        if self.room_id == "new":
            print(f"[DEBUG] Creating a new room for user: {nickname}")
            self.room_id, participants = await sync_to_async(self.add_to_room)(nickname=nickname)
            self.room_group_name = f"room_{self.room_id}"
        else:
            try:
                print(f"[DEBUG] Adding user {nickname} to existing room: {self.room_id}")
                participants = await sync_to_async(self.add_to_room)(room_id=int(self.room_id), nickname=nickname)
                self.room_group_name = f"room_{self.room_id}"
            except ValueError as e:
                await self.close(code=4003)
                print(f"[ERROR] Invalid room ID: {e}")
                return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        print(f"[DEBUG] User {nickname} connected to group {self.room_group_name}")

        await self.send(text_data=json.dumps({
            "type": "participants",
            "participants": participants,
        }))

    async def disconnect(self, close_code):
        nickname = self.scope['user'].nickname
        print(f"[DEBUG] User {nickname} is disconnecting from room {self.room_id}")

        try:
            participants = await sync_to_async(self.remove_from_room)(self.room_id, nickname)
            print(f"[DEBUG] Remaining participants in room {self.room_id}: {participants}")
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
        print(f"[DEBUG] User {nickname} removed from group {self.room_group_name}")

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get("action")
        nickname = self.scope['user'].nickname
        print(f"[DEBUG] Received action: {action} from user {nickname} with data: {data}")

        if action == "join":
            participants = await sync_to_async(self.add_to_room)(self.room_id, nickname)
            await self.broadcast_participants(participants)

        elif action == "leave":
            participants = await sync_to_async(self.remove_from_room)(self.room_id, nickname)
            await self.broadcast_participants(participants)

        elif action == "message":
            message = data.get("message", "")
            print(f"[DEBUG] Received message action from {nickname}: {message}")
            
            # WebSocket 그룹에 메시지 브로드캐스트
            print(f"[DEBUG] Preparing to broadcast message to group: {self.room_group_name}")
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_message",
                    "message": message,
                    "sender": nickname,
                }
            )
            print(f"[DEBUG] Successfully broadcasted message to group {self.room_group_name}")

    async def chat_message(self, event):
        message = event["message"]
        sender = event["sender"]
        print(f"[DEBUG] chat_message triggered. Message: {message}, Sender: {sender}")

        # WebSocket으로 메시지 전송
        await self.send(text_data=json.dumps({
            "type": "message",
            "message": message,
            "sender": sender,
        }))
        print(f"[DEBUG] Message sent to WebSocket. Message: {message}, Sender: {sender}")

    async def update_participants(self, event):
        participants = event["participants"]
        print(f"[DEBUG] Sending participants list to WebSocket: {participants}")

        await self.send(text_data=json.dumps({
            "type": "participants",
            "participants": participants,
        }))

    async def broadcast_participants(self, participants):
        """참가자 목록을 WebSocket 그룹에 브로드캐스트하는 메서드"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "update_participants",
                "participants": participants,
            }
        )

    def add_to_room(self, room_id=None, nickname=None):
        Room = apps.get_model('liargame', 'Room')
        CustomUser = apps.get_model('liargame', 'CustomUser')

        if room_id is None:
            room_id = self.generate_room_id()

        room, _ = Room.objects.get_or_create(room_number=room_id)
        user = CustomUser.objects.get(nickname=nickname)

        if not room.players.filter(pk=user.pk).exists():
            room.players.add(user)

        participants = list(room.players.values_list('nickname', flat=True))
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
                print(f"[DEBUG] Generated new room ID: {room_id}")
                return room_id
        raise ValueError("No available room IDs.")
