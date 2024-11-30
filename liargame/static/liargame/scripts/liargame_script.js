document.addEventListener('DOMContentLoaded', () => {
    const chatLog = document.getElementById('chat-log');
    const messageInput = document.getElementById('chat-message-input');
    const sendButton = document.getElementById('chat-message-submit');
    const participantsContainer = document.getElementById('participants-container');
    const voteContainer = document.getElementById('vote-participants');
    const voteResult = document.getElementById('vote-result');
    const showResultsButton = document.getElementById('show-results');
    const participantLogsContainer = document.getElementById('participant-logs-container');

    const nickname = 'joo'; // 기본 닉네임 (필요시 동적으로 설정 가능)
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
            addMessageToLog(nickname, message); // 자신의 메시지 추가
            messageInput.value = ''; // 입력 필드 초기화
        }
    }

    // 참가자 목록 렌더링
    function renderParticipants(participants) {
        participantsContainer.innerHTML = ''; // 기존 참가자 목록 초기화
        participantLogsContainer.innerHTML = ''; // 기존 참가자 글 초기화

        participants.forEach(participant => {
            participantLogs[participant] = participantLogs[participant] || []; // 초기화 또는 유지

            const participantElement = document.createElement('div');
            participantElement.classList.add('participant');
            participantElement.textContent = participant;
            participantsContainer.appendChild(participantElement);

            const logContainer = document.createElement('div');
            logContainer.classList.add('log-container');
            logContainer.textContent = `${participant}: ${participantLogs[participant].join(', ') || '아직 작성된 글이 없습니다.'}`;
            participantLogsContainer.appendChild(logContainer);
        });
    }

    // 글 추가 및 업데이트
    function updateParticipantLogs(participant, logMessage) {
        if (!participantLogs[participant]) {
            participantLogs[participant] = [];
        }
        participantLogs[participant].push(logMessage);

        // 참가자 글 업데이트
        renderParticipants(participants);
    }

    // 투표 UI 렌더링
    function renderVoteUI(participants) {
        voteContainer.innerHTML = ''; // 기존 투표 목록 초기화
        participants.forEach(participant => {
            votes[participant] = votes[participant] || 0; // 초기화 또는 유지

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
                    hasVoted = true; // 투표 여부 설정
                    voteButton.disabled = true; // 버튼 비활성화
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
        voteResult.innerHTML = ''; // 기존 결과 초기화
        const maxVotes = Math.max(...Object.values(votes)); // 가장 높은 투표 수
        const topParticipants = Object.keys(votes).filter(
            participant => votes[participant] === maxVotes
        );

        const resultElement = document.createElement('div');
        if (topParticipants.length > 0) {
            resultElement.textContent = `최다 득표자: ${topParticipants.join(', ')} (${maxVotes}표)`;
        } else {
            resultElement.textContent = '투표된 참가자가 없습니다.';
        }
        voteResult.appendChild(resultElement);
        voteResult.style.display = 'block';
    }

    // 이벤트 핸들러 설정
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });

    showResultsButton.addEventListener('click', renderVoteResults);

    // 초기 참가자 데이터 및 렌더링
    participants = ['Alice', 'Bob', 'Charlie']; // 예시로 기본 데이터 설정
    renderParticipants(participants);
    renderVoteUI(participants);
});
