from channels.generic.websocket import AsyncWebsocketConsumer
from django.apps import apps  # 동적 모델 접근을 위한 apps import
from asgiref.sync import sync_to_async
import json
from django.core.cache import cache
from .models import Room
from asgiref.sync import sync_to_async


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

        #print(f"[DEBUG] Received action: {action}, data: {data}")

        if action == "delete_room":
            room_id = data.get("room_id")
            #print(f"[DEBUG] Delete request for room_id: {room_id}")
            if room_id:
                Room = apps.get_model('liargame', 'Room')
                try:
                    # 방 정보를 데이터베이스에서 가져옴
                    room = await sync_to_async(Room.objects.get)(room_number=room_id)

                    # 방 삭제 권한 확인 (방 소유자인지 검증)
                    owner_nickname = await sync_to_async(lambda: room.owner.nickname)()
                    if owner_nickname != nickname:
                        print(f"[ERROR] {nickname} is not the owner of room {room_id}.")
                        return  # 방 소유자가 아니면 삭제 불가
                    else:
                        print(f"[DEBUG] {nickname} is the owner of room {room_id}. Proceeding with deletion.")
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
        self.nickname = getattr(self.scope['user'], 'nickname', None)
        
        if not self.room_id:
            await self.close(code=4001)
            print("[ERROR] Room ID is required for connection.")
            return

        if not self.nickname:
            await self.close(code=4002)
            print("[ERROR] Nickname is required to join a room.")
            return

        # 방 그룹 이름과 참가자 개별 채널 이름 설정
        self.room_group_name = f"room_{self.room_id}"
        self.user_channel_name = f"user_{self.nickname}"

        # 참가자를 방에 추가 (sync_to_async 제거, 직접 호출)
        try:
            participants = await self.add_to_room(room_id=int(self.room_id), nickname=self.nickname)
        except ValueError as e:
            await self.close(code=4003)
            print(f"[ERROR] Invalid room ID: {e}")
            return

        # 그룹과 개별 채널에 참가자 추가
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.channel_layer.group_add(self.user_channel_name, self.channel_name)

        await self.accept()
        print(f"[DEBUG] User {self.nickname} connected to group {self.room_group_name}")

        # 참가자 목록을 클라이언트로 전송
        await self.send(text_data=json.dumps({
            "type": "participants",
            "participants": participants,
        }))

    async def disconnect(self, close_code):
        print(f"[DEBUG] User {self.nickname} is disconnecting from room {self.room_id}")

        try:
            participants = await sync_to_async(self.remove_from_room)(self.room_id, self.nickname)
            print(f"[DEBUG] Remaining participants in room {self.room_id}: {participants}")
        except Exception as e:
            print(f"[ERROR] Exception during disconnect: {e}")
            return

        # 방이 비어 있으면 방 삭제
        if len(participants) == 0:
            Room = apps.get_model('liargame', 'Room')
            try:
                room = await sync_to_async(Room.objects.get)(room_number=self.room_id)
                await sync_to_async(room.delete)()
                print(f"[DEBUG] Room {self.room_id} deleted because it's empty.")
            except Room.DoesNotExist:
                print(f"[DEBUG] Room {self.room_id} not found for deletion.")

        # 그룹과 개별 채널에서 참가자 제거
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        await self.channel_layer.group_discard(self.user_channel_name, self.channel_name)
        print(f"[DEBUG] User {self.nickname} removed from group {self.room_group_name}")


    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get("action")
        nickname = self.scope['user'].nickname
        #print(f"[DEBUG] Received action: {action} from user {nickname} with data: {data}")

        if action == "join":
            participants = await self.add_to_room(self.room_id, nickname)
            await self.broadcast_participants(participants)

        elif action == "leave":
            participants = await self.remove_from_room(self.room_id, nickname)
            await self.broadcast_participants(participants)

        elif action == "message":
            message = data.get("message", "")
            nickname = self.scope['user'].nickname
            #print(f"[DEBUG] Received message action from {nickname}: {message}")
            
            # WebSocket 그룹에 메시지 브로드캐스트
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_message",
                    "message": message,
                    "nickname": nickname  # nickname을 사용하여 전송
                }
            )
            #print(f"[DEBUG] Successfully broadcasted message to group {self.room_group_name}")

            
        elif action == "vote":
            try:
                participant = data.get("participant")
                if not participant:
                    raise ValueError("Participant is missing in vote action")

                #print(f"[DEBUG] Received vote for participant: {participant}")

                # 투표 수 갱신
                votes = cache.get(f"room_{self.room_id}_votes", {})
                if votes is None:
                    votes = {}  # 캐시 초기화

                votes[participant] = votes.get(participant, 0) + 1
                cache.set(f"room_{self.room_id}_votes", votes)

                #print(f"[DEBUG] Updated votes: {votes}")

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
            #print(f"[DEBUG] Received log update from {participant}: {log_message}")

            # WebSocket 그룹에 참가자 글 업데이트 브로드캐스트
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "log_update",
                    "participant": participant,
                    "log": log_message,
                }
            )
            #print(f"[DEBUG] Successfully broadcasted log update to group {self.room_group_name}")
            
        elif action == "distribute_topic":
            subtopic_liar = data.get("subtopic_liar", "").strip()
            subtopic_others = data.get("subtopic_others", "").strip()
            liar = data.get("liar", "").strip()

            # 방장 여부 확인
            room = await sync_to_async(Room.objects.get)(room_number=self.room_id)
            owner_nickname = await sync_to_async(lambda: room.owner.nickname)()

            if owner_nickname != nickname:
                #print(f"[ERROR] {nickname} is not the owner and cannot distribute topics.")
                await self.send(text_data=json.dumps({
                    "type": "error",
                    "message": "제시어 배포는 방장만 가능합니다."
                }))
                return

            # 필수 데이터가 제대로 전달되지 않은 경우
            if not subtopic_liar or not subtopic_others or not liar:
                print(f"[ERROR] Missing subtopics or liar in distribute_topic action: {data}")
                await self.send(text_data=json.dumps({
                    "type": "error",
                    "message": "제시어 또는 Liar가 올바르지 않습니다."
                }))
                return

            # 참가자 목록 가져오기 (캐시에서 None이 반환될 경우 빈 리스트로 초기화)
            participants = await sync_to_async(cache.get)(f"room_{self.room_id}_participants") or []
            #print(f"[DEBUG] Participants in room {self.room_id}: {participants}")

            if not participants:
                print("[ERROR] No participants found.")
                await self.send(text_data=json.dumps({
                    "type": "error",
                    "message": "참가자가 없습니다."
                }))
                return

            # Liar가 참가자 목록에 포함되어 있는지 확인
            if liar not in participants:
                print(f"[ERROR] Liar {liar} is not in participants: {participants}")
                await self.send(text_data=json.dumps({
                    "type": "error",
                    "message": "선택된 Liar가 참가자 목록에 없습니다."
                }))
                return

            print(f"[DEBUG] Distributing topics: Liar - {liar}, Subtopic for Liar - {subtopic_liar}, Subtopic for Others - {subtopic_others}")

            # 참가자들에게 제시어 전달
            for participant in participants:
                subtopic = subtopic_liar if participant == liar else subtopic_others
                is_liar = (participant == liar)

                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "send_subtopic",
                        "participant": participant,
                        "subtopic": subtopic,
                        "is_liar": is_liar
                    }
                )


    async def distribute_topic(self, event):
        liar = event["liar"]
        subtopic_liar = event["subtopic_liar"]
        subtopic_others = event["subtopic_others"]
        participants = event["participants"]

        # 참가자별로 적절한 제시어와 역할을 설정
        subtopic = subtopic_liar if self.nickname == liar else subtopic_others
        is_liar = (self.nickname == liar)

        print(f"[DEBUG] Sending topic to {self.nickname}: Subtopic - {subtopic}, Is Liar - {is_liar}")

        # 참가자에게 제시어와 LIAR 여부 전송
        await self.send(text_data=json.dumps({
            "type": "send_subtopic",
            "subtopic": subtopic,
            "is_liar": is_liar
        }))

    async def send_subtopic(self, event):
        subtopic = event["subtopic"]
        is_liar = event["is_liar"]
        participant = event["participant"]

        # 본인이 수신 대상인 경우에만 메시지 전송
        if participant == self.nickname:
            await self.send(text_data=json.dumps({
                "type": "send_subtopic",
                "subtopic": subtopic,
                "is_liar": is_liar
            }))
            print(f"[DEBUG] Sent subtopic to {self.nickname}: {subtopic}, Is Liar: {is_liar}")

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

    async def add_to_room(self, room_id, nickname):
        participants = await self.get_participants()
        if nickname not in participants:
            participants.append(nickname)
            await self.save_participants(participants)
        return participants

    async def remove_from_room(self, room_id, nickname):
        participants = await self.get_participants()
        if nickname in participants:
            participants.remove(nickname)
            await self.save_participants(participants)
        return participants

    async def get_participants(self):
        try:
            participants = cache.get(f"room_{self.room_id}_participants", [])
            return participants
        except Exception as e:
            print(f"[ERROR] Failed to get participants from cache: {e}")
            return []

    async def save_participants(self, participants):
        try:
            cache.set(f"room_{self.room_id}_participants", participants, timeout=3600)
        except Exception as e:
            print(f"[ERROR] Failed to save participants to cache: {e}")
