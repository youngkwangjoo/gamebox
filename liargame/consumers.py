import json
from channels.generic.websocket import WebsocketConsumer

class ChatConsumer(WebsocketConsumer):
    def connect(self):
        self.accept()  # 연결 허용

    def disconnect(self, close_code):
        pass  # 연결 해제 시 로직 (필요 시 추가)

    def receive(self, text_data):
        data = json.loads(text_data)  # 클라이언트에서 받은 메시지
        message = data['message']

        # 클라이언트로 메시지 전송
        self.send(text_data=json.dumps({
            'message': message
        }))
