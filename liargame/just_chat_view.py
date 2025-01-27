from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from .models import Room  # ✅ Room 모델 가져오기

@login_required
def just_chat(request):
    """
    Just Chat 로비 페이지 (전체 Just Chat 방 목록을 표시)
    """
    rooms = Room.objects.filter(game_type="just_chat")  # 🔥 Just Chat 방만 가져오기
    return render(request, 'just_chat/just_chat_lobby.html', {'rooms': rooms})

@login_required
def just_chat_room(request, room_id):
    """
    Just Chat 개별 방 페이지 렌더링
    """
    room = get_object_or_404(Room, room_number=room_id)

    return render(request, 'liargame/just_chat.html', {
        'room': room
    })
