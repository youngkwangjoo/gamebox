from django.http import HttpResponse
from django.shortcuts import render


def index(request):
    return HttpResponse("Welcome to the Liar Game!")

def chat(request):
    return render(request, 'chat.html')