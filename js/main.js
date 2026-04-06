// =============================================
// Audio & Sound Effects
// =============================================

let audioContext;
let soundEnabled = true;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(frequency, duration) {
    if (!soundEnabled) return;
    initAudio();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

function playCountdownBeep() { playSound(600, 0.1); }
function playTransitionBeep() { playSound(800, 0.35); }
function playStartSound() { playSound(440, 0.2); }

function playCompletionSound() {
    playSound(523, 0.2);
    setTimeout(() => playSound(659, 0.2), 200);
    setTimeout(() => playSound(784, 0.2), 400);
    setTimeout(() => playSound(880, 0.3), 600);
    setTimeout(() => playSound(1047, 0.5), 900);
}

// =============================================
// Helpers
// =============================================

function formatTime(seconds) {
    if (seconds >= 60) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${seconds}`;
}

function formatTimeWithUnit(seconds) {
    return `${formatTime(seconds)}${seconds >= 60 ? '' : 's'}`;
}

function formatDisplayTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatSummaryDuration(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0 && seconds > 0) return `${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
}

function createGroup(overrides = {}) {
    return {
        id: overrides.id || `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        work: Math.max(5, overrides.work ?? 20),
        rest: Math.max(0, overrides.rest ?? 10)
    };
}

function getDefaultConfig() {
    return {
        preparation: 10,
        rounds: 2,
        groups: [createGroup()]
    };
}

function getMinimumValue(field) {
    if (field === 'work') return 5;
    if (field === 'rounds') return 1;
    return 0;
}

function clampValue(field, value) {
    return Math.max(getMinimumValue(field), value);
}

// =============================================
// Global State & Configuration
// =============================================

const config = getDefaultConfig();

let state = {
    phase: 'idle',
    currentRound: 0,
    currentGroup: 0,
    timeLeft: 0,
    paused: false,
    interval: null,
    timeline: [],
    currentPhaseIndex: -1
};

let holdInterval = null;
let holdTimeout = null;
let activeAdjustButton = null;
let transitionTimeout;
let wakeLock = null;
let draggedGroupId = null;

function setTimerPhaseTheme(phase) {
    if (phase === 'work') {
        document.body.setAttribute('data-timer-phase', 'work');
    } else {
        document.body.removeAttribute('data-timer-phase');
    }
}

function setPlayPauseButton(paused) {
    document.getElementById('playPauseBtn').innerHTML = paused
        ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M91.2 36.9c-12.4-6.8-27.4-6.5-39.6 .7S32 57.9 32 72l0 368c0 14.1 7.5 27.2 19.6 34.4s27.2 7.5 39.6 .7l336-184c12.8-7 20.8-20.5 20.8-35.1s-8-28.1-20.8-35.1l-336-184z"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M48 32C21.5 32 0 53.5 0 80L0 432c0 26.5 21.5 48 48 48l64 0c26.5 0 48-21.5 48-48l0-352c0-26.5-21.5-48-48-48L48 32zm224 0c-26.5 0-48 21.5-48 48l0 352c0 26.5 21.5 48 48 48l64 0c26.5 0 48-21.5 48-48l0-352c0-26.5-21.5-48-48-48l-64 0z"/></svg>';
}

// =============================================
// Persistence
// =============================================

function normalizeSavedConfig(savedConfig) {
    if (!savedConfig || typeof savedConfig !== 'object') {
        return getDefaultConfig();
    }

    const normalized = getDefaultConfig();
    normalized.preparation = clampValue('preparation', Number(savedConfig.preparation) || 0);
    normalized.rounds = clampValue('rounds', Number(savedConfig.rounds) || 1);

    if (Array.isArray(savedConfig.groups) && savedConfig.groups.length > 0) {
        normalized.groups = savedConfig.groups.map(group => createGroup({
            id: group.id,
            work: Number(group.work),
            rest: Number(group.rest)
        }));
    } else {
        normalized.groups = [
            createGroup({
                work: Number(savedConfig.work) || 20,
                rest: Number(savedConfig.rest) || 10
            })
        ];
    }

    return normalized;
}

function loadPreferences() {
    const savedConfig = localStorage.getItem('tabataConfig');
    if (savedConfig) {
        Object.assign(config, normalizeSavedConfig(JSON.parse(savedConfig)));
    }

    const savedSound = localStorage.getItem('soundEnabled');
    if (savedSound !== null) {
        soundEnabled = savedSound === 'true';
        updateSoundIcon();
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
        updateThemeIcon();
    }
}

function savePreferences() {
    localStorage.setItem('tabataConfig', JSON.stringify(config));
    localStorage.setItem('soundEnabled', soundEnabled);
    localStorage.setItem('theme', document.body.getAttribute('data-theme'));
}

// =============================================
// Configuration Rendering
// =============================================

function renderConfig() {
    document.getElementById('preparationValue').textContent = formatTimeWithUnit(config.preparation);
    document.getElementById('roundsValue').textContent = config.rounds;
    renderGroups();
    updateSummary();
}

function renderGroups() {
    const groupsList = document.getElementById('groupsList');

    groupsList.innerHTML = config.groups.map((group, index) => `
        <article class="exercise-row" data-group-id="${group.id}" draggable="true">
            <button class="sort-handle" type="button" aria-label="Drag to reorder exercise">
                <span></span>
                <span></span>
                <span></span>
            </button>

            <div class="exercise-pair">
                <section class="exercise-card">
                    <label class="mini-label">Sport ${index + 1}</label>
                    <div class="mini-control">
                        <button class="adjust-btn mini-btn" type="button" aria-label="Decrease sport ${index + 1} time" data-adjust-scope="group" data-group-id="${group.id}" data-field="work" data-delta="-5">-</button>
                        <div class="mini-value">${formatTimeWithUnit(group.work)}</div>
                        <button class="adjust-btn mini-btn" type="button" aria-label="Increase sport ${index + 1} time" data-adjust-scope="group" data-group-id="${group.id}" data-field="work" data-delta="5">+</button>
                    </div>
                </section>

                <section class="exercise-card rest-card">
                    <label class="mini-label">Rest ${index + 1}</label>
                    <div class="mini-control">
                        <button class="adjust-btn mini-btn" type="button" aria-label="Decrease rest ${index + 1} time" data-adjust-scope="group" data-group-id="${group.id}" data-field="rest" data-delta="-5">-</button>
                        <div class="mini-value">${formatTimeWithUnit(group.rest)}</div>
                        <button class="adjust-btn mini-btn" type="button" aria-label="Increase rest ${index + 1} time" data-adjust-scope="group" data-group-id="${group.id}" data-field="rest" data-delta="5">+</button>
                    </div>
                </section>
            </div>

            <button class="delete-group-btn" type="button" aria-label="Delete exercise ${index + 1}" data-delete-group="${group.id}">-</button>
        </article>
    `).join('');
}

function updateSummary() {
    const totalTime = getTotalWorkoutSeconds();
    const groupCount = config.groups.length;
    const label = groupCount === 1 ? '1 Group' : `${groupCount} Groups`;

    document.getElementById('summaryText').innerHTML =
        `<span class="summary-meta">${label} x ${config.rounds} Rounds</span><strong>Total Time: ${formatSummaryDuration(totalTime)}</strong>`;
}

function getTotalWorkoutSeconds() {
    let total = config.preparation;

    config.groups.forEach((group, groupIndex) => {
        total += group.work * config.rounds;

        const restRepeats = groupIndex === config.groups.length - 1
            ? Math.max(0, config.rounds - 1)
            : config.rounds;

        total += group.rest * restRepeats;
    });

    return total;
}

function adjustValue(scope, field, delta, groupId) {
    if (scope === 'config') {
        config[field] = clampValue(field, config[field] + delta);
    }

    if (scope === 'group') {
        const group = config.groups.find(item => item.id === groupId);
        if (!group) return;
        group[field] = clampValue(field, group[field] + delta);
    }

    renderConfig();
    savePreferences();
}

function addGroup() {
    config.groups.push(createGroup());
    renderConfig();
    savePreferences();
}

function deleteGroup(groupId) {
    if (config.groups.length === 1) {
        config.groups = [createGroup()];
    } else {
        config.groups = config.groups.filter(group => group.id !== groupId);
    }

    renderConfig();
    savePreferences();
}

function moveGroup(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;

    const fromIndex = config.groups.findIndex(group => group.id === fromId);
    const toIndex = config.groups.findIndex(group => group.id === toId);

    if (fromIndex === -1 || toIndex === -1) return;

    const [moved] = config.groups.splice(fromIndex, 1);
    config.groups.splice(toIndex, 0, moved);
    renderConfig();
    savePreferences();
}

function startHold(button) {
    stopHold();
    activeAdjustButton = button;
    triggerAdjustment(button);
    holdTimeout = setTimeout(() => {
        holdInterval = setInterval(() => {
            if (activeAdjustButton) triggerAdjustment(activeAdjustButton);
        }, 110);
    }, 450);
}

function stopHold() {
    if (holdTimeout) {
        clearTimeout(holdTimeout);
        holdTimeout = null;
    }

    if (holdInterval) {
        clearInterval(holdInterval);
        holdInterval = null;
    }

    activeAdjustButton = null;
}

function triggerAdjustment(button) {
    const scope = button.dataset.adjustScope;
    const field = button.dataset.field;
    const delta = Number(button.dataset.delta);
    const groupId = button.dataset.groupId;

    adjustValue(scope, field, delta, groupId);
}

// =============================================
// Workout Engine
// =============================================

function buildTimeline() {
    const timeline = [];

    if (config.preparation > 0) {
        timeline.push({
            phase: 'preparation',
            duration: config.preparation,
            label: 'Ready',
            round: 1,
            groupIndex: 0
        });
    }

    for (let round = 1; round <= config.rounds; round++) {
        config.groups.forEach((group, groupIndex) => {
            timeline.push({
                phase: 'work',
                duration: group.work,
                label: `Sport ${groupIndex + 1}`,
                round,
                groupIndex
            });

            const isLastPhase = round === config.rounds && groupIndex === config.groups.length - 1;
            if (group.rest > 0 && !isLastPhase) {
                timeline.push({
                    phase: 'rest',
                    duration: group.rest,
                    label: `Rest ${groupIndex + 1}`,
                    round,
                    groupIndex
                });
            }
        });
    }

    return timeline;
}

function applyPhase(index) {
    const current = state.timeline[index];
    if (!current) return;

    state.currentPhaseIndex = index;
    state.phase = current.phase;
    state.currentRound = current.round;
    state.currentGroup = current.groupIndex + 1;
    state.timeLeft = current.duration;
}

function startWorkout() {
    if (state.phase !== 'idle' && state.phase !== 'completed') return;

    state.timeline = buildTimeline();
    if (state.timeline.length === 0) return;

    playStartSound();
    state.paused = false;
    applyPhase(0);
    setPlayPauseButton(false);

    switchScreen('timerScreen', () => {
        updateTimerDisplay();
        startProgressRingAnimation();
        startTimer();
        requestWakeLock();
    });
}

function startTimer() {
    if (state.interval) {
        clearInterval(state.interval);
        state.interval = null;
    }

    state.interval = setInterval(() => {
        if (state.phase === 'idle' || state.phase === 'completed') {
            clearInterval(state.interval);
            state.interval = null;
            return;
        }

        if (state.paused) return;

        if (state.timeLeft <= 3 && state.timeLeft >= 1) playCountdownBeep();

        state.timeLeft--;
        if (state.timeLeft < 0) {
            nextPhase();
        } else {
            updateTimerDisplay();
        }
    }, 1000);
}

function nextPhase() {
    if (state.phase === 'idle' || state.phase === 'completed') return;

    const nextIndex = state.currentPhaseIndex + 1;
    if (nextIndex >= state.timeline.length) {
        completeWorkout();
        return;
    }

    playTransitionBeep();
    applyPhase(nextIndex);
    updateTimerDisplay();
    startProgressRingAnimation();
    startTimer();
}

function updateTimerDisplay() {
    const current = state.timeline[state.currentPhaseIndex];
    const next = state.timeline[state.currentPhaseIndex + 1];
    if (!current) return;

    setTimerPhaseTheme(current.phase);

    const phaseLabel = document.getElementById('phaseLabel');
    phaseLabel.textContent = current.label.toUpperCase();
    phaseLabel.className = `phase-label ${current.phase}`;

    const timerDisplay = document.getElementById('timerDisplay');
    timerDisplay.textContent = formatDisplayTime(state.timeLeft);

    document.getElementById('roundInfo').textContent = `${current.round}/${config.rounds}`;
    document.getElementById('nextPhase').textContent = next ? next.label : 'Done!';

    if (state.timeLeft === 0) {
        timerDisplay.classList.add('pulse');
        setTimeout(() => timerDisplay.classList.remove('pulse'), 1000);
    }
}

function startProgressRingAnimation() {
    const ring = document.getElementById('progressRing');
    const current = state.timeline[state.currentPhaseIndex];
    const circumference = 301.59;

    ring.style.transition = 'none';
    ring.style.strokeDashoffset = circumference;
    ring.getBoundingClientRect();

    if (state.paused || !current) return;

    ring.style.transition = `stroke-dashoffset ${current.duration}s linear`;
    ring.style.strokeDashoffset = 0;
}

function togglePause() {
    state.paused = !state.paused;
    const ring = document.getElementById('progressRing');

    if (state.paused) {
        const currentOffset = getComputedStyle(ring).strokeDashoffset;
        ring.style.transition = 'none';
        ring.style.strokeDashoffset = currentOffset;
    } else {
        ring.style.transition = `stroke-dashoffset ${state.timeLeft}s linear`;
        ring.style.strokeDashoffset = 0;
    }

    setPlayPauseButton(state.paused);
}

function stopWorkout() {
    if (state.interval) {
        clearInterval(state.interval);
        state.interval = null;
    }

    releaseWakeLock();
    resetWorkout();
}

function completeWorkout() {
    if (state.phase === 'completed') return;

    state.phase = 'completed';
    setTimerPhaseTheme(null);

    if (state.interval) {
        clearInterval(state.interval);
        state.interval = null;
    }

    releaseWakeLock();
    setTimeout(playCompletionSound, 500);
    switchScreen('completedScreen');
}

function resetWorkout() {
    if (state.interval) {
        clearInterval(state.interval);
        state.interval = null;
    }

    state.phase = 'idle';
    state.currentRound = 0;
    state.currentGroup = 0;
    state.timeLeft = 0;
    state.paused = false;
    state.timeline = [];
    state.currentPhaseIndex = -1;
    setTimerPhaseTheme(null);
    setPlayPauseButton(false);

    switchScreen('configScreen');
}

function restartWorkout() { startWorkout(); }
function skipPhase() {
    if (state.phase === 'idle' || state.phase === 'completed') return;
    nextPhase();
}

// =============================================
// Screen Transitions
// =============================================

function switchScreen(screenId, onComplete) {
    if (transitionTimeout) clearTimeout(transitionTimeout);

    const currentScreen = document.querySelector('.screen.active');
    const nextScreen = document.getElementById(screenId);
    const header = document.querySelector('header');

    const applyNextScreen = () => {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active', 'visible');
        });

        nextScreen.classList.add('active');

        if (screenId === 'timerScreen' || screenId === 'completedScreen') {
            header.classList.add('compact');
        } else {
            header.classList.remove('compact');
        }

        void nextScreen.offsetWidth;
        nextScreen.classList.add('visible');

        if (onComplete) onComplete();
    };

    if (currentScreen && currentScreen !== nextScreen) {
        currentScreen.classList.remove('visible');
        transitionTimeout = setTimeout(applyNextScreen, 250);
    } else {
        applyNextScreen();
    }
}

// =============================================
// Theme, Sound & Wake Lock
// =============================================

function updateThemeIcon() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';

    document.getElementById('themeToggle').innerHTML = isDark
        ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32.003" cy="32.005" r="16.001"/><path d="M12.001,31.997c0-2.211-1.789-4-4-4H4c-2.211,0-4,1.789-4,4s1.789,4,4,4h4C10.212,35.997,12.001,34.208,12.001,31.997z"/><path d="M12.204,46.139l-2.832,2.833c-1.563,1.562-1.563,4.094,0,5.656c1.562,1.562,4.094,1.562,5.657,0l2.833-2.832c1.562-1.562,1.562-4.095,0-5.657C16.298,44.576,13.767,44.576,12.204,46.139z"/><path d="M32.003,51.999c-2.211,0-4,1.789-4,4V60c0,2.211,1.789,4,4,4s4-1.789,4-4l-0.004-4.001C36.003,53.788,34.21,51.999,32.003,51.999z"/><path d="M51.798,46.143c-1.559-1.566-4.091-1.566-5.653-0.004s-1.562,4.095,0,5.657l2.829,2.828c1.562,1.57,4.094,1.562,5.656,0s1.566-4.09,0-5.656L51.798,46.143z"/><path d="M60.006,27.997l-4.009,0.008c-2.203-0.008-3.992,1.781-3.992,3.992c-0.008,2.211,1.789,4,3.992,4h4.001c2.219,0.008,4-1.789,4-4C64.002,29.79,62.217,27.997,60.006,27.997z"/><path d="M51.798,17.859l2.828-2.829c1.574-1.566,1.562-4.094,0-5.657c-1.559-1.567-4.09-1.567-5.652-0.004l-2.829,2.836c-1.562,1.555-1.562,4.086,0,5.649C47.699,19.426,50.239,19.418,51.798,17.859z"/><path d="M32.003,11.995c2.207,0.016,4-1.789,4-3.992v-4c0-2.219-1.789-4-4-4c-2.211-0.008-4,1.781-4,3.993l0.008,4.008C28.003,10.206,29.792,11.995,32.003,11.995z"/><path d="M12.212,17.855c1.555,1.562,4.079,1.562,5.646-0.004c1.574-1.551,1.566-4.09,0.008-5.649l-2.829-2.828c-1.57-1.571-4.094-1.559-5.657,0c-1.575,1.559-1.575,4.09-0.012,5.653L12.212,17.855z"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 11.5373 21.3065 11.4608 21.0672 11.8568C19.9289 13.7406 17.8615 15 15.5 15C11.9101 15 9 12.0899 9 8.5C9 6.13845 10.2594 4.07105 12.1432 2.93276C12.5392 2.69347 12.4627 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"/></svg>';

    document.getElementById('headerLogo').src = isDark ? 'images/logo-white.png' : 'images/logo-black.png';
    updateThemeColor();
}

function updateThemeColor() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const color = isDark ? '#111b34' : '#eef1f7';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', color);
}

function updateSoundIcon() {
    document.getElementById('soundToggle').innerHTML = soundEnabled
        ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 52"><path d="M 54.247 51.291 L 49.249 47.293 C 60.389 35.12 60.389 16.511 49.249 4.338 L 54.247 0.34 C 67.251 14.861 67.251 36.771 54.247 51.291 Z M 41.577 10.476 L 36.573 14.478 C 42.548 20.87 42.548 30.761 36.573 37.152 L 41.577 41.155 C 49.415 32.413 49.415 19.217 41.577 10.476 Z M 28.79 0 L 12.146 13.097 L 0 13.097 L 0 38.721 L 12.165 38.721 L 28.79 51.553 L 28.79 0 Z"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 59"><path d="M 7.069 0 L 44.844 37.775 L 45.659 38.591 L 53.087 46.018 L 57.721 50.652 L 61.522 54.454 L 56.992 58.983 L 28.79 30.781 L 28.79 55.42 L 12.165 42.589 L 0 42.589 L 0 16.964 L 12.146 16.964 L 13.728 15.719 L 2.539 4.53 L 7.069 0 Z M 54.247 4.207 C 64.418 15.563 66.634 31.44 60.895 44.767 L 55.948 39.819 C 59.532 29.158 57.299 17.001 49.249 8.204 L 54.247 4.207 Z M 41.577 14.343 C 45.875 19.136 47.816 25.269 47.401 31.272 L 40.008 23.879 C 39.284 21.941 38.184 20.108 36.708 18.492 L 36.573 18.345 L 41.577 14.343 Z M 28.79 3.867 L 28.79 12.662 L 23.868 7.74 L 28.79 3.867 Z"/></svg>';
}

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (error) {
        console.warn('Wake lock unavailable:', error);
    }
}

function releaseWakeLock() {
    if (wakeLock) {
        wakeLock.release().catch(() => { });
        wakeLock = null;
    }
}

// =============================================
// Events
// =============================================

document.addEventListener('pointerdown', event => {
    const adjustButton = event.target.closest('.adjust-btn');
    if (!adjustButton) return;

    event.preventDefault();
    startHold(adjustButton);
});

document.addEventListener('pointerup', stopHold);
document.addEventListener('pointercancel', stopHold);

document.addEventListener('click', event => {
    const addButton = event.target.closest('#addGroupBtn');
    if (addButton) {
        addGroup();
        return;
    }

    const deleteButton = event.target.closest('[data-delete-group]');
    if (deleteButton) {
        deleteGroup(deleteButton.dataset.deleteGroup);
    }
});

document.getElementById('groupsList').addEventListener('dragstart', event => {
    const row = event.target.closest('.exercise-row');
    if (!row) return;

    draggedGroupId = row.dataset.groupId;
    row.classList.add('dragging');
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', draggedGroupId);
    }
});

document.getElementById('groupsList').addEventListener('dragover', event => {
    const row = event.target.closest('.exercise-row');
    if (!row || !draggedGroupId) return;
    event.preventDefault();
});

document.getElementById('groupsList').addEventListener('drop', event => {
    const row = event.target.closest('.exercise-row');
    if (!row || !draggedGroupId) return;

    event.preventDefault();
    moveGroup(draggedGroupId, row.dataset.groupId);
    draggedGroupId = null;
});

document.getElementById('groupsList').addEventListener('dragend', () => {
    draggedGroupId = null;
    document.querySelectorAll('.exercise-row.dragging').forEach(row => row.classList.remove('dragging'));
});

document.getElementById('themeToggle').addEventListener('click', () => {
    const newTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    updateThemeIcon();
    savePreferences();
});

document.getElementById('soundToggle').addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    updateSoundIcon();
    savePreferences();
    if (soundEnabled) playSound(600, 0.1);
});

// =============================================
// Init
// =============================================

loadPreferences();
renderConfig();
updateThemeIcon();
updateSoundIcon();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope:', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}
