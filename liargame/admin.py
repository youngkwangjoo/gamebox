from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

# CustomUser 모델을 관리할 수 있도록 관리자 클래스를 정의합니다.
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    # 사용자 모델에 표시할 필드를 설정합니다. 기본 필드에 추가로 'nickname'도 추가합니다.
    list_display = ['nickname']
    search_fields = ['nickname']
    ordering = ['nickname']

# CustomUser 모델을 등록합니다.
admin.site.register(CustomUser, CustomUserAdmin)
