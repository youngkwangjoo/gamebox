document.addEventListener('DOMContentLoaded', () => {
    const chatLog = document.getElementById('chat-log');
    const messageInput = document.getElementById('chat-message-input');
    const sendButton = document.getElementById('chat-message-submit');
    const participantsContainer = document.getElementById('participants-container');
    const voteContainer = document.getElementById('vote-participants');
    const voteResult = document.getElementById('vote-result');
    const showResultsButton = document.getElementById('show-results');
    const participantLogsContainer = document.getElementById('participant-logs-container');
    const roomId = document.getElementById('room-id').textContent.trim(); // 방 ID 가져오기
    const nickname = document.getElementById('user-nickname').textContent.trim(); // 사용자 닉네임 가져오기
    const socket = new WebSocket(`ws://${window.location.host}/ws/room/${roomId}/`);

    let participants = []; // 참가자 목록
    const votes = {}; // 투표 데이터 초기화
    const participantLogs = {}; // 각 참가자의 글 기록
    let hasVoted = false; // 투표 여부 확인

    // 채팅 메시지를 추가
    function addMessageToLog(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.textContent = `${sender}: ${message}`;
        messageElement.style.padding = '5px 10px';
        messageElement.style.backgroundColor = '#f1f1f1';
        messageElement.style.borderRadius = '5px';
        chatLog.appendChild(messageElement);

        // 최신 메시지로 스크롤 이동
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    // 메시지 전송 처리
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message) {
            socket.send(JSON.stringify({ action: 'message', sender: nickname, message })); // 서버로 메시지 전송
            addMessageToLog(nickname, message); // 자신의 메시지 추가
            messageInput.value = ''; // 입력 필드 초기화
        }
    }

    // 참가자 목록 렌더링
    function renderParticipants(participants) {
        participantsContainer.innerHTML = ''; // 기존 목록 초기화
        participants.forEach(participant => {
            const participantElement = document.createElement('div');
            participantElement.className = 'participant-item';
            participantElement.textContent = participant;
            participantsContainer.appendChild(participantElement);
        });
    }

    // 참가자 글 작성 영역 렌더링
    function renderParticipantInputFields(participants) {
        participantLogsContainer.innerHTML = ''; // 기존 글 입력란 초기화

        participants.forEach(participant => {
            const inputContainer = document.createElement('div');
            inputContainer.classList.add('input-container');

            // 참가자 이름
            const nameLabel = document.createElement('label');
            nameLabel.textContent = participant;
            nameLabel.setAttribute('for', `${participant}-textarea`);

            // 텍스트박스
            const textArea = document.createElement('textarea');
            textArea.id = `${participant}-textarea`;
            textArea.placeholder = `${participant}의 글을 작성하세요.`;
            textArea.style.width = '100%';

            // 글 작성 후 엔터키를 눌러 저장
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

    // 글 추가 및 업데이트
    function updateParticipantLogs(participant, logMessage) {
        participantLogs[participant] = logMessage;

        // 참가자 목록에 있는 글 업데이트
        const logElement = document.getElementById(`${participant}-log`);
        if (logElement) {
            logElement.textContent = participantLogs[participant];
        }
    }

    // 투표 UI 렌더링
    function renderVoteUI(participants) {
        voteContainer.innerHTML = ''; // 초기화
        participants.forEach(participant => {
            votes[participant] = votes[participant] || 0;

            const voteElement = document.createElement('div');
            voteElement.classList.add('vote-participant');

            const nameElement = document.createElement('span');
            nameElement.textContent = `${participant}: ${votes[participant]}표`;

            const voteButton = document.createElement('button');
            voteButton.textContent = '투표';
            voteButton.onclick = () => {
                if (!hasVoted) {
                    votes[participant] += 1;
                    nameElement.textContent = `${participant}: ${votes[participant]}표`;
                    alert(`${participant}에게 투표했습니다!`);
                    hasVoted = true;
                    voteButton.disabled = true;
                } else {
                    alert("이미 투표하셨습니다.");
                }
            };

            voteElement.appendChild(nameElement);
            voteElement.appendChild(voteButton);
            voteContainer.appendChild(voteElement);
        });
    }

    // 투표 결과 렌더링
    function renderVoteResults() {
        voteResult.innerHTML = '';
        const maxVotes = Math.max(...Object.values(votes));
        const topParticipants = Object.keys(votes).filter(
            participant => votes[participant] === maxVotes
        );

        const resultElement = document.createElement('div');
        resultElement.textContent = topParticipants.length > 0
            ? `최다 득표자: ${topParticipants.join(', ')} (${maxVotes}표)`
            : '투표된 참가자가 없습니다.';
        voteResult.appendChild(resultElement);
        voteResult.style.display = 'block';
    }

    // WebSocket 메시지 처리
    socket.onmessage = function (event) {
        const data = JSON.parse(event.data);

        if (data.type === 'participants') {
            participants = data.participants;
            renderParticipants(participants);
            renderParticipantInputFields(participants);
            renderVoteUI(participants);
        } else if (data.type === 'message') {
            addMessageToLog(data.sender, data.message);
        }
    };

    // WebSocket 연결 성공 시 참가 요청
    socket.onopen = function () {
        socket.send(JSON.stringify({ action: 'join', nickname }));
    };

    // WebSocket 연결 종료 시 로그 출력
    socket.onclose = function () {
        console.log('WebSocket connection closed.');
    };

    // 이벤트 핸들러 설정
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });

    showResultsButton.addEventListener('click', renderVoteResults);
});
