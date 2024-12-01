from django.shortcuts import render, redirect, get_object_or_404
from .models import Room, Participant
from django.http import HttpResponse

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

    # 전체 사용자 목록 가져오기 (없으면 빈 리스트)
    all_users = request.session.get('all_users', [])

    # POST 요청일 경우 (방 만들기 버튼 클릭)
    if request.method == 'POST':
        nickname = request.session.get('nickname', 'Guest')  # 세션에서 닉네임 가져오기
        room_name = f"개설자 {nickname}의 room"  # 방 이름 생성
        
        # 방에 새 참가자 추가
        new_room = {'name': room_name, 'players': 1, 'players_list': [nickname]}
        rooms.append(new_room)  # 방 추가
        request.session['rooms'] = rooms  # 세션에 방 목록 저장

        # 방에 참여 중인 사람 추가
        current_players = request.session.get('current_players', [])
        current_players.append(nickname)
        request.session['current_players'] = current_players  # 참여자 목록 저장

        return redirect('game')  # 새로고침 효과를 위해 리다이렉트

    # 닉네임 가져오기
    nickname = request.session.get('nickname', 'Guest')

    # 만약 새로운 사용자가 접속했으면 전체 사용자 목록에 추가
    if nickname not in all_users:
        all_users.append(nickname)
        request.session['all_users'] = all_users  # 전체 사용자 목록 세션에 저장

    return render(request, 'liargame/game.html', {
        'nickname': nickname, 
        'rooms': rooms,
        'all_users': all_users,  # 전체 사용자 목록 전달
    })


def create_room(request):
    # POST 요청일 경우 (방 만들기)
    if request.method == 'POST':
        nickname = request.session.get('nickname', 'Guest')
        room_name = request.POST.get('room_name')  # 방 이름

        # 방 정보 생성
        new_room = {
            'name': room_name,
            'players': 1,
            'players_list': [nickname],
        }

        rooms = request.session.get('rooms', [])
        rooms.append(new_room)  # 방 목록에 추가
        request.session['rooms'] = rooms  # 세션에 저장

        return redirect('game')  # 게임 페이지로 리다이렉트

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
    
def enter_room(request, room_id):
    # 방 목록 불러오기
    rooms = request.session.get('rooms', [])
    
    # 해당 room 찾기
    room = next((room for room in rooms if room['id'] == room_id), None)
    
    if room:
        # 방에 입장
        return render(request, 'room_detail.html', {'room': room})
    else:
        return HttpResponse("방을 찾을 수 없습니다.")


def chat(request):
    return render(request, 'liargame/chat.html')  # 수정된 경로
