# gamebox
여러가지 작은 게임을 웹페이지에서 즐길 수 있는 프로젝트

version 1.0 완성 2025.01.18

# stack
python, django, poetry, websocket, html, javascript, css, dbsqlite3, home NAS

특징 
1. WebSocket을 활용한 실시간 채팅 기능 구현
2. BroadCasting을 이용해 lobby와 각 game room에 실시간 참여자 목록 제공
3. WebSocket과 BroadCasting을 활용하여 Liar Game 제시어 배포 및 참가자 설명 실시간 공유
4. 간단한 Session 기반 로그인 기능과 CSRF 토큰을 활용한 보안 강화
5. 방장 권한 개념 도입: 방 생성 시 제시어 배포 및 방 삭제 기능 부여
6. 별도의 프론트엔드 없이 Django 템플릿으로 JS, CSS, HTML 통합 배포
7. Nginx와 collectstatic을 활용한 정적 파일 배포 최적화
8. Redis를 활용한 캐시 기반 데이터 저장으로 실시간 게임 성능 향상
9. Docker 미사용: 직접 배포 방식으로 서버 관리
10. 무중단 배포를 위한 배포 서버와 개발 서버 분리로 99.9% 가동률 유지 (서버 PC가 꺼지지 않는 한)


# 사이트 주소
https://schdule.site:1443/liargame/
- Ip주소에 기존 443, 80포트를 사용 중이라 1443포트를 사용, ddns를 사용할 수 있으나 매달 관리해줘야하는 불편함이 있어 포트주소를 그냥 사용

# 실사용 녹화
![사이트 녹화 1](https://github.com/user-attachments/assets/8d98a36d-8b0e-4003-bec0-ca9010b53743)
![사이트 녹화2](https://github.com/user-attachments/assets/91cb6e12-54b9-45aa-a928-68a66531926b)
![실시간 채팅](https://github.com/user-attachments/assets/045a139c-d8ca-42de-8bb2-e7f6cc988109)


# 페이지 사진 및 설명
![스크린샷 2024-12-02 오전 2 59 51](https://github.com/user-attachments/assets/52bbfe58-ed1d-44a7-98e0-ed76d4d705a5)
![스크린샷 2024-12-02 오전 2 59 59](https://github.com/user-attachments/assets/b9e9bb3e-b0bc-452e-b5aa-2d314adffa68)
![스크린샷 2024-12-02 오전 3 00 05](https://github.com/user-attachments/assets/fefe7269-f162-4b56-b0d0-1698f06afe73)
![스크린샷 2025-01-19 오후 10 43 03](https://github.com/user-attachments/assets/cd2d091b-08e1-45f8-92a6-094b496a7117)
 실시간 참여자를 브로트캐스팅하여 접속한 순간 누가 lobby에 있는지 lobby 전원에게 보여줄 수 있음

![스크린샷 2025-01-19 오후 10 44 11](https://github.com/user-attachments/assets/0c8f7f03-5ac8-4863-855b-dfbc84872ae5)
방 생성시 원하는 게임을 선택하는 기능을 추가하여 추후에 게임을 추가할 수 있도록 만듬

![스크린샷 2025-01-19 오후 10 45 07](https://github.com/user-attachments/assets/969e3c8f-f92b-4231-8016-770e9a9473a6)


타이머 시작 - 게임 진행 방식을 5분간 가이드해줌
게임중단, 재시작 - 타이머 작동방식

![스크린샷 2025-01-19 오후 10 53 06](https://github.com/user-attachments/assets/3860e4ba-7dab-47f7-a763-be2b047416a0)

![스크린샷 2025-01-19 오후 10 52 29](https://github.com/user-attachments/assets/34bb5f89-8cfd-418b-8698-66ec4a92bc3d)
![스크린샷 2025-01-19 오후 10 52 42](https://github.com/user-attachments/assets/8112f200-2e32-450f-a566-1a8bcfbcc3c2)
제시어 배포  - dbsqlite에 topic, subtopic을 저장하고, particapants에 liar를 랜덤으로 지정하고, 2개의 random topic을 지정해서 모달창으로 사용자에게 배포함
다시보기 - 제시어가 배포된 Modal창을 다시 띄워주는 방식을 채택함

