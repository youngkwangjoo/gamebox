from django.shortcuts import render, redirect, get_object_or_404
from .models import Room, Participant

def home(request):
    # 홈 페이지
    return render(request, 'liargame/home.html')

def join(request):
    # 닉네임 입력 페이지
    if request.method == 'POST':
        nickname = request.POST.get('nickname')
        request.session['nickname'] = nickname  # 닉네임을 세션에 저장
        return redirect('game')  # 방 목록 페이지로 이동
    return render(request, 'liargame/join.html')  # 닉네임 입력 템플릿




def game(request):
    # 세션에서 방 목록 가져오기 (없으면 빈 리스트)
    rooms = request.session.get('rooms', [])

    # POST 요청일 경우 (방 만들기 버튼 클릭)
    if request.method == 'POST':
        nickname = request.session.get('nickname', 'Guest')  # 세션에서 닉네임 가져오기
        room_name = f"개설자 {nickname}의 room"  # 방 이름 생성
        rooms.append({'name': room_name, 'players': 1})  # 방 추가
        request.session['rooms'] = rooms  # 세션에 방 목록 저장
        return redirect('game')  # 새로고침 효과를 위해 리다이렉트

    nickname = request.session.get('nickname', 'Guest')  # 닉네임 가져오기
    return render(request, 'liargame/game.html', {'nickname': nickname, 'rooms': rooms})

def create_room(request):
    if request.method == 'POST':
        room_name = request.POST.get('room_name')
        nickname = request.session.get('nickname', 'Guest')  # 닉네임 가져오기

        # 세션에서 방 목록 가져오기
        rooms = request.session.get('rooms', [])
        
        # 새로운 방 추가
        new_room = {'name': f"개설자 {nickname}의 {room_name}", 'players': 1}
        rooms.append(new_room)
        
        # 세션에 방 목록 저장
        request.session['rooms'] = rooms
        
        return redirect('game')  # 방 목록 페이지로 이동

    return render(request, 'liargame/create_room.html')

def room_detail(request, room_id):
    rooms = request.session.get('rooms', [])

    if not (0 <= room_id < len(rooms)):
        return redirect('game')  # 유효하지 않은 room_id인 경우 게임 화면으로 리다이렉트
    
    room = rooms[room_id]
    return render(request, 'liargame/room_detail.html', {
        'room': room,
        'room_id': room_id
    })




def chat(request):
    return render(request, 'liargame/chat.html')  # 수정된 경로


