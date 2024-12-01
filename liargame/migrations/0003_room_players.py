# Generated by Django 5.1.3 on 2024-12-01 17:40

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('liargame', '0002_remove_customuser_makeroom_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='room',
            name='players',
            field=models.ManyToManyField(blank=True, related_name='rooms', to=settings.AUTH_USER_MODEL),
        ),
    ]
