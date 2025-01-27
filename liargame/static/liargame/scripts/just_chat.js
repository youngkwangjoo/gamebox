document.addEventListener("DOMContentLoaded", function () {
    const chatLog = document.getElementById("chat-log");
    const messageInput = document.getElementById("chat-message-input");
    const sendButton = document.getElementById("chat-message-submit");

    const participantsContainer = document.getElementById("participants-container");
    const participantLogsContainer = document.getElementById("participant-logs-container");

    const roomId = document.getElementById("chat-container").dataset.roomId;
    const nickname = document.getElementById("chat-container").dataset.nickname;

    const wsProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";
    const socket = new WebSocket(`${wsProtocol}${window.location.host}/ws/just_chat/${roomId}/`);

    socket.onmessage = function (event) {
        try {
            const data = JSON.parse(event.data);
            console.log("📩 메시지 수신:", data);

            switch (data.type) {
                case "message":
                    addMessageToLog(data.nickname, data.message, data.nickname === nickname);
                    break;
                case "participants":
                    renderParticipants(data.participants);
                    break;
                case "log_update":
                    renderParticipantLogs(data.participant, data.log);
                    break;
                default:
                    console.warn("⚠️ 알 수 없는 메시지 유형:", data);
            }
        } catch (error) {
            console.error("❌ WebSocket 메시지 처리 중 오류 발생:", error);
        }
    };

    function sendMessage() {
        const message = messageInput.value.trim();
        if (message) {
            socket.send(JSON.stringify({
                action: "message",
                nickname: nickname,
                message: message
            }));
            messageInput.value = "";
        }
    }

    function addMessageToLog(sender, message, isSelf = false) {
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
        participantsContainer.innerHTML = ""; // 기존 목록 초기화
        participants.forEach(participant => {
            const participantElement = document.createElement("div");
            participantElement.className = "participant-item";
            participantElement.textContent = participant;
            participantsContainer.appendChild(participantElement);
        });
    }

    function renderParticipantLogs(participant, logMessage) {
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

    socket.onerror = function (error) {
        console.error("❌ WebSocket 오류:", error);
    };
});
