from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse, JsonResponse
import uuid
from django.shortcuts import render, redirect 
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from .forms import SignUpForm
from django.contrib.auth.decorators import login_required
from .models import Room, CustomUser
from django.apps import apps

def home(request):
    # 홈 페이지
    return render(request, 'liargame/home.html')

def signin(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        
        # 인증 시도
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            # 로그인 성공
            login(request, user)
            
            # 로그인 후 홈으로 리디렉션
            return redirect('game')  # 로그인 후 게임 대기방 페이지로 리디렉션
        else:
            # 로그인 실패
            messages.error(request, '아이디나 비밀번호가 일치하지 않습니다.')
            return redirect('signin')  # 다시 로그인 페이지로 돌아감
    
    return render(request, 'liargame/signin.html')

def logout_view(request):
    logout(request)  # Django의 로그아웃 처리
    return redirect('signin')  # 로그아웃 후 signin 페이지로 리디렉션

# 회원가입 뷰
def signup(request):
    if request.method == 'POST':
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.set_password(form.cleaned_data['password1'])

            # username 값을 nickname에 복사
            user.nickname = form.cleaned_data['username']
            user.save()

            messages.success(request, "회원가입이 완료되었습니다!")
            return redirect('signin')
    else:
        form = SignUpForm()
    return render(request, 'liargame/signup.html', {'form': form})

@login_required
def game(request):
    # 세션에서 방 목록과 전체 사용자 목록 가져오기
    rooms = request.session.get('rooms', [])
    all_users = request.session.get('all_users', [])

    # 로그인한 사용자의 username을 가져옵니다.
    username = request.user.username  # CustomUser 모델에서 기본적으로 제공하는 username

    # POST 요청일 경우 (방 만들기 버튼 클릭)
    if request.method == 'POST':
        room_name = f"개설자 {username}의 room"  # 방 이름 생성

        # 방에 새 참가자 추가
        new_room = {
            'name': room_name,
            'players': 1,
            'players_list': [username]  # 초기 방 참가자 리스트 추가
        }
        rooms.append(new_room)  # 방 목록에 추가
        request.session['rooms'] = rooms  # 세션에 저장

        # 방 생성 직후 해당 방에 입장
        return redirect('room_detail', room_id=len(rooms) - 1)  # 방 상세 페이지로 리다이렉트

    # 새로운 사용자가 접속했으면 전체 사용자 목록에 추가
    if username not in all_users:
        all_users.append(username)
        request.session['all_users'] = all_users  # 전체 사용자 목록 세션에 저장

    # 게임 페이지 렌더링
    return render(request, 'liargame/game.html', {
        'username': username,  # 로그인한 유저의 username을 전달
        'rooms': rooms,  # 방 목록 전달
        'all_users': all_users,  # 전체 사용자 목록 전달
    })

@login_required
def create_room(request):
    if request.method == 'POST':
        nickname = request.session.get('nickname', 'Guest')  # 방을 생성하는 사람
        user = request.user  # 로그인된 사용자의 정보
        room_name = request.POST.get('room_name')  # 방 이름
        game_type = request.POST.get('game_type')  # 게임 타입

        # 고유한 방 ID 생성
        room_id = str(uuid.uuid4())

        # 방 생성
        room = Room.objects.create(
            game_type=game_type,
            owner=user,  # 방을 만든 사람 (방장이 되며 자동으로 방에 참여)
        )

        # 방에 첫 번째 플레이어(방장) 추가
        room.players.add(user)

        # 방 생성 후 JSON 응답을 반환하여 클라이언트가 새로고침하거나 리다이렉트할 수 있도록 처리
        return JsonResponse({'success': True, 'room_id': room.room_number, 'room_name': room_name})

    # GET 요청 처리: 방 생성 페이지 렌더링
    return render(request, 'liargame/create_room.html')  # 방 생성 폼을 포함한 템플릿을 렌더링

@login_required
def room_detail(request, room_id):
    # 방 정보 가져오기
    room = get_object_or_404(Room, room_number=room_id)
    
    # 참가자 목록
    participants = room.players.all()

    # POST 요청: 방에 참여
    if request.method == 'POST' and 'join_room' in request.POST:
        if request.user not in participants:
            room.players.add(request.user)  # 참가자로 추가
        return JsonResponse({'success': True, 'message': '방에 참여했습니다.'})

    # DELETE 요청: 방 삭제
    if request.method == 'DELETE':
        if request.user == room.owner:
            room.delete()
            return JsonResponse({'success': True, 'message': '방이 삭제되었습니다.'})
        else:
            return JsonResponse({'success': False, 'message': '방을 삭제할 권한이 없습니다.'})

    # GET 요청: 방 상세 페이지 렌더링
    return render(request, 'liargame/room_detail.html', {
        'room': room,  # 방 정보
        'participants': participants,  # 참가자 목록
    })

# 방 삭제 (방장이 나가면 방 삭제)
def delete_room(self, room_id, nickname):
    Room = apps.get_model('liargame', 'Room')

    try:
        room = Room.objects.get(room_number=room_id)
    except Room.DoesNotExist:
        print(f"[DEBUG] Room {room_id} does not exist.")
        return False, "방을 찾을 수 없습니다."

    # 방장이 맞는지 확인
    if room.owner and room.owner.nickname == nickname:
        room.delete()
        print(f"[DEBUG] Room {room_id} has been deleted.")
        return True, "방이 성공적으로 삭제되었습니다."
    else:
        print(f"[DEBUG] User {nickname} is not authorized to delete room {room_id}.")
        return False, "방을 삭제할 권한이 없습니다."
    

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

@login_required
def game_room(request, room_id):
    # 방을 가져옵니다.
    try:
        room = Room.objects.get(room_number=room_id)
    except Room.DoesNotExist:
        messages.error(request, '방을 찾을 수 없습니다.')
        return redirect('game')  # 방이 없으면 대기실로 이동

    # 참가자 목록
    participants = room.players.all()

    return render(request, 'liargame/game_room.html', {
        'room': room,  # 방 정보
        'participants': participants,  # 참가자 목록
    })
