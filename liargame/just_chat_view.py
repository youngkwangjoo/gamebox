from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse

@login_required
def just_chat(request):
    """
    Just Chat 페이지를 렌더링하는 Django View.
    로그인한 사용자만 접근할 수 있도록 @login_required 적용.
    """
    return render(request, 'just_chat/just_chat.html')

@login_required
def get_chat_history(request):
    """
    채팅 내역을 불러오는 API View.
    """
    chat_history = request.session.get('chat_history', [])
    return JsonResponse({'chat_history': chat_history})

@login_required
def save_chat_message(request):
    """
    채팅 메시지를 세션에 저장하는 API View.
    """
    if request.method == 'POST':
        message = request.POST.get('message')
        nickname = request.user.nickname if request.user.is_authenticated else "익명"

        if message:
            chat_history = request.session.get('chat_history', [])
            chat_history.append({'nickname': nickname, 'message': message})
            request.session['chat_history'] = chat_history

            return JsonResponse({'success': True, 'nickname': nickname, 'message': message})

    return JsonResponse({'success': False, 'error': 'Invalid request'})

@login_required
def clear_chat_history(request):
    """
    채팅 내역을 초기화하는 API View.
    """
    request.session['chat_history'] = []
    return JsonResponse({'success': True, 'message': '채팅 기록이 초기화되었습니다.'})
