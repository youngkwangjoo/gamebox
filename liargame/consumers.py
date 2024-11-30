from channels.generic.websocket import AsyncWebsocketConsumer
import json
from asgiref.sync import sync_to_async
from .models import Room, Participant

class GameRoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'room_{self.room_id}'
        
        # 방 그룹에 참가
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()

        # 연결된 클라이언트에 현재 참가자 목록 전송
        participants = await sync_to_async(self.get_participants)()
        await self.send(text_data=json.dumps({
            'participants': participants
        }))

    async def disconnect(self, close_code):
        # 방 그룹에서 제거
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        nickname = data.get('nickname')

        # 닉네임 추가
        if nickname:
            await sync_to_async(self.add_participant)(nickname)
            
            # 참가자 목록 갱신 및 전송
            participants = await sync_to_async(self.get_participants)()
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'send_participants',
                    'participants': participants
                }
            )

    def get_participants(self):
        room = Room.objects.get(id=self.room_id)
        return [p.nickname for p in room.participants.all()]

    def add_participant(self, nickname):
        room = Room.objects.get(id=self.room_id)
        Participant.objects.create(room=room, nickname=nickname)

    async def send_participants(self, event):
        participants = event['participants']
        await self.send(text_data=json.dumps({
            'participants': participants
        }))
