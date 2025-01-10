from channels.generic.websocket import AsyncWebsocketConsumer
from django.apps import apps  # 동적 모델 접근을 위한 apps import
from asgiref.sync import sync_to_async
import json
from django.core.cache import cache


class LobbyConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add("lobby", self.channel_name)
        await self.accept()

        nickname = self.scope['user'].nickname
        participants = await self.get_participants()
        if nickname not in participants:
            participants.append(nickname)
            await self.save_participants(participants)
        
        # 브로드캐스트로 참가자 목록 전송
        await self.channel_layer.group_send(
            "lobby",
            {
                "type": "update_participants",
                "participants": participants,
            }
        )

    async def disconnect(self, close_code):
        nickname = self.scope['user'].nickname
        participants = await self.get_participants()
        if nickname in participants:
            participants.remove(nickname)
            await self.save_participants(participants)

        await self.channel_layer.group_discard("lobby", self.channel_name)
        await self.channel_layer.group_send(
            "lobby",
            {
                "type": "update_participants",
                "participants": participants,
            }
        )

    async def get_participants(self):
        return cache.get("lobby_participants", [])

    async def save_participants(self, participants):
        cache.set("lobby_participants", participants)

    async def update_participants(self, event):
        participants = event["participants"]
        await self.send(text_data=json.dumps({
            "type": "participants",
            "participants": participants,
        }))

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get("action")
        nickname = self.scope['user'].nickname  # 사용자 닉네임 가져오기

        if action == "delete_room":
            room_id = data.get("room_id")
            if room_id:
                Room = apps.get_model('liargame', 'Room')
                try:
                    # 방 정보를 데이터베이스에서 가져옴
                    room = await sync_to_async(Room.objects.get)(room_number=room_id)

                    # 방 삭제 권한 확인 (방 소유자인지 검증)
                    if room.owner.nickname != nickname:
                        print(f"[ERROR] {nickname} is not the owner of room {room_id}.")
                        return  # 방 소유자가 아니면 삭제 불가
                    
                    # 방 삭제
                    await sync_to_async(room.delete)()
                    print(f"[DEBUG] Room {room_id} deleted.")

                    # 방 삭제 이벤트를 모든 클라이언트에 브로드캐스트
                    await self.channel_layer.group_send(
                        "lobby",
                        {
                            "type": "room_deleted",
                            "room_id": room_id
                        }
                    )
                except Room.DoesNotExist:
                    print(f"[ERROR] Room {room_id} not found.")

        elif action == "create_room":
            room_name = data.get("room_name")
            game_type = data.get("game_type")
            
            if room_name and game_type:
                Room = apps.get_model('liargame', 'Room')
                try:
                    # 새로운 방 생성
                    room = await sync_to_async(Room.objects.create)(
                        room_number=self.generate_room_id(),
                        owner=self.scope['user'],
                        game_type=game_type
                    )
                    print(f"[DEBUG] Room {room.room_number} created by {nickname}.")

                    # 방 생성 이벤트를 모든 클라이언트에 브로드캐스트
                    await self.channel_layer.group_send(
                        "lobby",
                        {
                            "type": "room_created",
                            "room_id": room.room_number,
                            "owner": nickname,
                            "game_type": game_type,
                            "player_count": 1
                        }
                    )
                except Exception as e:
                    print(f"[ERROR] Failed to create room: {e}")
                    
    #클라이언트에 새 방 정보를 전송하는 메서드
    async def room_created(self, event):
        await self.send(text_data=json.dumps({
            "type": "room_created",
            "room_id": event["room_id"],
            "owner": event["owner"],
            "game_type": event["game_type"],
            "player_count": event["player_count"]
        }))

    async def room_deleted(self, event):
        room_id = event["room_id"]
        await self.send(text_data=json.dumps({
            "type": "room_deleted",
            "room_id": room_id
        }))


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
            nickname = self.scope['user'].nickname
            print(f"[DEBUG] Received message action from {nickname}: {message}")
            
            # WebSocket 그룹에 메시지 브로드캐스트
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_message",
                    "message": message,
                    "nickname": nickname  # nickname을 사용하여 전송
                }
            )
            print(f"[DEBUG] Successfully broadcasted message to group {self.room_group_name}")

            
        elif action == "vote":
            try:
                participant = data.get("participant")
                if not participant:
                    raise ValueError("Participant is missing in vote action")

                print(f"[DEBUG] Received vote for participant: {participant}")

                # 투표 수 갱신
                votes = cache.get(f"room_{self.room_id}_votes", {})
                if votes is None:
                    votes = {}  # 캐시 초기화

                votes[participant] = votes.get(participant, 0) + 1
                cache.set(f"room_{self.room_id}_votes", votes)

                print(f"[DEBUG] Updated votes: {votes}")

                # 모든 클라이언트에 투표 수 업데이트 브로드캐스트
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "vote_update",
                        "participant": participant,
                        "voteCount": votes[participant],
                    }
                )
            except Exception as e:
                print(f"[ERROR] Exception during vote handling: {e}")
                await self.close(code=1011)

            
        elif action == "update_log":
            log_message = data.get("log", "")
            participant = data.get("participant", "")
            print(f"[DEBUG] Received log update from {participant}: {log_message}")

            # WebSocket 그룹에 참가자 글 업데이트 브로드캐스트
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "log_update",
                    "participant": participant,
                    "log": log_message,
                }
            )
            print(f"[DEBUG] Successfully broadcasted log update to group {self.room_group_name}")

    async def chat_message(self, event):
        message = event["message"]
        nickname = event["nickname"]  # nickname 사용
        print(f"[DEBUG] chat_message triggered. Message: {message}, Sender: {nickname}")

        # WebSocket으로 메시지 전송
        await self.send(text_data=json.dumps({
            "type": "message",
            "message": message,
            "nickname": nickname  # nickname으로 전송
        }))
        print(f"[DEBUG] Message sent to WebSocket. Message: {message}, Sender: {nickname}")



    async def log_update(self, event):
        participant = event["participant"]
        log_message = event["log"]
        
        # WebSocket으로 참가자 글 업데이트 전송
        await self.send(text_data=json.dumps({
            "type": "log_update",
            "participant": participant,
            "log": log_message,
        }))
        print(f"[DEBUG] Sent log update to WebSocket: {participant} - {log_message}")
        
        

    async def update_participants(self, event):
        participants = event["participants"]
        print(f"[DEBUG] Sending participants list: {participants} (type: {type(participants)})")
        await self.send(text_data=json.dumps({
            "type": "participants",
            "participants": participants,
        }))

    async def broadcast_participants(self, participants):
        """참가자 목록을 WebSocket 그룹에 브로드캐스트하는 메서드"""
        print(f"[DEBUG] Broadcasting participants: {participants}")
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "update_participants",
                "participants": participants,
            }
        )

    async def vote_update(self, event):
        participant = event["participant"]
        vote_count = event["voteCount"]

        await self.send(text_data=json.dumps({
            "type": "vote_update",
            "participant": participant,
            "voteCount": vote_count,
        }))
        print(f"[DEBUG] Sent vote update: {participant} - {vote_count}표")


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

    async def room_deleted(self, event):
        # 클라이언트로 방 삭제 메시지 전송
        await self.send(text_data=json.dumps({
            "type": "room_deleted",
            "message": event["message"]
        }))
