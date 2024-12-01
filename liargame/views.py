from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse, JsonResponse
import uuid
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.contrib.auth.models import User 
from django.contrib.auth import authenticate, login
from django.contrib.auth.hashers import make_password
from django.contrib import messages
from .forms import SignUpForm
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout


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
            # 유효한 폼이면 회원가입 처리
            user = form.save(commit=False)
            user.set_password(form.cleaned_data['password1'])  # 비밀번호를 해시화해서 저장
            user.save()
            
            # 회원가입 성공 후 로그인
            login(request, user)
            messages.success(request, "회원가입이 완료되었습니다!")
            return redirect('signin')  # 성공 후 홈으로 리디렉션
            
        else:
            messages.error(request, "입력한 정보를 확인해 주세요.")
    
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





# create_room 뷰 수정
def create_room(request):
    if request.method == 'POST':
        nickname = request.session.get('nickname', 'Guest')  # 방을 생성하는 사람
        user = request.user  # 로그인된 사용자의 정보를 가져옴
        room_name = request.POST.get('room_name')  # 방 이름
        game_type = request.POST.get('game_type')  # 게임 타입

        # 고유한 room_id 생성
        room_id = str(uuid.uuid4())

        # 방 생성 정보
        new_room = {
            'id': room_id,  # 고유 ID
            'name': room_name,
            'players': 1,
            'players_list': [nickname],
            'game_type': game_type,
            'created_by': user.id  # 방을 만든 사람의 ID를 저장
        }

        rooms = request.session.get('rooms', [])
        rooms.append(new_room)
        request.session['rooms'] = rooms
        
        return JsonResponse({'success': True, 'room_id': room_id})



def room_detail(request, room_id):
    rooms = request.session.get('rooms', [])
    nickname = request.session.get('nickname', 'Guest')

    # rooms가 비어있으면 대기실로 리다이렉트
    if not rooms:
        return redirect('game')  # 대기실로 리다이렉트

    # room_id가 유효한 인덱스인지 확인
    if not (0 <= room_id < len(rooms)):
        return redirect('game')  # 유효하지 않은 room_id인 경우 대기실로 리다이렉트
    
    room = rooms[room_id]

    # 방장이 나갔을 때 방을 삭제하고 대기실로 리다이렉트
    if request.method == 'POST' and nickname == room['players_list'][0]:  # 방장이 나갈 때
        # 방에 있는 모든 사람을 대기실로 리다이렉트
        rooms.pop(room_id)  # 방 삭제
        request.session['rooms'] = rooms  # 세션에 업데이트
        
        # 방장 퇴장 후 대기실로 리다이렉트
        return redirect('game')  # 대기실 페이지로 리다이렉트

    # 방장이 나가면 다른 참가자들에게 메시지 표시
    if nickname != room['players_list'][0]:
        message = "방장이 나갔습니다."
    else:
        message = ""

    return render(request, 'liargame/room_detail.html', {
        'room': room,
        'message': message,
    })
    
def delete_room(request, room_id):
    if request.method == 'DELETE':
        user = request.user  # 현재 로그인된 사용자

        # 세션에서 방 목록 가져오기
        rooms = request.session.get('rooms', [])
        
        # 삭제할 방 찾기
        room_to_delete = next((room for room in rooms if room.get('id') == room_id), None)
        
        if room_to_delete:
            # 방을 만든 사람과 현재 로그인된 사용자가 일치하는지 확인
            if room_to_delete['created_by'] == user.id:
                rooms.remove(room_to_delete)  # 방 삭제
                request.session['rooms'] = rooms  # 세션 갱신
                return JsonResponse({'success': True})
            else:
                return JsonResponse({'success': False, 'message': '방을 삭제할 권한이 없습니다.'})
        else:
            return JsonResponse({'success': False, 'message': '방을 찾을 수 없습니다.'})

    return JsonResponse({'success': False, 'message': '잘못된 요청입니다.'})    
    

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

