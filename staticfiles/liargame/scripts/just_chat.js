document.addEventListener("DOMContentLoaded", function () {
    const chatLog = document.getElementById("chat-log");
    const messageInput = document.getElementById("chat-message-input");
    const sendButton = document.getElementById("chat-message-submit");

    // ✅ HTML에서 data 속성을 이용하여 roomId와 nickname 가져오기
    const roomId = document.getElementById("chat-container").dataset.roomId;
    const nickname = document.getElementById("chat-container").dataset.nickname;

    // ✅ WebSocket 프로토콜을 동적으로 설정 (ws:// 또는 wss://)
    const wsProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";
    const socket = new WebSocket(`${wsProtocol}${window.location.host}/ws/just_chat/${roomId}/`);

    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        if (data.type === "message") {
            const messageElement = document.createElement("div");
            messageElement.classList.add("message-container");
            messageElement.classList.add(data.nickname === nickname ? "self" : "other");

            const senderName = document.createElement("div");
            senderName.classList.add("sender-name");
            senderName.textContent = data.nickname;

            const messageContent = document.createElement("div");
            messageContent.classList.add("message");
            messageContent.textContent = data.message;

            if (data.nickname !== nickname) {
                messageElement.appendChild(senderName);
            }
            messageElement.appendChild(messageContent);
            chatLog.appendChild(messageElement);
            chatLog.scrollTop = chatLog.scrollHeight;
        }
    };

    sendButton.addEventListener("click", function () {
        sendMessage();
    });

    messageInput.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            sendMessage();
        }
    });

    function sendMessage() {
        const message = messageInput.value.trim();
        if (message) {
            socket.send(JSON.stringify({
                nickname: nickname,
                message: message
            }));
            messageInput.value = "";
        }
    }
});
