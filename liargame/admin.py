from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser
from .models import Room 

# CustomUser 모델을 관리할 수 있도록 관리자 클래스를 정의합니다.
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    # 사용자 모델에 표시할 필드를 설정합니다. 기본 필드에 추가로 'nickname'도 추가합니다.
    list_display = ['nickname']
    search_fields = ['nickname']
    ordering = ['nickname']

# CustomUser 모델을 등록합니다.
admin.site.register(CustomUser, CustomUserAdmin)


# Room 모델을 Django Admin에 등록
@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("room_number", "game_type", "owner", "created_at")  # 리스트에 표시할 필드
    search_fields = ("room_number", "owner__nickname", "game_type")  # 검색 기능 추가
    list_filter = ("game_type", "created_at")  # 필터 추가
    ordering = ("-created_at",)  # 최신순 정렬