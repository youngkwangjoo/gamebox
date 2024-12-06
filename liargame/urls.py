from django.urls import path
from . import views
from .views import get_topics
from .views import get_random_subtopics

urlpatterns = [
    path('', views.home, name='home'),  # 게임 선택 페이지
    path('signin/', views.signin, name='signin'),  # 닉네임 입력 페이지
    path('signup/', views.signup, name='signup'),  # 회원가입 페이지
    path('logout/', views.logout_view, name='logout'),    
    path('game/', views.game, name='game'),  # 방 목록 페이지
    path('game/create/', views.create_room, name='create_room'),  # 방 생성 페이지
    path('game/<int:room_id>/', views.room_detail, name='room_detail'),  # 방 상세 페이지
    path('enter_room/<int:room_id>/', views.enter_room, name='enter_room'),
    path('delete_room/<str:room_id>/', views.delete_room, name='delete_room'),
    path('create/', views.create_room, name='create_room'),  # 방 생성
    path('<int:room_id>/', views.room_detail, name='room_detail'),  # 방 상세보기
    path('game/<int:room_id>/', views.game_room, name='game_room'),    
    path('topics/', get_topics, name='get_topics'),    
    path('random-subtopics/', get_random_subtopics, name='get_random_subtopics'),    
]
    
