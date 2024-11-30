# models.py
from django.db import models

class Room(models.Model):
    name = models.CharField(max_length=100)

class Participant(models.Model):
    room = models.ForeignKey(Room, related_name='participants', on_delete=models.CASCADE)
    nickname = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.nickname
