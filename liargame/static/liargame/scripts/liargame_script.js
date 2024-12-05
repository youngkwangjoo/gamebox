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
    const participantLogs = {}; // 참가자 글 상태를 유지하는 객체
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
                renderParticipants(participants, participantLogs); // 참가자 목록 갱신
                renderParticipantInputFields(participants); // 글 입력 UI 갱신
                break;
            case 'log_update':
                participantLogs[data.participant] = data.log; // 참가자 글 업데이트
                renderParticipants(participants, participantLogs); // 변경된 글 목록 반영
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

    // 참가자 목록 렌더링
    function renderParticipants(participants, logs) {
        participantsContainer.innerHTML = ''; // 기존 목록 초기화
        participants.forEach(participant => {
            const participantElement = document.createElement('div');
            participantElement.className = 'participant-item';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = participant;

            const logSpan = document.createElement('span');
            logSpan.textContent = logs[participant] || ''; // 참가자의 로그 출력
            logSpan.style.marginLeft = '10px';
            logSpan.style.color = 'gray';
            logSpan.style.fontStyle = 'italic';

            participantElement.appendChild(nameSpan);
            participantElement.appendChild(logSpan);
            participantsContainer.appendChild(participantElement);
        });
    }

    // 참가자 글 입력 영역 렌더링
    function renderParticipantInputFields(participants) {
        participantLogsContainer.innerHTML = ''; // 기존 입력 필드 초기화
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
                        // WebSocket으로 참가자 글 업데이트 요청 전송
                        socket.send(JSON.stringify({
                            action: 'update_log',
                            participant: participant,
                            log: logMessage
                        }));

                        // 로컬 데이터 갱신
                        participantLogs[participant] = logMessage;

                        // UI 갱신
                        renderParticipants(participants, participantLogs);

                        // 입력 필드 초기화
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
