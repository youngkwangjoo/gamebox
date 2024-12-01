from django.db import models
from django.contrib.auth.models import AbstractUser
# 방 모델
class Room(models.Model):
    room_number = models.AutoField(primary_key=True)  # 방 번호 (자동 증가)
    game_type = models.CharField(max_length=100)  # 게임 종류 (예: "리얼 게임", "보드 게임" 등)
    created_at = models.DateTimeField(auto_now_add=True)  # 방 생성 일시

    def __str__(self):
        return f"Room {self.room_number} - {self.game_type}"

class CustomUser(AbstractUser):
    # 기본 AbstractUser 모델을 확장하여 필요시 추가 필드를 넣을 수 있습니다.
    nickname = models.CharField(max_length=50, unique=True)  # 사용자 닉네임
    makeroom = models.IntegerField(default=0)  # 사용자가 만든 방의 횟수
    room_numbers = models.IntegerField(default=0)  # 사용자가 참여한 방의 횟수

    def __str__(self):
        return self.nickname
