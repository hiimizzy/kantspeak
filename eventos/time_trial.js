// ========== INSTRUMENTATION ==========
const SESSION_ID = localStorage.getItem('kant_session') || Date.now().toString();
localStorage.setItem('kant_session', SESSION_ID);

function logEvent(eventType, payload) {
fetch('/instrument.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            session: SESSION_ID,
            activity: 'timetrial',
            event: eventType,
            timestamp: Date.now() / 1000,
            data: payload
        })
    }).catch(e => console.warn('Logging failed:', e));
}

// ========== GAME STATE ==========
let currentWordObj = null;
let currentScore = 0;
let currentOptions = [];
let timer = 5;
let timerInterval = null;
let isTimedMode = true;
let gameActive = true;
let currentTrialStart = null;
let experimentGroup = 'control';
let currentTimeLimit = 5;

// Elementos DOM
const scoreSpan = document.getElementById('scoreValue');
const currentWordSpan = document.getElementById('currentWord');
const optionsDiv = document.getElementById('optionsContainer');
const skipBtn = document.getElementById('skipBtn');
const toggleModeBtn = document.getElementById('toggleTimerMode');
const feedbackContainer = document.getElementById('feedbackContainer');
const timerTextSpan = document.getElementById('timerText');
const timerCircle = document.getElementById('timerCircle');
const starsContainer = document.getElementById('starsContainer');

const CIRCUMFERENCE = 2 * Math.PI * 58;

// Banco local de palavras (fallback)
const vocabulary = [
    { word: "CAT", emoji: "🐱" }, { word: "DOG", emoji: "🐕" }, { word: "SUN", emoji: "☀️" },
    { word: "APPLE", emoji: "🍎" }, { word: "CAR", emoji: "🚗" }, { word: "BIRD", emoji: "🐦" },
    { word: "FISH", emoji: "🐠" }, { word: "STAR", emoji: "⭐" }, { word: "HOUSE", emoji: "🏠" },
    { word: "BOOK", emoji: "📚" }, { word: "MOON", emoji: "🌙" }, { word: "FLOWER", emoji: "🌸" }
];

// ========== API Calls ==========
async function fetchScore() {
    try {
fetch('/api.php?action=getScore')
        const data = await resp.json();
        currentScore = data.score || 0;
        scoreSpan.textContent = currentScore;
        updateStars();
    } catch (err) { console.error('fetchScore:', err); }
}

async function fetchExperimentGroup() {
    try {
fetch('/api.php?action=get_experiment_group&activity=timetrial')
        const data = await resp.json();
        if (data.group) {
            experimentGroup = data.group;
            logEvent('group_assignment', { exp: data.experiment_name, group: experimentGroup });
        }
    } catch (e) { console.warn(e); }
}

async function fetchCurrentWord() {
    try {
fetch('/api.php?action=getItem&activity=timetrial')
        const data = await resp.json();
        if (data.success && data.item) {
            currentWordObj = data.item;
        } else {
            // fallback local
            const randomIndex = Math.floor(Math.random() * vocabulary.length);
            currentWordObj = vocabulary[randomIndex];
        }
        currentWordSpan.textContent = currentWordObj.word;
        generateOptions();
        renderOptions();
        if (isTimedMode) startTimer();
        logEvent('session_start', { word: currentWordObj.word, group: experimentGroup });
    } catch (err) {
        console.error('fetchCurrentWord:', err);
        const randomIndex = Math.floor(Math.random() * vocabulary.length);
        currentWordObj = vocabulary[randomIndex];
        currentWordSpan.textContent = currentWordObj.word;
        generateOptions();
        renderOptions();
        if (isTimedMode) startTimer();
    }
}

async function sendAnswer(selectedWord) {
    const reactionTime = (performance.now() - currentTrialStart) / 1000;
    const formData = new FormData();
    formData.append('action', 'check');
    formData.append('activity', 'timetrial');
    formData.append('resposta', selectedWord);
    formData.append('time_limit', currentTimeLimit);
    formData.append('group', experimentGroup);
    try {
fetch('/api.php', { method: 'POST', body: formData })
        const data = await resp.json();
        if (data.success) {
            const isCorrect = data.feedback.includes('Correct');
            showFeedback(data.feedback, isCorrect);
            logEvent('check', {
                selected: selectedWord,
                correct: isCorrect,
                reactionTime: reactionTime,
                pointsEarned: isCorrect ? 10 : 0,
                time_limit: currentTimeLimit,
                group: experimentGroup
            });
            if (data.score !== undefined) {
                currentScore = data.score;
                scoreSpan.textContent = currentScore;
                updateStars();
            }
            if (isCorrect) {
                if (experimentGroup === 'adaptive') {
                    currentTimeLimit = Math.min(currentTimeLimit + 0.5, 8.0);
                } else if (isTimedMode) {
                    currentTimeLimit = Math.min(currentTimeLimit + 0.5, 5.0);
                }
                if (isTimedMode) {
                    timer = currentTimeLimit;
                    updateTimerUI();
                }
                nextWord();
            } else {
                if (experimentGroup === 'adaptive') {
                    currentTimeLimit = Math.max(currentTimeLimit - 0.5, 3.0);
                }
                if (isTimedMode) {
                    timer = currentTimeLimit;
                    updateTimerUI();
                    if (timer <= 0) {
                        stopTimer();
                        showFeedback("⏰ Time's up!", false);
                        nextWord();
                    }
                }
            }
        } else {
            showFeedback('Error verifying', false);
        }
    } catch (err) {
        console.error(err);
    }
}

