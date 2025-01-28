document.addEventListener("DOMContentLoaded", function () {
    console.log("🚀 [DEBUG] just_chat.js 로드 완료");

    const chatLog = document.getElementById("chat-log");
    const messageInput = document.getElementById("chat-message-input");
    const sendButton = document.getElementById("chat-message-submit");

    const participantsContainer = document.getElementById("participants-container");
    const participantLogsContainer = document.getElementById("participant-logs-container");

    const chatContainer = document.getElementById("chat-container");
    const roomId = chatContainer.dataset.roomId;
    const nickname = chatContainer.dataset.nickname;

    console.log(`📌 [DEBUG] 현재 방 ID: ${roomId}`);
    console.log(`📌 [DEBUG] 사용자 닉네임: ${nickname}`);

    const wsProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";
    const socketUrl = `${wsProtocol}${window.location.host}/ws/just_chat/${roomId}/`;
    const socket = new WebSocket(socketUrl);

    console.log(`🔌 [DEBUG] WebSocket 연결 시도: ${socketUrl}`);

    socket.onopen = function () {
        console.log("✅ [DEBUG] WebSocket 연결 성공!");
    };

    socket.onmessage = function (event) {
        try {
            const data = JSON.parse(event.data);
            console.log("📩 [DEBUG] 메시지 수신:", data);

            switch (data.type) {
                case "message":
                    console.log(`💬 [DEBUG] [${data.nickname}] ${data.message}`);
                    addMessageToLog(data.nickname, data.message, data.nickname === nickname);
                    break;
                case "participants":
                    console.log("👥 [DEBUG] 참가자 목록 수신:", data.participants);
                    renderParticipants(data.participants);
                    break;
                case "log_update":
                    console.log("📝 [DEBUG] 참가자 로그 업데이트:", data.participant, data.log);
                    renderParticipantLogs(data.participant, data.log);
                    break;
                default:
                    console.warn("⚠️ [WARN] 알 수 없는 메시지 유형:", data);
            }
        } catch (error) {
            console.error("❌ [ERROR] WebSocket 메시지 처리 중 오류 발생:", event.data, error);
        }
    };

    socket.onerror = function (error) {
        console.error("❌ [ERROR] WebSocket 오류 발생:", error);
    };

    socket.onclose = function (event) {
        console.warn(`🔌 [WARN] WebSocket 연결 종료 (코드: ${event.code}, 이유: ${event.reason})`);
    };

    function sendMessage() {
        const message = messageInput.value.trim();
        if (message) {
            const messageData = {
                action: "message",
                nickname: nickname,
                message: message
            };

            console.log("📤 [DEBUG] 메시지 전송:", messageData);
            socket.send(JSON.stringify(messageData));

            messageInput.value = "";
        }
    }

    function addMessageToLog(sender, message, isSelf = false) {
        console.log(`💬 [DEBUG] 채팅 추가 - [${sender}]: ${message}`);

        const messageContainer = document.createElement("div");
        messageContainer.classList.add("message-container", isSelf ? "self" : "other");

        if (!isSelf) {
            const nameElement = document.createElement("div");
            nameElement.classList.add("sender-name");
            nameElement.textContent = sender;
            messageContainer.appendChild(nameElement);
        }

        const messageElement = document.createElement("div");
        messageElement.classList.add("message");
        messageElement.textContent = message;

        messageContainer.appendChild(messageElement);
        chatLog.appendChild(messageContainer);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    function renderParticipants(participants) {
        console.log("👥 [DEBUG] 참가자 목록 렌더링:", participants);

        participantsContainer.innerHTML = "";
        participants.forEach(participant => {
            const participantElement = document.createElement("div");
            participantElement.className = "participant-item";
            participantElement.textContent = participant;
            participantsContainer.appendChild(participantElement);
        });
    }

    function renderParticipantLogs(participant, logMessage) {
        console.log(`📝 [DEBUG] 참가자 로그 업데이트: ${participant} - ${logMessage}`);

        const logElement = document.createElement("div");
        logElement.className = "log-item";
        logElement.textContent = `${participant}: ${logMessage}`;
        participantLogsContainer.appendChild(logElement);
    }

    sendButton.addEventListener("click", sendMessage);
    messageInput.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            sendMessage();
        }
    });

    console.log("✅ [DEBUG] just_chat.js 실행 완료");
});
