document.addEventListener('DOMContentLoaded', () => {
    
    // DOM 요소 참조
    const chatLog = document.getElementById('chat-log');
    const messageInput = document.getElementById('chat-message-input');
    const sendButton = document.getElementById('chat-message-submit');
    const participantsContainer = document.getElementById('participants-container');
    const participantLogsContainer = document.getElementById('participant-logs-container');
    const voteContainer = document.getElementById('vote-participants');
    const voteResult = document.getElementById('vote-result');
    // 타이머
    const timerElement = document.getElementById('timer');
    const alertMessage = document.getElementById('alert-message');
    const startTimerButton = document.getElementById('start-timer-button'); // 버튼 요소 참조
    const stopTimerButton = document.getElementById('stop-timer-button');
    const resetTimerButton = document.getElementById('reset-timer-button');
    // WebSocket 설정
    const roomId = document.getElementById('room-id')?.textContent.trim() || '';
    const nickname = document.getElementById('user-nickname')?.textContent.trim() || '익명';
    const socket = new WebSocket(`wss://${window.location.host}/ws/room/${roomId}/`);

    // topic 설정
    const topicSelect = document.getElementById('topic-select');
    const confirmTopicButton = document.getElementById('confirm-topic-button');
    const participantModal = document.getElementById('participant-modal');
    const participantModalMessage = document.getElementById('participant-modal-message');
    const distributeButton = document.getElementById('distribute-topic-button');
    const topicModal = document.getElementById('topic-modal');
    const closeTopicModalButton = document.getElementById('close-topic-modal'); // 제시어 선택 모달 닫기 버튼
    const closeModalButton = document.getElementById('close-modal-button'); // 닫기 버튼 추가
    

    // 참가자와 방장 정보 (예시 데이터)
    const isHost = true; // 방장 여부 (서버에서 받아오는 데이터로 설정)

    // 상태 데이터 초기화
    const votes = {}; // 투표 상태
    let participants = [];
    const participantLogs = {}; // 참가자 글 상태를 유지하는 객체
    let hasVoted = false; // 투표 여부


    
    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('[DEBUG] Message received:', data);
    
            switch (data.type) {
                case 'message':
                    // 내가 보낸 메시지는 서버에서 수신했을 때 로그에 추가하지 않음
                    if (data.type === 'message') {
                        const isSelf = (data.sender === nickname); // 내가 보낸 메시지인지 확인
                        addMessageToLog(data.sender, data.message, isSelf);
                    }
                    break;
    
                case 'participants':
                    console.log('[DEBUG] 참가자를 최산화합니다.:', data.participants);
                    participants = data.participants;
                    renderParticipants(participants, participantLogs);
                    renderParticipantInputFields(participants);
                    renderVoteUI(participants);
                    break;
    
                case 'log_update':
                    console.log(`[DEBUG] Log update received for participant ${data.participant}`);
                    participantLogs[data.participant] = data.log;
                    renderParticipants(participants, participantLogs);
                    break;
    
                case 'distribute_topic':
                    console.log('[DEBUG] Topic distribution received');
                    handleTopicDistribution(data);
                    break;
    
                default:
                    console.warn('[WARN] Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('[ERROR] Failed to parse WebSocket message:', event.data, error);
        }
    };
    
    

    // 타이머 초기화
    let timerDuration = 5 * 60; // 5분 (300초)
    let timerInterval; // 타이머 Interval ID
    let isPaused = false; // 타이머 일시 중단 상태

    // WebSocket 이벤트
    socket.onopen = () => {
        console.log('[DEBUG] WebSocket 연결 성공');
        if (nickname) {
            console.log(`[DEBUG] 사용자 참가: ${nickname}`);
            socket.send(JSON.stringify({ action: 'join', nickname }));
        }
    };


    //제시어 배포 
    distributeButton.addEventListener('click', () => {
        if (!isHost) {
            alert('방장만 제시어를 배포할 수 있습니다.');
            return;
        }
    
        if (participants.length === 0) {
            alert('참가자가 없습니다. 참가자를 먼저 확인하세요.');
            return;
        }
    
        const topicModal = document.getElementById('topic-modal');
        if (topicModal) {
            topicModal.style.display = 'block'; // 모달 열기
        } else {
            console.error("topicModal 요소를 찾을 수 없습니다.");
        }
    });
    
    // "확인" 버튼과 SubTopic 배포
    confirmTopicButton.addEventListener('click', async () => {
        const selectedTopicId = topicSelect.value; // 이제 topic.id가 들어옴
    
        if (!selectedTopicId) {
            alert("주제를 선택해주세요.");
            return;
        }
    
        try {
            const response = await fetch(`/liargame/random-subtopics/?topic_id=${selectedTopicId}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                alert(`Error: ${errorData.error}`);
                return;
            }
    
            const data = await response.json();
    
            if (!participants || participants.length < 1) {
                alert("참가자가 없습니다. 제시어를 배포할 수 없습니다.");
                return;
            }
    
            const liar = participants[Math.floor(Math.random() * participants.length)];
            socket.send(
                JSON.stringify({
                    action: 'distribute_topic',
                    subtopic1: data.subtopics[0],
                    subtopic2: data.subtopics[1],
                    liar: liar,
                })
            );

        } catch (error) {
            console.error('Failed to fetch subtopics:', error);
            alert("소주제를 가져오는 데 실패했습니다. 다시 시도해주세요.");
        }
    });
    

    // modal
    // 모달 닫기 버튼 이벤트 리스너
    if (closeModalButton) {
        closeModalButton.addEventListener('click', () => {
            participantModal.style.display = 'none';
        });
    }
    
    // ESC 키로 모달 닫기
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && participantModal.style.display === 'flex') {
            participantModal.style.display = 'none';
        }
    });
    // 제시어 선택 모달 닫기 버튼 클릭 이벤트
    if (closeTopicModalButton) {
        closeTopicModalButton.addEventListener('click', () => {
            topicModal.style.display = 'none'; // 모달 닫기
        });
    }


    // 타이머 업데이트 함수
    function updateTimer() {
        if (timerDuration <= 0) {
            clearInterval(timerInterval);
            alertMessage.textContent = "타이머 종료!";
            timerElement.textContent = "00:00";
            return;
        }

        timerElement.textContent = formatTime(timerDuration);
        timerDuration--;
    }

    // 타이머 포맷팅 함수
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // 타이머 시작 함수
    function startTimer() {
        if (!isPaused) {
            timerDuration = 5 * 60;
        }
        alertMessage.textContent = "게임 준비 중...";
        timerElement.textContent = formatTime(timerDuration);
        timerInterval = setInterval(updateTimer, 1000);
        isPaused = false;
        toggleButtons(true);
    }

    // 타이머 중단 함수
    function stopTimer() {
        clearInterval(timerInterval);
        isPaused = true;
        alertMessage.textContent = "타이머가 중단되었습니다.";
        toggleButtons(false);
    }

    // 타이머 초기화 함수
    function resetTimer() {
        clearInterval(timerInterval);
        timerDuration = 5 * 60;
        timerElement.textContent = formatTime(timerDuration);
        alertMessage.textContent = "타이머가 초기화되었습니다.";
        isPaused = false;
        toggleButtons(false);
    }

    // 버튼 상태 토글 함수
    function toggleButtons(isRunning) {
        startTimerButton.disabled = isRunning;
        stopTimerButton.disabled = !isRunning;
        restartTimerButton.disabled = !isPaused;
    }

    // 타이머 버튼 이벤트
    startTimerButton.addEventListener('click', startTimer);
    stopTimerButton.addEventListener('click', stopTimer);
    resetTimerButton.addEventListener('click', resetTimer);

    // 초기 버튼 상태
    toggleButtons(false);

    function sendMessage() {
        const message = messageInput.value.trim();
        if (message) {
            socket.send(JSON.stringify({
                action: 'message',
                sender: nickname,
                message: message,
            }));
    
            messageInput.value = ''; // 입력 필드 초기화
        }
    }
    
    

    // 채팅 로그에 메시지 추가
    function addMessageToLog(sender, message, isSelf = false) {
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('message-container', isSelf ? 'self' : 'other');
    
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.textContent = message;
    
        if (!isSelf) {
            const nameElement = document.createElement('div');
            nameElement.classList.add('sender-name');
            nameElement.textContent = sender;
            messageContainer.appendChild(nameElement);
        }
    
        messageContainer.appendChild(messageElement);
        chatLog.appendChild(messageContainer);
        chatLog.scrollTop = chatLog.scrollHeight; // 최신 메시지로 스크롤
    }
    
    
    

    // 메시지 전송 버튼 이벤트
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });

    // socket.onmessage = (event) => {
    //     const data = JSON.parse(event.data);
    //     console.log('[DEBUG] Message received:', data);

    //     switch (data.type) {
    //         case 'participants':
    //             participants = data.participants;
    //             renderParticipants(participants, participantLogs); // 참가자 목록 갱신
    //             renderParticipantInputFields(participants); // 글 입력 UI 갱신
    //             renderVoteUI(participants); // 투표 UI 갱신
    //             break;
    //         case 'message':
    //             addMessageToLog(data.sender, data.message); // 다른 사용자의 메시지를 채팅 로그에 추가
    //             break;
    //         case 'log_update':
    //             participantLogs[data.participant] = data.log; // 참가자 글 업데이트
    //             renderParticipants(participants, participantLogs); // 변경된 글 목록 반영
    //             break;
    //         default:
    //             console.error('[ERROR] Unknown message type:', data.type);
    //     }
    // };

    socket.onclose = (event) => {
        console.log('[DEBUG] WebSocket 연결 종료:', event);
    };

    socket.onerror = (error) => {
        console.error('[ERROR] WebSocket 오류:', error);
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
        voteContainer.innerHTML = ''; // 기존 UI 초기화

        participants.forEach(participant => {
            // 투표 항목 생성
            const voteElement = document.createElement('div');
            voteElement.classList.add('vote-participant');

            // 참가자 이름
            const nameElement = document.createElement('span');
            nameElement.textContent = participant;

            // 투표 수
            const voteCount = document.createElement('span');
            voteCount.textContent = `${votes[participant] || 0}표`; // 현재 투표 수 표시
            voteCount.style.marginLeft = '10px'; // 이름 옆 간격

            // 투표 버튼
            const voteButton = document.createElement('button');
            voteButton.textContent = '투표';
            voteButton.disabled = hasVoted; // 이미 투표했으면 비활성화
            voteButton.addEventListener('click', () => {
                if (!hasVoted) {
                    socket.send(JSON.stringify({
                        action: 'vote',
                        participant: participant
                    })); // 서버로 투표 이벤트 전송

                    // 로컬 상태 업데이트
                    votes[participant] = (votes[participant] || 0) + 1;
                    voteCount.textContent = `${votes[participant]}표`; // 투표 수 갱신

                    alert(`${participant}에게 투표했습니다.`);
                    hasVoted = true; // 투표 완료 상태로 변경
                    voteButton.disabled = true; // 버튼 비활성화
                }
            });

            // 항목 구성
            voteElement.appendChild(nameElement);
            voteElement.appendChild(voteCount);
            voteElement.appendChild(voteButton);

            // 컨테이너에 추가
            voteContainer.appendChild(voteElement);
        });

        // "결과 보기" 버튼 추가
        const resultsButton = document.createElement('button');
        resultsButton.id = 'show-results';
        resultsButton.textContent = '결과 보기';
        resultsButton.addEventListener('click', renderVoteResults);
        voteContainer.appendChild(resultsButton);
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

    // 시간을 포맷팅하는 함수
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // 메시지 변경 함수
    function updateMessage(duration) {
        if (duration <= 300 && duration > 290) {
            alertMessage.textContent = "게임이 시작되었습니다. 제시어를 기억해주세요.";
        } else if (duration <= 290 && duration > 240) {
            alertMessage.textContent = "플레이어는 한 명씩 제시어를 설명해주세요.";
        } else if (duration <= 240 && duration > 210) {
            alertMessage.textContent = "liar를 추리해주세요.";
        } else if (duration <= 210 && duration > 180) {
            alertMessage.textContent = "투표하거나 round2로 넘어갑니다.";
        } else if (duration <= 180 && duration > 120) {
            alertMessage.textContent = "플레이어는 제시어를 설명해주세요.";
        } else if (duration <= 120 && duration > 0) {
            alertMessage.textContent = "liar를 추리하고 투표를 진행해주세요.";
        } else if (duration <= 0) {
            alertMessage.textContent = "타이머 종료!";
        }
    }


    // 타이머 업데이트 함수
    function updateTimer() {
        if (timerDuration <= 0) {
            clearInterval(timerInterval);
            alertMessage.textContent = "타이머 종료!"; // 종료 메시지
            timerElement.textContent = "00:00"; // 타이머 표시 초기화
            return;
        }

        // 메시지 업데이트
        updateMessage(timerDuration);

        timerElement.textContent = formatTime(timerDuration);
        timerDuration--;
    }

    // 타이머 시작 함수
    function startTimer() {
        if (!isPaused) {
            timerDuration = 5 * 60; // 타이머를 초기화 (5분)
        }
        alertMessage.textContent = "게임 준비 중..."; // 초기 알림 메시지 설정
        timerElement.textContent = formatTime(timerDuration); // 초기 시간 표시
        timerInterval = setInterval(updateTimer, 1000); // 1초마다 업데이트
        isPaused = false; // 타이머 실행 상태로 설정
        toggleButtons(true);
    }

    // 타이머 중단 함수
    function stopTimer() {
        clearInterval(timerInterval); // 타이머 중단
        isPaused = true; // 중단 상태로 설정
        alertMessage.textContent = "타이머가 중단되었습니다.";
        toggleButtons(false);
    }

    // 타이머 재시작 함수
    function restartTimer() {
        if (isPaused) {
            timerInterval = setInterval(updateTimer, 1000); // 중단된 타이머 재개
            alertMessage.textContent = "타이머가 재시작되었습니다.";
            isPaused = false; // 실행 상태로 설정
            toggleButtons(true);
        }
    }

    // 타이머 초기화 함수
    function resetTimer() {
        clearInterval(timerInterval); // 기존 타이머 중단
        timerDuration = 5 * 60; // 초기값 설정
        timerElement.textContent = formatTime(timerDuration); // 타이머 초기화
        alertMessage.textContent = "타이머가 초기화 및 재시작되었습니다.";
        timerInterval = setInterval(updateTimer, 1000); // 새 타이머 시작
        isPaused = false; // 실행 상태로 변경
        toggleButtons(true); // 버튼 상태 갱신
    }

    // 버튼 상태 토글
    function toggleButtons(isRunning) {
        startTimerButton.disabled = isRunning;
        stopTimerButton.disabled = !isRunning;
        resetTimerButton.disabled = !isRunning; // Reset 버튼 활성화 상태 유지
    }

    // 버튼 클릭 이벤트
    startTimerButton.addEventListener('click', startTimer);
    stopTimerButton.addEventListener('click', stopTimer);
    resetTimerButton.addEventListener('click', resetTimer);

    // 초기 버튼 상태 설정
    toggleButtons(false);

    // 버튼 클릭 이벤트로 타이머 시작
    startTimerButton.addEventListener('click', () => {
        timerDuration = 5 * 60; // 타이머를 초기화 (5분)
        startTimer(); // 타이머 시작
    });

    // Topic 목록 가져오기
    async function loadTopics() {
        console.log('Loading topics...'); // 함수 호출 확인
    
        try {
            const response = await fetch('/liargame/topics');
            const topics = await response.json();
    
            console.log('Topics loaded:', topics); // API로 반환된 데이터 확인
    
            // select 요소 초기화 (중복 방지)
            topicSelect.innerHTML = '';
    
            topics.forEach(topic => {
                const option = document.createElement('option');
                option.value = topic.id; // Topic의 고유 ID
                option.textContent = topic.name; // Topic의 이름
                topicSelect.appendChild(option);
            });
    
            console.log('Topics added to select:', topicSelect.innerHTML); // 추가된 옵션 확인
        } catch (error) {
            console.error('Failed to load topics:', error);
        }
    }
    

    // SubTopic 가져오기 및 배포
    async function fetchSubtopicsAndDistribute() {
        const selectedTopicId = topicSelect.value;
    
        if (!selectedTopicId) {
            console.error('No topic selected');
            return;
        }
    
        try {
            const encodedTopicId = encodeURIComponent(selectedTopicId);
            const response = await fetch(`/liargame/random-subtopics/?topic_id=${encodedTopicId}`);
            if (!response.ok) throw new Error('Failed to fetch subtopics');
    
            const data = await response.json();
    
            if (participants.length === 0) {
                console.error('No participants found');
                alert('참가자가 없습니다. 먼저 참가자를 추가하세요.');
                return;
            }
    
            // Liar 배포 로직
            const liar = participants[Math.floor(Math.random() * participants.length)];
            const liarSubtopic = data.subtopics[1];
            const participantSubtopic = data.subtopics[0];
    
            // SubTopic 전달
            socket.send(
                JSON.stringify({
                    action: 'distribute_topic',
                    subtopic1: participantSubtopic,
                    subtopic2: liarSubtopic,
                    liar: liar,
                })
            );
    
            // 모달창에 표시
            if (nickname === liar) {
                participantModalMessage.textContent = `당신은 Liar입니다. 주제어는: ${liarSubtopic}`;
            } else {
                participantModalMessage.textContent = `당신의 제시어는: ${participantSubtopic}`;
            }
            participantModal.style.display = 'flex';
    
            // 모달에 Liar 정보 및 제시어 정보 포함
            const modalHeader = `Liar는 ${liar}입니다.`;
            const modalContent = nickname === liar 
                ? `당신의 주제어: ${liarSubtopic}` 
                : `당신의 제시어: ${participantSubtopic}`;
    
            participantModalMessage.innerHTML = `<strong>${modalHeader}</strong><br>${modalContent}`;
        } catch (error) {
            console.error('Failed to fetch subtopics:', error);
        }
    }
    
    

// 클릭 이벤트 중복 방지
confirmTopicButton.removeEventListener('click', fetchSubtopicsAndDistribute);
confirmTopicButton.addEventListener('click', fetchSubtopicsAndDistribute);

    // 초기화
    loadTopics();

    // 이벤트 리스너
    confirmTopicButton.addEventListener('click', fetchSubtopicsAndDistribute);

    // // WebSocket 메시지 수신
    // socket.onmessage = (event) => {
    //     const data = JSON.parse(event.data);

    //     if (data.type === 'participants') {
    //         participants = data.participants; // 참가자 업데이트
    //         console.log('[DEBUG] Participants updated:', participants);
    //     }
    // };
});
    