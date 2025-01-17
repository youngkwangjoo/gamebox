document.addEventListener('DOMContentLoaded', () => {
    
    // DOM 요소 참조
    const chatLog = document.getElementById('chat-log');
    const messageInput = document.getElementById('chat-message-input');
    const sendButton = document.getElementById('chat-message-submit');
    const participantsContainer = document.getElementById('participants-container');
    const participantLogsContainer = document.getElementById('participant-logs-container');
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
    const participantModal = document.getElementById('participant-modal');
    const participantModalMessage = document.getElementById('participant-modal-message');
    const distributeButton = document.getElementById('distribute-topic-button');
    const topicModal = document.getElementById('topic-modal');
    const closeTopicModalButton = document.getElementById('close-topic-modal'); // 제시어 선택 모달 닫기 버튼
    const closeModalButton = document.getElementById('close-modal-button'); // 닫기 버튼 추가
    
    // 참가자와 방장 정보 초기화
    const roomOwnerNickname = document.getElementById('room-owner')?.textContent.trim();
    const isHost = nickname === roomOwnerNickname; // 방장 여부 확인

    // ✅ 페이지 로드 시 모달 강제 숨김
    if (participantModal) {
        participantModal.style.display = 'none';
        console.log("🔒 페이지 로드됨 → 모달 숨김: display = 'none'");
    }

    // 방장 여부 확인
    if (!isHost) {
        distributeButton.disabled = true; // 방장이 아니라면 버튼 비활성화
        distributeButton.addEventListener('click', () => {
            alert("❌ 제시어 배포는 방장만 가능합니다.");
        });
    } else {
        distributeButton.addEventListener('click', async () => {
            const selectedTopicId = topicSelect.value;

            if (!selectedTopicId) {
                alert("⚠️ 주제를 선택해주세요.");
                return;
            }

            try {
                // ✅ 서버에서 선택된 주제의 소주제를 가져옴
                const response = await fetch(`/liargame/random-subtopics/?topic_id=${selectedTopicId}`);
                
                if (!response.ok) {
                    const errorData = await response.json();
                    alert(`❌ 오류 발생: ${errorData.error}`);
                    return;
                }

                const data = await response.json();

                if (!participants || participants.length < 2) {
                    alert("⚠️ 참가자가 2명 이상 필요합니다.");
                    return;
                }

                // ✅ Liar 랜덤 선정
                const liar = participants[Math.floor(Math.random() * participants.length)];
                const subtopicForLiar = data.subtopics[0];
                const subtopicForOthers = data.subtopics[1];

                console.log(`[DEBUG] 선택된 Liar: ${liar}`);
                console.log(`[DEBUG] Subtopics - Liar: ${subtopicForLiar}, Others: ${subtopicForOthers}`);

                // ✅ 서버로 제시어 배포 요청 전송
                socket.send(
                    JSON.stringify({
                        action: 'distribute_topic',
                        liar: liar,
                        subtopic_liar: subtopicForLiar,
                        subtopic_others: subtopicForOthers,
                    })
                );

                // ✅ 모달에 역할 및 제시어 표시
                const modalHeader = (nickname === liar) ? "당신은 Liar입니다! 🤫" : "당신은 Liar가 아닙니다. 😊";
                const modalContent = (nickname === liar) 
                    ? `🔒 당신의 제시어는 <strong>${subtopicForLiar}</strong>입니다.`
                    : `🔑 당신의 제시어는 <strong>${subtopicForOthers}</strong>입니다.`;

                participantModalMessage.innerHTML = `<h2>${modalHeader}</h2><p>${modalContent}</p>`;

                // ✅ 모달 열기 (여기에 추가!)
                participantModal.style.display = 'flex';
                console.log("📢 모달이 표시됨: display = 'flex'");

                alert('✅ 제시어가 성공적으로 배포되었습니다.');

            } catch (error) {
                console.error('❌ 소주제 가져오기 실패:', error);
                alert("❌ 소주제를 가져오는 데 실패했습니다. 다시 시도해주세요.");
            }
        });

        // ✅ 드롭다운 주제 선택 시 배포 버튼 활성화
        topicSelect.addEventListener('change', () => {
            distributeButton.disabled = !topicSelect.value; // 주제가 선택되면 활성화
        });
    }

        // ✅ ESC 또는 Enter 키로 모달 닫기
        window.addEventListener('keydown', (event) => {
            if ((event.key === 'Escape' || event.key === 'Enter') && participantModal.style.display === 'flex') {
                console.log(`📢 ${event.key} 키 입력 → 모달 닫기`);
                participantModal.style.display = 'none';
            }
        });

    // ✅ 닫기 버튼 클릭 시 모달 닫기
    if (closeModalButton) {
        closeModalButton.addEventListener('click', () => {
            participantModal.style.display = 'none';
            console.log("📢 모달이 닫힘: display = 'none'");
        });
    }

    // 상태 데이터 초기화
    const votes = {}; // 투표 상태
    let participants = [];
    const participantLogs = {}; // 참가자 글 상태를 유지하는 객체
    let hasVoted = false; // 투표 여부


    
    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('[DEBUG] WebSocket message received:', data);
    
            switch (data.type) {
                case 'message':
                    const isSelf = (data.nickname.trim() === nickname.trim());
                    addMessageToLog(data.nickname, data.message, isSelf);
                    break;

                case 'participants':
                    console.log('[DEBUG] Participants data received:', data);
                    participants = Array.isArray(data.participants) ? data.participants : [];
                    console.log('[DEBUG] Parsed participants:', participants);
                    renderParticipants(participants, participantLogs, votes);
                    break;
                    
    
                case 'log_update':
                    participantLogs[data.participant] = data.log;
                    renderParticipantLogs(participantLogs);
                    break;
    
                case 'vote_update':
                    votes[data.participant] = data.voteCount;
                    renderParticipants(participants, participantLogs, votes);
                    break;

                case 'distribute_topic':  
                    console.log('[DEBUG] Topic distribution received');
                    handleTopicDistribution(data);  // 제시어 배포 처리
                    break;
    
                    
                case 'send_subtopic':  // 🔥 이 메시지를 받으면 모달을 띄우는 코드
                    const { subtopic, is_liar } = data;
                    
                    console.log(`[DEBUG] 받은 제시어: ${subtopic}, Liar 여부: ${is_liar}`);
    
                    const modalHeader = is_liar ? "당신은 Liar입니다! 🤫" : "당신은 Liar가 아닙니다. 😊";
                    const modalContent = subtopic 
                        ? `🔑 당신의 제시어는 <strong>${subtopic}</strong>입니다.`
                        : "⚠️ 아직 제시어가 배포되지 않았습니다.";
    
                    participantModalMessage.innerHTML = `<h2>${modalHeader}</h2><p>${modalContent}</p>`;
    
                    // ✅ 모달을 띄우기 전에 제시어가 있는지 확인
                    if (subtopic) {
                        participantModal.style.display = 'flex';
                        console.log("📢 WebSocket 메시지 수신 → 모달 표시됨: display = 'flex'");
                    } else {
                        console.warn("⚠️ 제시어가 없으므로 모달을 띄우지 않음.");
                    }
                    break;
    
                case 'subtopic':  // 기존 처리
                    const { participant, subtopic: subtopic2, is_liar: isLiar2 } = data;
                    if (participant === nickname) {
                        const modalHeader2 = isLiar2 ? "당신은 Liar입니다!" : "당신은 Liar가 아닙니다.";
                        const modalContent2 = `제시어는 <strong>${subtopic2}</strong>입니다.`;
                        participantModalMessage.innerHTML = `<h2>${modalHeader2}</h2><p>${modalContent2}</p>`;
                        participantModal.style.display = 'flex';
                        console.log('[DEBUG] Modal displayed'); 
                    }
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
    let timerInterval = null; // 타이머 Interval ID
    let isRunning = false; // 타이머 실행 여부

    // WebSocket 이벤트
    socket.onopen = () => {
        console.log('[DEBUG] WebSocket 연결 성공');
        if (nickname) {
            console.log(`[DEBUG] 사용자 참가: ${nickname}`);
            socket.send(JSON.stringify({ action: 'join', nickname }));
        }
    };
    
    function handleTopicDistribution(data) {
        const { liar, subtopic_liar, subtopic_others } = data;
    
        if (!liar || !subtopic_liar || !subtopic_others) {
            console.error('[ERROR] Missing or invalid topic distribution data:', data);
            return;
        }
    
        const isLiar = (nickname === liar); // 본인이 Liar인지 확인
    
        console.log(`[DEBUG] Liar: ${liar}, Subtopic for Liar: ${subtopic_liar}, Subtopic for Others: ${subtopic_others}`);
    
        const modalHeader = isLiar ? "당신은 Liar입니다!" : "당신은 Liar가 아닙니다.";
        const modalContent = isLiar 
            ? `제시어는 <strong>${subtopic_liar}</strong>입니다.`
            : `제시어는 <strong>${subtopic_others}</strong>입니다.`;
    
        // 모달 내용 설정
        participantModalMessage.innerHTML = `<h2>${modalHeader}</h2><p>${modalContent}</p>`;
        
        // 모달 열기
        participantModal.style.display = 'flex'; // 모달 표시
    
        console.log(`[DEBUG] Role: ${isLiar ? "Liar" : "Participant"}, Subtopic: ${isLiar ? subtopic_liar : subtopic_others}`);
    }
    
    // ✅ 중복 제거된 모달 닫기 함수
    function closeModal() {
        participantModal.style.display = 'none';
    }
    
    // ✅ 닫기 버튼 클릭 이벤트 등록 (중복 제거)
    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeModal);
    }
    
    // ✅ ESC 키로 모달 닫기 (중복 제거)
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && participantModal.style.display === 'flex') {
            closeModal();
        }
    });
    

    // ✅ 시간을 MM:SS 형식으로 변환
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // ✅ 타이머 시작 함수
    function startTimer() {
        if (isRunning) return; // 중복 실행 방지

        isRunning = true;
        alertMessage.textContent = "🕹️ 게임 진행 중...";
        timerElement.textContent = formatTime(timerDuration);

        timerInterval = setInterval(updateTimer, 1000);
        toggleButtons(true);
    }

    // ✅ 타이머 중단 함수
    function stopTimer() {
        if (!isRunning) return; // 실행 중이 아닐 경우 무시

        clearInterval(timerInterval);
        isRunning = false;
        alertMessage.textContent = "⏸️ 타이머가 중단되었습니다.";
        toggleButtons(false);
    }

    // ✅ 타이머 초기화 함수 (리셋 후 중단)
    function resetTimer() {
        clearInterval(timerInterval);
        timerDuration = 5 * 60; // 5분으로 초기화
        timerElement.textContent = formatTime(timerDuration);
        alertMessage.textContent = "🔄 타이머가 초기화되었습니다.";
        isRunning = false;
        toggleButtons(false);
    }

    // ✅ 1초마다 실행되는 타이머 업데이트
    function updateTimer() {
        if (timerDuration <= 0) {
            clearInterval(timerInterval);
            isRunning = false;
            alertMessage.textContent = "⏳ 타이머 종료!";
            timerElement.textContent = "00:00";
            toggleButtons(false);
            return;
        }

    // 🔥 게임 메시지 변경 (현재 시간에 맞게)
    updateMessage(timerDuration);

    timerElement.textContent = formatTime(timerDuration);
    timerDuration--;
}


    // 버튼 상태 토글 함수
    function toggleButtons(running) {
        startTimerButton.disabled = running;
        stopTimerButton.disabled = !running;
        resetTimerButton.disabled = false; // 리셋 버튼은 항상 활성화
    }

    // 타이머 버튼 이벤트
    startTimerButton.addEventListener('click', startTimer);
    stopTimerButton.addEventListener('click', stopTimer);
    resetTimerButton.addEventListener('click', resetTimer);

    // 초기 버튼 상태
    toggleButtons(false);

    function sendMessage() {
        const message = messageInput.value.trim();
        console.log(`[DEBUG] 메시지 입력 값: "${message}"`); // 디버깅 추가
        if (message) {
            socket.send(JSON.stringify({
                action: 'message',
                nickname: nickname, 
                message: message
            }));
    
            messageInput.value = ''; // 입력 필드 초기화
        }
    }
    
    

    // 채팅 로그에 메시지 추가
    function addMessageToLog(sender, message, isSelf = false) {
        console.log(`[DEBUG] addMessageToLog called. Sender: ${sender}, Message: ${message}`);  // 디버깅 추가
        
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('message-container', isSelf ? 'self' : 'other');
        
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.textContent = message;
        
        if (!isSelf) {
            // 상대방 메시지에만 이름을 표시
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


    socket.onclose = (event) => {
        console.log('[DEBUG] WebSocket 연결 종료:', event);
    };

    socket.onerror = (error) => {
        console.error('[ERROR] WebSocket 오류:', error);
    };

    // 참가자 목록 렌더링
    function renderParticipants(participants, logs, votes) {
        participantsContainer.innerHTML = ''; // 기존 목록 초기화

        participants.forEach(participant => {
            const participantElement = document.createElement('div');
            participantElement.className = 'participant-item';

            // 참가자 이름 표시
            const nameSpan = document.createElement('span');
            nameSpan.textContent = participant;
            participantElement.appendChild(nameSpan);

            if (participant === nickname) {
                // 본인인 경우 input 박스를 표시
                const inputBox = document.createElement('input');
                inputBox.type = 'text';
                inputBox.placeholder = '본인 단어에 대한 설명을 적어주세요';
                inputBox.value = logs[participant] || ''; // 기존 로그 값 표시
                inputBox.addEventListener('change', () => {
                    const logMessage = inputBox.value.trim();
                    if (logMessage) {
                        socket.send(JSON.stringify({
                            action: 'update_log',
                            participant: participant,
                            log: logMessage
                        }));
                    }
                });
                participantElement.appendChild(inputBox);
            } else {
                // 다른 참가자인 경우 투표 버튼을 표시
                const voteButton = document.createElement('button');
                voteButton.textContent = '투표';
                voteButton.addEventListener('click', () => {
                    if (!hasVoted) {
                        console.log('[DEBUG] Sending vote for participant:', participant);
                        socket.send(JSON.stringify({
                            action: 'vote',
                            participant: participant
                        }));

                        alert(`${participant}에게 투표했습니다.`);
                        hasVoted = true;
                        voteButton.disabled = true;
                    }
                });
                participantElement.appendChild(voteButton);
            }

            // 투표 수 표시
            const voteCountSpan = document.createElement('span');
            voteCountSpan.textContent = ` ${votes[participant] || 0}표`;
            voteCountSpan.style.marginLeft = '10px';
            participantElement.appendChild(voteCountSpan);

            participantsContainer.appendChild(participantElement);
        });

        // 참가자 글 및 투표 패널 갱신
        renderParticipantLogs(logs);
    }

    
    function renderParticipantLogs(logs) {
        participantLogsContainer.innerHTML = ''; // 기존 내용을 초기화
    
        Object.keys(logs).forEach(participant => {
            const logElement = document.createElement('div');
            logElement.className = 'log-item';
    
            // 참가자 이름 표시
            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${participant}: `;
            nameSpan.style.fontWeight = 'bold';
            logElement.appendChild(nameSpan);
    
            // 참가자 글 표시
            const logMessage = document.createElement('span');
            logMessage.textContent = logs[participant];
            logElement.appendChild(logMessage);
    
            participantLogsContainer.appendChild(logElement);
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

    // ✅ 타이머 시작 함수
    function startTimer() {
        if (isRunning) return; // 중복 실행 방지

        isRunning = true;
        alertMessage.textContent = "🕹️ 게임 진행 중...";
        timerElement.textContent = formatTime(timerDuration);

        timerInterval = setInterval(updateTimer, 1000);
        toggleButtons(true);
    }

    // 타이머 중단 함수
    function stopTimer() {
        clearInterval(timerInterval); // 타이머 중단
        isRunning = false; // 중단 상태로 설정
        alertMessage.textContent = "타이머가 중단되었습니다.";
        toggleButtons(false);
    }

    // 타이머 재시작 함수
    function restartTimer() {
        if (isPaused) {
            timerInterval = setInterval(updateTimer, 1000); // 중단된 타이머 재개
            alertMessage.textContent = "타이머가 재시작되었습니다.";
            isRunning = false; // 실행 상태로 설정
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
        isRunning = false; // 실행 상태로 변경
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
    

    // 초기화
    loadTopics();

});
    