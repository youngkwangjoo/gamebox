document.addEventListener("DOMContentLoaded", function () {
    // ✅ HTML에서 data 속성을 이용하여 roomId와 nickname 가져오기
    const chatContainer = document.getElementById("chat-container");
    const roomId = chatContainer.dataset.roomId;
    const nickname = chatContainer.dataset.nickname;

    // ✅ WebSocket 프로토콜을 동적으로 설정 (ws:// 또는 wss://)
    const wsProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";
    const socket = new WebSocket(`${wsProtocol}${window.location.host}/ws/just_chat/${roomId}/`);

    // ✅ DOM 요소 참조
    const chatLog = document.getElementById("chat-log");
    const messageInput = document.getElementById("chat-message-input");
    const sendButton = document.getElementById("chat-message-submit");
    const participantsContainer = document.getElementById("participants-container"); // 참가자 목록 표시 영역

    // ✅ WebSocket 연결이 성공하면 참가 요청 전송
    socket.onopen = function () {
        socket.send(JSON.stringify({
            action: "join",
            nickname: nickname
        }));
    };

    // ✅ WebSocket 메시지 수신 이벤트
    socket.onmessage = function (event) {
        const data = JSON.parse(event.data);

        if (data.type === "message") {
            appendMessage(data.nickname, data.message);
        } else if (data.type === "participants") {
            updateParticipantsList(data.participants);
        }
    };

    // ✅ 메시지 전송 이벤트 (버튼 클릭)
    sendButton.addEventListener("click", function () {
        sendMessage();
    });

    // ✅ 메시지 전송 이벤트 (Enter 키)
    messageInput.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            sendMessage();
        }
    });

    // ✅ 메시지 전송 함수
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message) {
            socket.send(JSON.stringify({
                action: "message",
                nickname: nickname,
                message: message
            }));
            messageInput.value = ""; // 입력 필드 초기화
        }
    }

    // ✅ 채팅 메시지를 UI에 추가하는 함수
    function appendMessage(sender, message) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message-container", sender === nickname ? "self" : "other");

        // 보낸 사람 닉네임 (상대방 메시지인 경우에만 표시)
        if (sender !== nickname) {
            const senderName = document.createElement("div");
            senderName.classList.add("sender-name");
            senderName.textContent = sender;
            messageElement.appendChild(senderName);
        }

        // 메시지 내용
        const messageContent = document.createElement("div");
        messageContent.classList.add("message");
        messageContent.textContent = message;
        messageElement.appendChild(messageContent);

        chatLog.appendChild(messageElement);
        chatLog.scrollTop = chatLog.scrollHeight; // 최신 메시지로 자동 스크롤
    }

    // ✅ 참가자 목록을 업데이트하는 함수
    function updateParticipantsList(participants) {
        participantsContainer.innerHTML = ""; // 기존 목록 초기화

        participants.forEach(participant => {
            const participantElement = document.createElement("div");
            participantElement.classList.add("participant-item");
            participantElement.textContent = participant;
            participantsContainer.appendChild(participantElement);
        });
    }
});
