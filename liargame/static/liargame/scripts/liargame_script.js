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

        participants.forEach(participant => {
            participantLogs[participant] = participantLogs[participant] || ''; // 초기화 또는 유지

            const participantElement = document.createElement('div');
            participantElement.classList.add('participant');
            participantElement.textContent = participant;

            // 참가자 이름 옆에 글을 표시할 공간 추가
            const logElement = document.createElement('span');
            logElement.id = `${participant}-log`; // 고유 id 설정
            logElement.textContent = participantLogs[participant] || '아직 작성된 글이 없습니다.';
            participantElement.appendChild(logElement);
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

            // 참가자 이름과 텍스트박스를 세로로 배치
            const textArea = document.createElement('textarea');
            textArea.id = `${participant}-textarea`;
            textArea.placeholder = `${participant}의 글을 작성하세요.`;
            textArea.style.width = '100%'; // 텍스트박스 전체 너비 사용

            // 글 작성 후 엔터키를 눌러서 글을 저장
            textArea.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault(); // 엔터 기본 동작 방지 (줄바꿈 방지)
                    const logMessage = textArea.value.trim(); // 작성된 글 가져오기

                    if (logMessage) {
                        updateParticipantLogs(participant, logMessage); // 글 업데이트
                        textArea.value = ''; // 텍스트 입력 후 초기화
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
        if (!participantLogs[participant]) {
            participantLogs[participant] = '';
        }
        participantLogs[participant] = logMessage;

        // 참가자 목록에 있는 해당 참가자의 글 업데이트
        const logElement = document.getElementById(`${participant}-log`);
        if (logElement) {
            logElement.textContent = participantLogs[participant];
        }
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
    renderParticipantInputFields(participants); // 참가자 글 작성 영역 렌더링
});
