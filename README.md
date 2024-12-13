# gamebox
여러가지 작은 게임을 웹페이지에서 즐길 수 있는 프로젝트

stack
python, django. poetry, websocket, html, javascript, css, dbsqlite3, home NAS

게임방은 12.02 기준 미완성 상태


특징 
1. 실시간 채팅
2. 간단한 로그인 기능
3. 방장의 개념을 적용해 퇴장시 방 삭제 기능
4. 대기실에 실시간 로그인참여자 확인가능
5. 게임 개설시 참여인원 실시간 파악가능
6. html, css, javascript를 적용해서 장고템플릿을 사용한 백엔드 배포 웹페이지
7. nginx 와 colletstatic을 사용한 정적배포

페이지 사진
![스크린샷 2024-12-02 오전 2 59 51](https://github.com/user-attachments/assets/52bbfe58-ed1d-44a7-98e0-ed76d4d705a5)
![스크린샷 2024-12-02 오전 2 59 59](https://github.com/user-attachments/assets/b9e9bb3e-b0bc-452e-b5aa-2d314adffa68)
![스크린샷 2024-12-02 오전 3 00 05](https://github.com/user-attachments/assets/fefe7269-f162-4b56-b0d0-1698f06afe73)
![스크린샷 2024-12-02 오전 3 00 14](https://github.com/user-attachments/assets/ec5c4fe2-ef10-4cff-8537-c6c3abb81cde)
![스크린샷 2024-12-02 오전 3 00 25](https://github.com/user-attachments/assets/f133c901-97a0-4f98-bba6-f8f5db0d9372)
![스크린샷 2024-12-02 오전 3 00 37](https://github.com/user-attachments/assets/59ddcf05-8cc2-490d-8a1d-e5695467cc9d)

daphne -b 127.0.0.1 -p 8001 gamebox.asgi:application
/etc/nginx/sites-available/schedule
sudo ln -s /etc/nginx/sites-available/schedule /etc/nginx/sites-enabled/
