document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소 참조
    const chatLog = document.getElementById('chat-log');
    const messageInput = document.getElementById('chat-message-input');
    const sendButton = document.getElementById('chat-message-submit');
    const participantsContainer = document.getElementById('participants-container');
    const participantLogsContainer = document.getElementById('participant-logs-container');
    const voteContainer = document.getElementById('vote-participants');
    const voteResult = document.getElementById('vote-result');
    const showResultsButton = document.getElementById('show-results');

    // WebSocket 설정
    const roomId = document.getElementById('room-id')?.textContent.trim() || '';
    const nickname = document.getElementById('user-nickname')?.textContent.trim() || '익명';
    const socket = new WebSocket(`ws://${window.location.host}/ws/room/${roomId}/`);

    console.log('[DEBUG] WebSocket initialized for Room:', roomId, 'Nickname:', nickname);

    // 상태 데이터 초기화
    let participants = [];
    const votes = {}; // 투표 상태
    const participantLogs = {}; // 참가자 글 상태
    let hasVoted = false; // 투표 여부

    // WebSocket 이벤트 핸들러
    socket.onopen = () => {
        console.log('[DEBUG] WebSocket connected.');
        if (nickname) {
            socket.send(JSON.stringify({ action: 'join', nickname }));
        }
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('[DEBUG] Message received:', data);

        switch (data.type) {
            case 'participants':
                participants = data.participants;
                renderParticipants(participants);
                renderParticipantInputFields(participants);
                renderVoteUI(participants);
                break;
            case 'message':
                addMessageToLog(data.sender, data.message);
                break;
            default:
                console.error('[ERROR] Unknown message type:', data.type);
        }
    };

    socket.onclose = () => {
        console.log('[DEBUG] WebSocket connection closed.');
    };

    socket.onerror = (error) => {
        console.error('[ERROR] WebSocket error:', error);
    };

    // 메시지 추가 함수
    function addMessageToLog(sender, message, isSelf = false) {
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('message-container', isSelf ? 'self' : 'other');

        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.textContent = `${message}`;

        messageContainer.appendChild(messageElement);
        chatLog.appendChild(messageContainer);

        // 최신 메시지로 스크롤 이동
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    // 메시지 전송
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message) {
            socket.send(JSON.stringify({ action: 'message', sender: nickname, message }));
            addMessageToLog(nickname, message, true);
            messageInput.value = '';
        }
    }

    // 참가자 목록 렌더링
    function renderParticipants(participants) {
        participantsContainer.innerHTML = '';
        participants.forEach(participant => {
            const participantElement = document.createElement('div');
            participantElement.className = 'participant-item';
            participantElement.textContent = participant;
            participantsContainer.appendChild(participantElement);
        });
    }

    // 참가자 글 입력 영역 렌더링
    function renderParticipantInputFields(participants) {
        participantLogsContainer.innerHTML = '';
        participants.forEach(participant => {
            const inputContainer = document.createElement('div');
            inputContainer.classList.add('input-container');

            const nameLabel = document.createElement('label');
            nameLabel.textContent = participant;

            const textArea = document.createElement('textarea');
            textArea.placeholder = `${participant}의 글을 작성하세요.`;
            textArea.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    const logMessage = textArea.value.trim();
                    if (logMessage) {
                        updateParticipantLogs(participant, logMessage);
                        textArea.value = '';
                    }
                }
            });

            inputContainer.appendChild(nameLabel);
            inputContainer.appendChild(textArea);
            participantLogsContainer.appendChild(inputContainer);
        });
    }

    // 참가자 글 상태 업데이트
    function updateParticipantLogs(participant, logMessage) {
        participantLogs[participant] = logMessage;
    }

    // 투표 UI 렌더링
    function renderVoteUI(participants) {
        voteContainer.innerHTML = '';
        participants.forEach(participant => {
            votes[participant] = votes[participant] || 0;

            const voteElement = document.createElement('div');
            voteElement.classList.add('vote-participant');

            const nameElement = document.createElement('span');
            nameElement.textContent = `${participant}: ${votes[participant]}표`;

            const voteButton = document.createElement('button');
            voteButton.textContent = '투표';
            voteButton.disabled = hasVoted;
            voteButton.addEventListener('click', () => {
                if (!hasVoted) {
                    votes[participant] += 1;
                    nameElement.textContent = `${participant}: ${votes[participant]}표`;
                    hasVoted = true;
                    alert(`${participant}에게 투표했습니다.`);
                    voteButton.disabled = true;
                }
            });

            voteElement.appendChild(nameElement);
            voteElement.appendChild(voteButton);
            voteContainer.appendChild(voteElement);
        });
    }

    // 투표 결과 렌더링
    function renderVoteResults() {
        voteResult.innerHTML = '';
        const maxVotes = Math.max(...Object.values(votes));
        const topParticipants = Object.keys(votes).filter(participant => votes[participant] === maxVotes);

        const resultElement = document.createElement('div');
        resultElement.textContent = topParticipants.length
            ? `최다 득표자: ${topParticipants.join(', ')} (${maxVotes}표)`
            : '투표된 참가자가 없습니다.';
        voteResult.appendChild(resultElement);
        voteResult.style.display = 'block';
    }

    // 이벤트 핸들러
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });

    showResultsButton.addEventListener('click', renderVoteResults);
});
