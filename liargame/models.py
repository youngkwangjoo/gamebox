from django.db import models
from django.contrib.auth.models import AbstractUser

# 방 모델
class Room(models.Model):
    room_number = models.AutoField(primary_key=True)
    game_type = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    owner = models.ForeignKey('CustomUser', on_delete=models.CASCADE, null=True, blank=True, related_name='owned_rooms')
    players = models.ManyToManyField('CustomUser', related_name='rooms', blank=True)  # 플레이어들

    def __str__(self):
        return f"Room {self.room_number} - {self.game_type}"

# 사용자 모델
class CustomUser(AbstractUser):
    # 기본 AbstractUser 모델을 확장하여 필요시 추가 필드를 넣을 수 있습니다.
    nickname = models.CharField(max_length=50, unique=True)  # 사용자 닉네임
    room = models.OneToOneField(Room, null=True, blank=True, on_delete=models.SET_NULL, related_name='user')  # 'user' 그대로 사용

    def __str__(self):
        return self.nickname


# 주제 모델
class Topic(models.Model):
    name = models.CharField(max_length=100, unique=True)  # 큰 주제 이름

    def __str__(self):
        return self.name

# 소주제 모델
class SubTopic(models.Model):
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='subtopics')  # 주제와 연결
    name = models.CharField(max_length=100)  # 소주제 이름

    def __str__(self):
        return f"{self.topic.name} - {self.name}"
