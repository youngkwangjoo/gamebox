from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import get_user_model

class SignUpForm(UserCreationForm):
    username = forms.CharField(max_length=150, required=True, widget=forms.TextInput(attrs={'placeholder': '아이디'}))
    password1 = forms.CharField(widget=forms.PasswordInput(attrs={'placeholder': '비밀번호'}))
    password2 = forms.CharField(widget=forms.PasswordInput(attrs={'placeholder': '비밀번호 확인'}))

    class Meta:
        model = get_user_model()  # 커스텀 User 모델을 가져옵니다.
        fields = ['username', 'password1', 'password2']


    def clean_username(self):
        username = self.cleaned_data.get('username')
        if get_user_model().objects.filter(username=username).exists():
            raise forms.ValidationError("이미 존재하는 아이디입니다. 다른 아이디를 사용해주세요.")
        return username