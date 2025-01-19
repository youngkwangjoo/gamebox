# gamebox
여러가지 작은 게임을 웹페이지에서 즐길 수 있는 프로젝트

version 1.0 완성 2025.01.18

# stack
python, django, poetry, websocket, html, javascript, css, dbsqlite3, home NAS

특징 
1. WEBSOCKET을 활용한 실시간 채팅
2. Broad casting을 이용해 로비에 실시간 참여자 목록 제공
3. Websocker과 Broad casting을 활용해 liargame 제시어 배포 및 참가자 설명을 모든 참가자에게 보여줌
4. 간단한 Session 로그인 기능과 csrf토큰을 활용
5. 방장의 개념을 적용해 방 생성 시 제시어 배포 역할, 방 삭제 역할 추가
8. 프론트엔드 코드를 따로 하지않고 장고 템플릿을 활용해 js, css, html을 같이 배포함
9. nginx 와 colletstatic을 사용한 정적배포
10. Redis를 활용해서 실시간 게임의 속도 향상을 위해 캐시메모리 위주의 데이터 저장을 활용
11. docker를 활용하지 않은 직접 배포 방식

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

