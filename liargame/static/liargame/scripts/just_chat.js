document.addEventListener('DOMContentLoaded', () => {
    const chatLog = document.getElementById('chat-log');
    const messageInput = document.getElementById('chat-message-input');
    const sendButton = document.getElementById('chat-message-submit');

    const nickname = prompt("사용할 닉네임을 입력하세요", "익명");

    const socket = new WebSocket(`wss://${window.location.host}/ws/just_chat/`);

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "message") {
            addMessageToLog(data.nickname, data.message);
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
            messageInput.value = '';
        }
    }

    function addMessageToLog(sender, message) {
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('message-container');

        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.textContent = `${sender}: ${message}`;

        messageContainer.appendChild(messageElement);
        chatLog.appendChild(messageContainer);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            sendMessage();
        }
    });

    socket.onclose = () => {
        console.warn("WebSocket 연결이 종료되었습니다.");
    };

    socket.onerror = (error) => {
        console.error("WebSocket 오류:", error);
    };
});
