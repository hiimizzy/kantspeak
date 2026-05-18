// ========== CONFIGURAÇÃO DO CAMINHO BASE ==========
// Altere para o caminho onde estão api.php e instrument.php no seu servidor
// Exemplo: se o projeto estiver em http://localhost/kant_speak/ , use '/kant_speak/'
// Se estiver na raiz do servidor (http://localhost/), use ''
const BASE_URL = '/kant_speak/';  // ← AJUSTE CONFORME SUA INSTALAÇÃO

// ========== INSTRUMENTATION ==========
const SESSION_ID = localStorage.getItem('kant_session') || Date.now().toString();
localStorage.setItem('kant_session', SESSION_ID);

function logEvent(eventType, payload) {
    fetch(`${BASE_URL}instrument.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            session: SESSION_ID,
            activity: 'alphabet',
            event: eventType,
            timestamp: Date.now() / 1000,
            data: payload
        })
    }).catch(e => console.warn('Logging failed:', e));
}

// ========== GAME STATE ==========
let currentLetter = '';
let currentScore = 0;
let cameraActive = false;
let mediaStream = null;
let handsInstance = null;
let cameraInstance = null;
let isHandTrackingReady = false;
let drawingPoints = [];
let lastPoint = null;
let isDrawingGesture = false;
let fingerPosition = null;
let startTime = null;

// Elementos DOM
const scoreSpan = document.getElementById('scoreValue');
const currentLetterSpan = document.getElementById('currentLetterDisplay');
const feedbackContainer = document.getElementById('feedbackContainer');
const checkBtn = document.getElementById('checkBtn');
const clearBtn = document.getElementById('clearBtn');
const nextLetterBtn = document.getElementById('nextLetterBtn');
const speakLetterBtn = document.getElementById('speakLetterBtn');
const toggleCameraBtn = document.getElementById('toggleCameraBtn');
const videoElement = document.getElementById('webcamVideo');
const drawCanvas = document.getElementById('drawCanvas');
const guideCanvas = document.getElementById('guideCanvas');
const drawCtx = drawCanvas.getContext('2d');
const guideCtx = guideCanvas.getContext('2d');
const fingerCursorDiv = document.getElementById('fingerCursor');
const cameraOffOverlay = document.getElementById('cameraOffOverlay');
const cameraLoadingDiv = document.getElementById('cameraLoading');
const instructionText = document.getElementById('instructionText');
const starsContainer = document.getElementById('starsContainer');

const CANVAS_SIZE = 400;
drawCanvas.width = CANVAS_SIZE;
drawCanvas.height = CANVAS_SIZE;
guideCanvas.width = CANVAS_SIZE;
guideCanvas.height = CANVAS_SIZE;

drawCtx.strokeStyle = '#f97316';
drawCtx.lineWidth = 8;
drawCtx.lineCap = 'round';
drawCtx.lineJoin = 'round';

// ========== API Calls (com BASE_URL) ==========
async function fetchCurrentItem() {
    try {
        const resp = await fetch(`${BASE_URL}api.php?action=getItem&activity=alphabet`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (data.success) {
            currentLetter = data.item;
            currentLetterSpan.textContent = currentLetter;
            drawGuideLetter();
            startTime = performance.now();
            logEvent('session_start', { letter: currentLetter });
        } else {
            console.error('Erro ao buscar letra:', data);
            showFeedback('❌ Servidor não respondeu corretamente', false);
        }
    } catch (err) {
        console.error('fetchCurrentItem:', err);
        showFeedback('❌ Erro ao conectar com o servidor (verifique se o PHP está rodando)', false);
    }
}

async function fetchScore() {
    try {
        const resp = await fetch(`${BASE_URL}api.php?action=getScore`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (data.score !== undefined) {
            currentScore = data.score;
            scoreSpan.textContent = currentScore;
            updateStars(currentScore);
        }
    } catch (err) {
        console.error('fetchScore:', err);
        // Não exibe feedback para não incomodar, apenas log
    }
}

async function checkAnswer(resposta) {
    const reactionTime = (performance.now() - startTime) / 1000;
    const formData = new FormData();
    formData.append('action', 'check');
    formData.append('activity', 'alphabet');
    formData.append('resposta', resposta);
    try {
        const resp = await fetch(`${BASE_URL}api.php`, { method: 'POST', body: formData });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (data.success) {
            const isCorrect = data.feedback.includes('Acertou');
            showFeedback(data.feedback, isCorrect);
            logEvent('check', {
                letter: currentLetter,
                correct: isCorrect,
                reactionTime: reactionTime,
                pointsEarned: isCorrect ? 10 : 0,
                drawingPoints: drawingPoints.length
            });
            if (data.score !== undefined) {
                currentScore = data.score;
                scoreSpan.textContent = currentScore;
                updateStars(currentScore);
            }
            if (isCorrect) {
                await fetchCurrentItem();
                clearDrawing();
            }
        }
    } catch (err) {
        console.error(err);
        showFeedback('❌ Erro ao verificar resposta', false);
    }
}

async function nextLetter() {
    try {
        const resp = await fetch(`${BASE_URL}api.php?action=next&activity=alphabet`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (data.success) {
            await fetchCurrentItem();
            clearDrawing();
            logEvent('next_letter', { newLetter: data.item });
        }
    } catch (err) {
        console.error(err);
        showFeedback('❌ Erro ao avançar letra', false);
    }
}

// ========== UI Functions ==========
function drawGuideLetter() {
    guideCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    guideCtx.font = `bold ${CANVAS_SIZE * 0.5}px "Nunito"`;
    guideCtx.textAlign = "center";
    guideCtx.textBaseline = "middle";
    guideCtx.setLineDash([12, 12]);
    guideCtx.strokeStyle = "#94a3b8";
    guideCtx.lineWidth = 4;
    guideCtx.strokeText(currentLetter, CANVAS_SIZE/2, CANVAS_SIZE/2);
    guideCtx.setLineDash([]);
}

function clearDrawing() {
    drawCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    drawingPoints = [];
    lastPoint = null;
    logEvent('clear', { letter: currentLetter });
}

function showFeedback(message, isCorrect) {
    feedbackContainer.innerHTML = '';
    const toast = document.createElement('div');
    toast.className = `feedback-toast px-6 py-3 rounded-full shadow-xl font-bold text-white text-center ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`;
    toast.textContent = message;
    feedbackContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

function updateStars(score) {
    const stars = Math.min(5, Math.floor(score / 30));
    const starSpans = starsContainer.querySelectorAll('.star');
    starSpans.forEach((star, idx) => {
        if (idx < stars) star.classList.add('lit');
        else star.classList.remove('lit');
    });
}

function speakLetter() {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(currentLetter);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
    logEvent('speak_hint', { letter: currentLetter });
}

// ========== MediaPipe Hand Tracking ==========
async function initHandTracking() {
    if (handsInstance) handsInstance.close();
    handsInstance = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    handsInstance.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
    });
    handsInstance.onResults(onHandResults);
}

function isOnlyIndexFingerExtended(landmarks) {
    const indexTip = landmarks[8], indexPip = landmarks[6];
    const middleTip = landmarks[12], middlePip = landmarks[10];
    const ringTip = landmarks[16], pinkyTip = landmarks[20];
    const indexExtended = indexTip.y < indexPip.y;
    const middleExtended = middleTip.y < middlePip.y;
    const ringExtended = ringTip.y < landmarks[14].y;
    const pinkyExtended = pinkyTip.y < landmarks[18].y;
    return indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
}

function mapToCanvas(normalizedX, normalizedY) {
    const mirroredX = 1 - normalizedX;
    return { x: mirroredX * CANVAS_SIZE, y: normalizedY * CANVAS_SIZE };
}

function onHandResults(results) {
    if (!cameraActive) return;
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const indexTip = landmarks[8];
        if (indexTip) {
            const { x, y } = mapToCanvas(indexTip.x, indexTip.y);
            fingerPosition = { x, y };
            fingerCursorDiv.style.display = 'block';
            fingerCursorDiv.style.left = `${(x / CANVAS_SIZE) * 100}%`;
            fingerCursorDiv.style.top = `${(y / CANVAS_SIZE) * 100}%`;
            const drawingActive = isOnlyIndexFingerExtended(landmarks);
            if (drawingActive && !isDrawingGesture) {
                isDrawingGesture = true;
                lastPoint = null;
                logEvent('draw_start', { letter: currentLetter });
            } else if (!drawingActive && isDrawingGesture) {
                isDrawingGesture = false;
                lastPoint = null;
                logEvent('draw_end', { letter: currentLetter, points: drawingPoints.length });
            }
            if (isDrawingGesture && fingerPosition) {
                const currentPoint = { x: fingerPosition.x, y: fingerPosition.y };
                drawingPoints.push(currentPoint);
                if (lastPoint) {
                    drawCtx.beginPath();
                    drawCtx.moveTo(lastPoint.x, lastPoint.y);
                    drawCtx.lineTo(currentPoint.x, currentPoint.y);
                    drawCtx.stroke();
                }
                lastPoint = currentPoint;
            } else {
                lastPoint = null;
            }
        }
    } else {
        fingerCursorDiv.style.display = 'none';
        if (isDrawingGesture) {
            isDrawingGesture = false;
            lastPoint = null;
            logEvent('draw_end', { letter: currentLetter, points: drawingPoints.length, reason: 'hand_lost' });
        }
    }
}

async function startCamera() {
    cameraLoadingDiv.style.display = 'flex';
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        mediaStream = stream;
        videoElement.srcObject = stream;
        await videoElement.play();
        await initHandTracking();
        if (cameraInstance) cameraInstance.close();
        cameraInstance = new Camera(videoElement, {
            onFrame: async () => {
                if (handsInstance && cameraActive) await handsInstance.send({ image: videoElement });
            },
            width: 640, height: 480
        });
        await cameraInstance.start();
        cameraActive = true;
        isHandTrackingReady = true;
        cameraOffOverlay.style.display = 'none';
        instructionText.classList.remove('hidden');
        cameraLoadingDiv.style.display = 'none';
        checkBtn.disabled = false;
        logEvent('camera_start', { success: true });
    } catch (err) {
        console.error(err);
        cameraLoadingDiv.style.display = 'none';
        alert("Não foi possível acessar a câmera.");
        cameraActive = false;
        cameraOffOverlay.style.display = 'flex';
        instructionText.classList.add('hidden');
        checkBtn.disabled = true;
        logEvent('camera_start', { success: false, error: err.message });
    }
}

function stopCamera() {
    if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
    if (cameraInstance) cameraInstance.close();
    if (handsInstance) handsInstance.close();
    videoElement.srcObject = null;
    cameraActive = false;
    isHandTrackingReady = false;
    cameraOffOverlay.style.display = 'flex';
    instructionText.classList.add('hidden');
    fingerCursorDiv.style.display = 'none';
    checkBtn.disabled = true;
    clearDrawing();
    logEvent('camera_stop', {});
}

function toggleCamera() {
    if (cameraActive) {
        stopCamera();
        toggleCameraBtn.innerHTML = '📷 Ligar Câmera';
        toggleCameraBtn.classList.remove('bg-red-600');
        toggleCameraBtn.classList.add('bg-gradient-to-r', 'from-blue-600', 'to-indigo-600');
    } else {
        startCamera();
        toggleCameraBtn.innerHTML = '📷 Desligar Câmera';
        toggleCameraBtn.classList.remove('bg-gradient-to-r', 'from-blue-600', 'to-indigo-600');
        toggleCameraBtn.classList.add('bg-red-600');
    }
}

function handleCheck() {
    if (!cameraActive || !isHandTrackingReady) {
        showFeedback('❌ Ligue a câmera primeiro!', false);
        return;
    }
    if (drawingPoints.length < 10) {
        showFeedback('❌ Desenhe mais!', false);
        return;
    }
    checkAnswer(currentLetter);
}

// ========== Inicialização ==========
async function init() {
    await fetchScore();
    await fetchCurrentItem();
    drawGuideLetter();

    if (toggleCameraBtn) toggleCameraBtn.addEventListener('click', toggleCamera);
    if (checkBtn) checkBtn.addEventListener('click', handleCheck);
    if (clearBtn) clearBtn.addEventListener('click', clearDrawing);
    if (nextLetterBtn) nextLetterBtn.addEventListener('click', nextLetter);
    if (speakLetterBtn) speakLetterBtn.addEventListener('click', speakLetter);

    cameraOffOverlay.style.display = 'flex';
    instructionText.classList.add('hidden');
    checkBtn.disabled = true;

    initHandTracking().catch(console.warn);
    logEvent('instrumentation_ready', { version: '2.0' });
}

init();