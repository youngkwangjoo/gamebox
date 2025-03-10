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
    const closeModalButton = document.getElementById('close-modal-button'); // 닫기 버튼 추가
    const reviewTopicButton = document.getElementById('review-topic-button'); // "다시보기" 버튼 참조
    const leaveRoomButton = document.getElementById('leave-room-button');
    const gameRoomUrl = document.getElementById('game-room-url')?.textContent.trim(); // 대기실 URL 가져오기
    // 참가자와 방장 정보 초기화
    const roomOwnerNickname = document.getElementById('room-owner')?.textContent.trim();
    const isHost = nickname === roomOwnerNickname; // 방장 여부 확인

    const resetVoteButton = document.getElementById('reset-vote-button');
    if (resetVoteButton) {
        resetVoteButton.addEventListener('click', resetVotes);
    } else {
        console.warn("[WARN] reset-vote-button 버튼을 찾을 수 없습니다.");
    }


    // ✅ 페이지 로드 시 모달 강제 숨김
    if (participantModal) {
        participantModal.style.display = 'none';
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

                alert('✅ 제시어가 성공적으로 배포되었습니다.');

            } catch (error) {
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
                participantModal.style.display = 'none';
            }
        });

    // ✅ 닫기 버튼 클릭 시 모달 닫기
    if (closeModalButton) {
        closeModalButton.addEventListener('click', () => {
            participantModal.style.display = 'none';
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
    
            switch (data.type) {
                case 'message':
                    const isSelf = (data.nickname.trim() === nickname.trim());
                    addMessageToLog(data.nickname, data.message, isSelf);
                    break;

                case 'participants':
                    participants = Array.isArray(data.participants) ? data.participants : [];
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

                    handleTopicDistribution(data); // 기존 기능 실행
                    break;
    
                    
                case 'send_subtopic':  // 🔥 이 메시지를 받으면 모달을 띄우는 코드
                    const { subtopic, is_liar } = data;
    
                    const modalHeader = is_liar ? "당신은 Liar입니다! 🤫" : "당신은 Liar가 아닙니다. 😊";
                    const modalContent = subtopic 
                        ? `🔑 당신의 제시어는 <strong>${subtopic}</strong>입니다.`
                        : "⚠️ 아직 제시어가 배포되지 않았습니다.";
    
                    participantModalMessage.innerHTML = `<h2>${modalHeader}</h2><p>${modalContent}</p>`;
    
                    // ✅ 모달을 띄우기 전에 제시어가 있는지 확인
                    if (subtopic) {
                        participantModal.style.display = 'flex';
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
                    }
                    break;
                    
                    case 'reset_votes': // 🔥 투표 초기화 처리 추가
                    resetVotes();
                    break;    

                default:
                    console.warn('[WARN] Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('[ERROR] Failed to parse WebSocket message:', event.data, error);
        }
    };
    
    
    
    // 타이머 초기화
    let timerDuration = 3 * 60; // 3분 (180초)
    let timerInterval = null; // 타이머 Interval ID
    let isRunning = false; // 타이머 실행 여부
    let isPaused = false; // 타이머 일시 정지 여부
    

    // WebSocket 이벤트
    socket.onopen = () => {
        if (nickname) {
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
    
        const modalHeader = isLiar ? "당신은 Liar입니다!" : "당신은 Liar가 아닙니다.";
        const modalContent = isLiar 
            ? `제시어는 <strong>${subtopic_liar}</strong>입니다.`
            : `제시어는 <strong>${subtopic_others}</strong>입니다.`;
    
        // 모달 내용 설정
        participantModalMessage.innerHTML = `<h2>${modalHeader}</h2><p>${modalContent}</p>`;
        
        // 모달 열기
        participantModal.style.display = 'flex'; // 모달 표시
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
    
        if (isPaused) {
            resumeTimer(); // ⏸ 중단된 상태라면 재개
            return;
        }
    
        isRunning = true;
        isPaused = false; // 새로 시작하므로 초기화
        alertMessage.textContent = "🕹️ 게임 진행 중...";
        timerElement.textContent = formatTime(timerDuration);
    
        timerInterval = setInterval(updateTimer, 1000);
        toggleButtons(true);
    }

    // ✅ 타이머 재개 함수 (일시 정지된 상태에서 다시 시작)
    function resumeTimer() {
        if (isRunning) return; // 이미 실행 중이면 무시
        if (!isPaused) return; // 일시 정지가 아니라면 무시

        isRunning = true;
        isPaused = false; // 다시 실행 중이므로 초기화
        alertMessage.textContent = "🔄 게임이 다시 시작되었습니다!";
        timerInterval = setInterval(updateTimer, 1000);
        toggleButtons(true);
    }

    // ✅ 타이머 중단 함수
    function stopTimer() {
        if (!isRunning) return; // 실행 중이 아닐 경우 무시
    
        clearInterval(timerInterval);
        isRunning = false;
        isPaused = true; // 중단 상태로 설정
        alertMessage.textContent = "⏸️ 게임이 일시 정지되었습니다. 다시 시작할 수 있습니다.";
        toggleButtons(false, true); // '재시작' 버튼 활성화
    }

    // ✅ 타이머 초기화 함수 (리셋 후 중단)
    function resetTimer() {
        clearInterval(timerInterval);
        timerDuration = 3 * 60; // 3분으로 초기화
        timerElement.textContent = formatTime(timerDuration);
        alertMessage.textContent = "🔄 타이머가 초기화되었습니다.";
        isRunning = false;
        isPaused = false; // 완전히 초기화
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

    // 메시지 변경 함수
    function updateMessage(duration) {
        if (duration > 170) {
            alertMessage.textContent = "🔍 본인의 역할과 제시어를 확인해주세요!";
        } else if (duration > 160 - (participants.length * 10)) { 
            const playerNumber = (participants.length - Math.floor((duration - 160) / 10)) + 1; // 1번부터 시작하도록 변경
            alertMessage.textContent = `🎤 ${playerNumber}번 플레이어는 제시어를 설명해주세요.`;
        } else if (duration > 80) {
            alertMessage.textContent = "🕵️‍♂️ Liar를 추리해주세요!";
        } else if (duration > 10) {
            alertMessage.textContent = "🗳️ 투표를 진행해주세요!";
        } else {
            alertMessage.textContent = "⏳ 시간이 종료되었습니다!";
        }
    }


    // 버튼 상태 토글 함수
    function toggleButtons(running, paused = false) {
        startTimerButton.disabled = running;
        stopTimerButton.disabled = !running;
        resetTimerButton.disabled = false; // Reset 버튼은 항상 활성화
        if (paused) startTimerButton.disabled = false; // 중단 상태에서는 '재시작' 가능
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
                nickname: nickname, 
                message: message
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
    

    function resetVotes() {
    
        if (!participants || participants.length === 0) {
            console.warn("[WARN] 참가자가 없습니다. 투표 초기화가 불가능합니다.");
            return;
        }
    
        // 모든 참가자의 투표 수 초기화
        Object.keys(votes).forEach(participant => {
            votes[participant] = 0;
        });
    
        hasVoted = false; // 플레이어가 다시 투표할 수 있도록 초기화
        renderParticipants(participants, participantLogs, votes); // 화면 업데이트
    
        // 서버에도 투표 초기화 요청 전송
        socket.send(JSON.stringify({ action: 'reset_votes' }));
    
        alert('🗳️ 모든 투표가 초기화되었습니다.');
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

    //모달 다시보기
    if (reviewTopicButton) {
        reviewTopicButton.addEventListener('click', () => {
            participantModal.style.display = 'flex'; // 모달을 다시 보여줌
        });
    }
    
    if (leaveRoomButton && gameRoomUrl) {
        leaveRoomButton.addEventListener('click', () => {
            if (confirm("⚠️ 정말 방을 나가시겠습니까? 게임이 종료될 수 있습니다.")) {
                window.location.href = gameRoomUrl; // 대기실 페이지로 이동
            }
        });
    } else {
        console.warn("[WARN] 방나가기 버튼 또는 대기실 URL을 찾을 수 없습니다.");
    }


    // 이벤트 핸들러
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });

    // 버튼 클릭 이벤트로 타이머 시작
    startTimerButton.addEventListener('click', () => {
        timerDuration = 3 * 60; // 타이머를 초기화 
        startTimer(); // 타이머 시작
    });

    // Topic 목록 가져오기
    async function loadTopics() {
    
        try {
            const response = await fetch('/liargame/topics');
            const topics = await response.json();
    
            // select 요소 초기화 (중복 방지)
            topicSelect.innerHTML = '';
    
            topics.forEach(topic => {
                const option = document.createElement('option');
                option.value = topic.id; // Topic의 고유 ID
                option.textContent = topic.name; // Topic의 이름
                topicSelect.appendChild(option);
            });
    
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
    