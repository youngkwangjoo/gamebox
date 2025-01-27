from django.urls import path
from . import views
from .just_chat_view import just_chat_room  # Just Chat 뷰 추가
#from .stockgame_view import stockgame_room  # Stock Game 뷰 추가 (추후 추가)

urlpatterns = [
    # 🔥 공통 페이지
    path('', views.home, name='home'),  
    path('signin/', views.signin, name='signin'),  
    path('signup/', views.signup, name='signup'),  
    path('logout/', views.logout_view, name='logout'),  
    path('game/', views.game, name='game'),  

    # 🔥 Liar Game 관련 URL
    path('create/', views.create_room, name='create_room'),  
    path('liargame/<int:room_id>/', views.room_detail, name='room_detail'),
    path('topics/', views.get_topics, name='get_topics'),    
    path('random-subtopics/', views.get_random_subtopics, name='get_random_subtopics'),    

    # 🔥 Just Chat 관련 URL
    path('just_chat/room/<int:room_id>/', just_chat_room, name='just_chat_room'),

    # 🔥 Stock Game 관련 URL (추후 추가)
    #path('stockgame/room/<int:room_id>/', stockgame_room, name='stockgame_room'),
]