// ========== Timer ==========
function updateTimerUI() {
    timerTextSpan.textContent = Math.ceil(timer);
    const offset = CIRCUMFERENCE - (timer / 5) * CIRCUMFERENCE;
    timerCircle.style.strokeDashoffset = offset;
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function startTimer() {
    if (!isTimedMode) return;
    if (timerInterval) stopTimer();
    timer = currentTimeLimit;
    updateTimerUI();
    timerInterval = setInterval(() => {
        if (!gameActive) return;
        if (timer <= 0) {
            stopTimer();
            showFeedback("⏰ Time's up!", false);
            nextWord();
        } else {
            timer = Math.max(0, timer - 0.1);
            updateTimerUI();
        }
    }, 100);
}

// ========== Game Logic ==========
function generateOptions() {
    const others = vocabulary.filter(item => item.word !== currentWordObj.word);
    const shuffled = [...others];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const opts = [currentWordObj, shuffled[0], shuffled[1]];
    for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    currentOptions = opts;
}

function renderOptions() {
    optionsDiv.innerHTML = '';
    currentOptions.forEach(opt => {
        const btn = document.createElement('div');
        btn.className = 'option-card flex flex-col items-center justify-center p-4 cursor-pointer hover:shadow-lg transition';
        btn.innerHTML = `<div class="text-6xl">${opt.emoji}</div><div class="font-bold mt-2 text-gray-700">${opt.word}</div>`;
        btn.addEventListener('click', () => {
            if (!gameActive) return;
            currentTrialStart = performance.now();
            sendAnswer(opt.word);
        });
        optionsDiv.appendChild(btn);
    });
}

async function nextWord() {
    if (!gameActive) return;
    stopTimer();
    await fetchCurrentWord();
    currentTrialStart = performance.now();
    if (isTimedMode) startTimer();
}

function skipWord() {
    if (!gameActive) return;
    showFeedback("Skipped!", false);
    nextWord();
}

function toggleTimerMode() {
    isTimedMode = !isTimedMode;
    if (isTimedMode) {
        toggleModeBtn.innerHTML = "☁️ Modo tranquilo";
        toggleModeBtn.classList.remove("bg-gray-500", "hover:bg-gray-600");
        toggleModeBtn.classList.add("bg-indigo-500", "hover:bg-indigo-600");
        startTimer();
        logEvent('mode_change', { mode: 'timed' });
    } else {
        toggleModeBtn.innerHTML = "⚡ Modo cronometrado";
        toggleModeBtn.classList.remove("bg-indigo-500", "hover:bg-indigo-600");
        toggleModeBtn.classList.add("bg-gray-500", "hover:bg-gray-600");
        stopTimer();
        timerTextSpan.textContent = "∞";
        timerCircle.style.strokeDashoffset = "0";
        logEvent('mode_change', { mode: 'relax' });
    }
    showFeedback(isTimedMode ? "Timer mode activated!" : "Relax mode. No timer.", true);
}

function updateStars() {
    const stars = Math.min(5, Math.floor(currentScore / 30));
    const starSpans = starsContainer.querySelectorAll('.star');
    starSpans.forEach((star, idx) => {
        if (idx < stars) star.classList.add('lit');
        else star.classList.remove('lit');
    });
}

function showFeedback(message, isCorrect) {
    feedbackContainer.innerHTML = '';
    const toast = document.createElement('div');
    toast.className = `feedback-toast px-6 py-3 rounded-full shadow-xl font-bold text-white text-center ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`;
    toast.textContent = message;
    feedbackContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

// ========== Inicialização ==========
async function init() {
    await fetchScore();
    await fetchExperimentGroup();
    await fetchCurrentWord();
    currentTrialStart = performance.now();
    skipBtn.addEventListener('click', skipWord);
    toggleModeBtn.addEventListener('click', toggleTimerMode);
    logEvent('instrumentation_ready', { version: '1.0' });
}
init();