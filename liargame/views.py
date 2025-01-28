import random
from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse, JsonResponse
from .models import Topic, SubTopic
from django.shortcuts import render, redirect 
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib import messages
from .forms import SignUpForm
from django.contrib.auth.decorators import login_required
from .models import Room, CustomUser
from django.apps import apps
from django.http import JsonResponse
from django.contrib import messages
from .forms import CustomPasswordChangeForm


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
            # 로그인 실패 시 컨텍스트에 실패 메시지 추가
            return render(request, 'liargame/signin.html', {'error_message': '아이디나 비밀번호가 일치하지 않습니다.'})
    
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
    # 데이터베이스에서 모든 방 가져오기
    rooms = Room.objects.all()

    # 로그인한 사용자의 username 가져오기
    username = request.user.nickname if request.user.is_authenticated else "익명"

    # 새로운 사용자라면 세션에 추가 (선택적 로직)
    all_users = list(CustomUser.objects.values_list('nickname', flat=True).distinct())

    # 게임 페이지 렌더링
    return render(request, 'liargame/game.html', {
        'username': username,
        'rooms': rooms,  # 방 정보 전달
        'all_users': all_users,
    })

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .models import Room

@login_required
def create_room(request):
    """
    다양한 게임 방을 생성하는 함수
    """
    if request.method == 'POST':
        user = request.user
        game_type = request.POST.get('game_type', '').lower()  # 🔥 game_type을 소문자로 변환

        # ✅ 게임별 URL 매핑
        valid_games = {
            "liargame": "/liargame/liargame/",  # ✅ 변경된 Liar Game URL
            "just_chat": "/liargame/just_chat/room/",
            "stockgame": "/liargame/stockgame/room/"
        }
        # ✅ 올바른 게임 타입인지 확인
        if game_type not in valid_games:
            return JsonResponse({
                'success': False,
                'message': "올바른 게임 타입을 선택하세요."
            }, status=400)

        # ✅ 사용자가 이미 같은 게임의 방을 소유하고 있는지 확인
        existing_room = Room.objects.filter(owner=user, game_type=game_type).first()
        if existing_room:
            return JsonResponse({
                'success': False,
                'message': f'이미 {game_type} 방을 소유하고 있습니다: (ID: {existing_room.room_number})'
            }, status=400)

        # ✅ 새로운 방 생성
        room_name = request.POST.get('room_name', f'{user.nickname}의 방')
        room = Room.objects.create(owner=user, game_type=game_type)
        room.players.add(user)  # 방장 추가

        # ✅ 방 URL 반환
        return JsonResponse({
            'success': True,
            'room_id': room.room_number,
            'room_name': room_name,
            'game_type': game_type,
            'redirect_url': f"{valid_games[game_type]}{room.room_number}/"  # 🔥 URL 조합 개선
        })

    return render(request, 'liargame/create_room.html')



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
    
def get_topics(request):
    topics = Topic.objects.all()
    data = [{"id": topic.id, "name": topic.name} for topic in topics]
    return JsonResponse(data, safe=False, json_dumps_params={'ensure_ascii': False})

def get_random_subtopics(request):
    # topic_id 또는 topic 이름 중 하나를 받아 처리
    topic_id = request.GET.get('topic_id')
    topic_name = request.GET.get('topic')

    try:
        if topic_id:  # topic_id로 처리
            topic = Topic.objects.get(id=topic_id)
        elif topic_name:  # topic 이름으로 처리
            topic = Topic.objects.get(name=topic_name)
        else:
            return JsonResponse({"error": "topic_id 또는 topic을 제공해주세요."}, status=400)

        # 해당 주제의 소주제를 랜덤으로 가져오기
        subtopics = list(SubTopic.objects.filter(topic=topic))
        if len(subtopics) < 2:
            return JsonResponse({"error": "소주제가 충분하지 않습니다."}, status=400)

        selected_subtopics = random.sample(subtopics, 2)
        return JsonResponse({
            "subtopics": [subtopic.name for subtopic in selected_subtopics]
        })
    except Topic.DoesNotExist:
        return JsonResponse({"error": "해당 주제를 찾을 수 없습니다."}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

def debug_host(request):
    return JsonResponse({'HTTP_HOST': request.META.get('HTTP_HOST')})

@login_required
def change_password(request):
    if request.method == "POST":
        form = CustomPasswordChangeForm(user=request.user, data=request.POST)
        if form.is_valid():
            user = form.save()
            update_session_auth_hash(request, user)  # 비밀번호 변경 후 세션 유지
            messages.success(request, "비밀번호가 성공적으로 변경되었습니다!")
            return redirect("lobby")  # 비밀번호 변경 후 로비로 이동
        else:
            messages.error(request, "비밀번호 변경에 실패했습니다. 입력한 정보를 확인해주세요.")
    else:
        form = CustomPasswordChangeForm(user=request.user)

    return render(request, "liargame/change_password.html", {"form": form})