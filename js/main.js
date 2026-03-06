// =============================================
// Audio & Sound Effects
// =============================================

let audioContext;
let soundEnabled = true;

/**
 * Initializes the Web Audio API context for sound playback.
 */
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

/**
 * Plays a sine wave sound with specified frequency and duration.
 * @param {number} frequency - The frequency in Hz.
 * @param {number} duration - The duration in seconds.
 */
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

/**
 * Plays a short beep for countdown warnings (last 3 seconds).
 */
function playCountdownBeep() { playSound(600, 0.1); }

/**
 * Plays a beep indicating phase transition.
 */
function playTransitionBeep() { playSound(800, 0.35); }

/**
 * Plays a sound when the workout starts.
 */
function playStartSound() { playSound(440, 0.2); }

/**
 * Plays a celebratory melody when the workout is completed.
 */
function playCompletionSound() {
    playSound(523, 0.2);
    setTimeout(() => playSound(659, 0.2), 200);
    setTimeout(() => playSound(784, 0.2), 400);
    setTimeout(() => playSound(880, 0.3), 600);
    setTimeout(() => playSound(1047, 0.5), 900);
}

// =============================================
// Time Formatting Utilities
// =============================================

/**
 * Formats seconds into a readable time string for config display.
 * Handles cases over a minute by adding a colon.
 * @param {number} seconds - Time in seconds.
 * @returns {string} Formatted time (e.g., "1:30" or "45").
 */
function formatTime(seconds) {
    if (seconds >= 60) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return seconds.toString();
}

/**
 * Formats seconds into MM:SS format for timer display.
 * @param {number} seconds - Time in seconds.
 * @returns {string} Formatted time (e.g., "0:45").
 */
function formatDisplayTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}


// =============================================
// Global State & Configuration
// =============================================

const config = {
    preparation: 10,
    work: 20,
    rest: 10,
    rounds: 8
};

let state = {
    phase: 'idle',
    currentRound: 0,
    timeLeft: 0,
    paused: false,
    interval: null
};

// =============================================
// Configuration Adjustment Logic
// =============================================

let holdInterval = null;
let holdTimeout = null;

/**
 * Starts the hold-to-repeat action for adjusting config values.
 * @param {string} field - The config field to adjust.
 * @param {number} delta - The amount to change per tick.
 */
function startHold(field, delta) {
    adjustValue(field, delta);
    holdTimeout = setTimeout(() => {
        holdInterval = setInterval(() => {
            adjustValue(field, delta);
        }, 100);
    }, 500);
}

/**
 * Stops the hold-to-repeat action and clears intervals.
 */
function stopHold() {
    if (holdTimeout) { clearTimeout(holdTimeout); holdTimeout = null; }
    if (holdInterval) { clearInterval(holdInterval); holdInterval = null; }
}

document.querySelectorAll('.control-btn').forEach(btn => {
    const field = btn.getAttribute('data-field');
    const delta = parseInt(btn.getAttribute('data-delta'));
    btn.addEventListener('mousedown', () => startHold(field, delta));
    btn.addEventListener('mouseup', stopHold);
    btn.addEventListener('mouseleave', stopHold);
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startHold(field, delta);
    });
    btn.addEventListener('touchend', stopHold);
    btn.addEventListener('touchcancel', stopHold);
});

// =============================================
// Local Storage & Persistence
// =============================================

/**
 * Loads user preferences from localStorage and applies them.
 * Ensures the app state is consistent with the user's last session.
 */
function loadPreferences() {
    const saved = localStorage.getItem('tabataConfig');
    if (saved) {
        Object.assign(config, JSON.parse(saved));
        updateConfigDisplay();
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

/**
 * Saves current preferences to localStorage.
 */
function savePreferences() {
    localStorage.setItem('tabataConfig', JSON.stringify(config));
    localStorage.setItem('soundEnabled', soundEnabled);
    localStorage.setItem('theme', document.body.getAttribute('data-theme'));
}

/**
 * Updates the configuration screen with current config values.
 */
function updateConfigDisplay() {
    document.getElementById('preparationValue').textContent = formatTime(config.preparation) + (config.preparation >= 60 ? '' : 's');
    document.getElementById('workValue').textContent = formatTime(config.work) + (config.work >= 60 ? '' : 's');
    document.getElementById('restValue').textContent = formatTime(config.rest) + (config.rest >= 60 ? '' : 's');
    document.getElementById('roundsValue').textContent = config.rounds;
    updateSummary();
}

/**
 * Adjusts a config value by the given delta with min value validation.
 * @param {string} field - The config field to adjust.
 * @param {number} delta - The amount to change.
 */
function adjustValue(field, delta) {
    if (field === 'rounds') {
        config[field] = Math.max(1, config[field] + delta);
    } else if (field === 'work') {
        config[field] = Math.max(5, config[field] + delta);
    } else {
        config[field] = Math.max(0, config[field] + delta);
    }
    updateConfigDisplay();
    savePreferences();
}

/**
 * Updates the workout summary text with total time calculation.
 */
function updateSummary() {
    const totalTime = config.preparation + (config.work + config.rest) * (config.rounds - 1) + config.work;
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    const workDisplay = formatTime(config.work) + (config.work >= 60 ? '' : 's');
    const restDisplay = formatTime(config.rest) + (config.rest >= 60 ? '' : 's');
    document.getElementById('summaryText').innerHTML =
        `<strong>${config.rounds}</strong> rounds × (<strong>${workDisplay}</strong> work + <strong>${restDisplay}</strong> rest)<br>Total time: <strong>${timeStr}</strong>`;
}

// =============================================
// Screen Transitions & Navigation
// =============================================

/**
 * Switches the active screen with a fade transition.
 * Handles the logic for compacting the header in timer/completed states.
 * @param {string} screenId - The ID of the screen to show.
 * @param {Function} [onComplete] - Optional callback to run after the screen is active.
 */
let transitionTimeout;

function switchScreen(screenId, onComplete) {
    if (transitionTimeout) clearTimeout(transitionTimeout);

    const currentScreen = document.querySelector('.screen.active');
    const nextScreen = document.getElementById(screenId);
    const header = document.querySelector('header');

    const applyNextScreen = () => {
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
            s.classList.remove('visible');
        });

        nextScreen.classList.add('active');

        if (screenId === 'timerScreen' || screenId === 'completedScreen') {
            header.classList.add('compact');
        } else {
            header.classList.remove('compact');
        }

        // Force reflow to ensure CSS transition plays
        void nextScreen.offsetWidth;

        nextScreen.classList.add('visible');

        if (onComplete) onComplete();
    };

    if (currentScreen && currentScreen !== nextScreen) {
        currentScreen.classList.remove('visible');

        transitionTimeout = setTimeout(() => {
            applyNextScreen();
        }, 250);
    } else {
        applyNextScreen();
    }
}


// =============================================
// Workout Engine & Lifecycle
// =============================================

/**
 * Starts the workout, initializes state, and begins the timer.
 * Prevents multiple instances from starting simultaneously.
 */
function startWorkout() {
    if (state.phase !== 'idle' && state.phase !== 'completed') return;

    playStartSound();
    const startPhase = config.preparation > 0 ? 'preparation' : 'work';
    const startTime = config.preparation > 0 ? config.preparation : config.work;
    state = { phase: startPhase, currentRound: 1, timeLeft: startTime, paused: false, interval: null };

    switchScreen('timerScreen', () => {
        updateTimerDisplay();
        startProgressRingAnimation();
        startTimer();
        requestWakeLock();
    });
}

/**
 * Starts the countdown interval that decrements time each second.
 */
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
        if (state.timeLeft < 0) nextPhase();
        else updateTimerDisplay();
    }, 1000);
}

/**
 * Transitions to the next phase (preparation -> work -> rest -> work).
 */
function nextPhase() {
    if (state.phase === 'idle' || state.phase === 'completed') return;

    playTransitionBeep();
    if (state.phase === 'preparation') {
        state.phase = 'work';
        state.timeLeft = config.work;
    } else if (state.phase === 'work') {
        if (state.currentRound === config.rounds) { completeWorkout(); return; }
        if (config.rest > 0) { state.phase = 'rest'; state.timeLeft = config.rest; }
        else { state.currentRound++; state.phase = 'work'; state.timeLeft = config.work; }
    } else if (state.phase === 'rest') {
        state.currentRound++;
        state.phase = 'work';
        state.timeLeft = config.work;
    }
    updateTimerDisplay();
    startProgressRingAnimation();
    startTimer();
}

/**
 * Updates the timer UI (phase label, time, progress ring, round info).
 */
function updateTimerDisplay() {
    const phaseLabel = document.getElementById('phaseLabel');
    phaseLabel.textContent = state.phase.toUpperCase();
    phaseLabel.className = 'phase-label ' + state.phase;

    const timerDisplay = document.getElementById('timerDisplay');
    timerDisplay.textContent = formatDisplayTime(state.timeLeft);
    document.getElementById('roundInfo').textContent = `${state.currentRound}/${config.rounds}`;
    let nextText = state.phase === 'preparation' ? 'Work' : (state.phase === 'work' ? (state.currentRound === config.rounds ? 'Done!' : (config.rest > 0 ? 'Rest' : 'Work')) : 'Work');
    document.getElementById('nextPhase').textContent = nextText;

    if (state.timeLeft === 0) {
        timerDisplay.classList.add('pulse');
        setTimeout(() => {
            timerDisplay.classList.remove('pulse');
        }, 1000);
    }
}


/**
 * Starts the progress ring animation for the current phase.
 * Uses a single CSS transition for the entire phase duration for smooth animation.
 * The forcing of reflow (getBoundingClientRect) is necessary to restart the transition.
 */
function startProgressRingAnimation() {
    const ring = document.getElementById('progressRing');
    const total = state.phase === 'preparation' ? config.preparation : (state.phase === 'work' ? config.work : config.rest);
    const circumference = 301.59;

    ring.style.transition = 'none';
    ring.style.strokeDashoffset = circumference;

    ring.getBoundingClientRect();

    if (state.paused) return;

    ring.style.transition = `stroke-dashoffset ${total}s linear`;
    ring.style.strokeDashoffset = 0;
}

/**
 * Toggles between paused and running states.
 */
function togglePause() {
    state.paused = !state.paused;
    const btn = document.getElementById('playPauseBtn');
    const ring = document.getElementById('progressRing');

    if (state.paused) {
        const computedStyle = getComputedStyle(ring);
        const currentOffset = computedStyle.strokeDashoffset;
        ring.style.transition = 'none';
        ring.style.strokeDashoffset = currentOffset;
    } else {
        const total = state.phase === 'preparation' ? config.preparation : (state.phase === 'work' ? config.work : config.rest);
        const circumference = 301.59;
        ring.style.transition = `stroke-dashoffset ${state.timeLeft}s linear`;
        ring.style.strokeDashoffset = 0;
    }

    btn.innerHTML = state.paused ?
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M91.2 36.9c-12.4-6.8-27.4-6.5-39.6 .7S32 57.9 32 72l0 368c0 14.1 7.5 27.2 19.6 34.4s27.2 7.5 39.6 .7l336-184c12.8-7 20.8-20.5 20.8-35.1s-8-28.1-20.8-35.1l-336-184z"/></svg>' :
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M48 32C21.5 32 0 53.5 0 80L0 432c0 26.5 21.5 48 48 48l64 0c26.5 0 48-21.5 48-48l0-352c0-26.5-21.5-48-48-48L48 32zm224 0c-26.5 0-48 21.5-48 48l0 352c0 26.5 21.5 48 48 48l64 0c26.5 0 48-21.5 48-48l0-352c0-26.5-21.5-48-48-48l-64 0z"/></svg>';
}

/**
 * Stops the workout and returns to config screen.
 */
function stopWorkout() {
    if (state.interval) {
        clearInterval(state.interval);
        state.interval = null;
    }
    releaseWakeLock();
    resetWorkout();
}

/**
 * Marks workout as complete, shows completion screen.
 */
function completeWorkout() {
    if (state.phase === 'completed') return;
    state.phase = 'completed';

    if (state.interval) {
        clearInterval(state.interval);
        state.interval = null;
    }
    releaseWakeLock();
    setTimeout(playCompletionSound, 500);
    switchScreen('completedScreen');
}

/**
 * Resets workout state and returns to config screen.
 */
function resetWorkout() {
    if (state.interval) {
        clearInterval(state.interval);
        state.interval = null;
    }
    state.phase = 'idle';
    switchScreen('configScreen');
}

/**
 * Restarts the workout from the beginning.
 */
function restartWorkout() { startWorkout(); }

/**
 * Skips the current phase and moves to the next one.
 */
function skipPhase() {
    if (state.phase === 'idle' || state.phase === 'completed') return;
    nextPhase();
}

document.getElementById('themeToggle').addEventListener('click', () => {
    const newTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    updateThemeIcon();
    savePreferences();
});

// =============================================
// Theme & Branding Management
// =============================================

/**
 * Updates the theme toggle button icon based on current theme.
 */
function updateThemeIcon() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    document.getElementById('themeToggle').innerHTML = isDark ?
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32.003" cy="32.005" r="16.001"/><path d="M12.001,31.997c0-2.211-1.789-4-4-4H4c-2.211,0-4,1.789-4,4s1.789,4,4,4h4C10.212,35.997,12.001,34.208,12.001,31.997z"/><path d="M12.204,46.139l-2.832,2.833c-1.563,1.562-1.563,4.094,0,5.656c1.562,1.562,4.094,1.562,5.657,0l2.833-2.832c1.562-1.562,1.562-4.095,0-5.657C16.298,44.576,13.767,44.576,12.204,46.139z"/><path d="M32.003,51.999c-2.211,0-4,1.789-4,4V60c0,2.211,1.789,4,4,4s4-1.789,4-4l-0.004-4.001C36.003,53.788,34.21,51.999,32.003,51.999z"/><path d="M51.798,46.143c-1.559-1.566-4.091-1.566-5.653-0.004s-1.562,4.095,0,5.657l2.829,2.828c1.562,1.57,4.094,1.562,5.656,0s1.566-4.09,0-5.656L51.798,46.143z"/><path d="M60.006,27.997l-4.009,0.008c-2.203-0.008-3.992,1.781-3.992,3.992c-0.008,2.211,1.789,4,3.992,4h4.001c2.219,0.008,4-1.789,4-4C64.002,29.79,62.217,27.997,60.006,27.997z"/><path d="M51.798,17.859l2.828-2.829c1.574-1.566,1.562-4.094,0-5.657c-1.559-1.567-4.09-1.567-5.652-0.004l-2.829,2.836c-1.562,1.555-1.562,4.086,0,5.649C47.699,19.426,50.239,19.418,51.798,17.859z"/><path d="M32.003,11.995c2.207,0.016,4-1.789,4-3.992v-4c0-2.219-1.789-4-4-4c-2.211-0.008-4,1.781-4,3.993l0.008,4.008C28.003,10.206,29.792,11.995,32.003,11.995z"/><path d="M12.212,17.855c1.555,1.562,4.079,1.562,5.646-0.004c1.574-1.551,1.566-4.09,0.008-5.649l-2.829-2.828c-1.57-1.571-4.094-1.559-5.657,0c-1.575,1.559-1.575,4.09-0.012,5.653L12.212,17.855z"/></svg>' :
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 11.5373 21.3065 11.4608 21.0672 11.8568C19.9289 13.7406 17.8615 15 15.5 15C11.9101 15 9 12.0899 9 8.5C9 6.13845 10.2594 4.07105 12.1432 2.93276C12.5392 2.69347 12.4627 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"/></svg>';
    document.getElementById('headerLogo').src = isDark ? 'images/logo-white.png' : 'images/logo-black.png';
    updateThemeColor();
}

/**
 * Updates the theme-color meta tag to match the current theme.
 */
function updateThemeColor() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const color = isDark ? '#0f172a' : '#f0f2f5';
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
        themeColorMeta.setAttribute('content', color);
    }
}

document.getElementById('soundToggle').addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    updateSoundIcon();
    savePreferences();
    if (soundEnabled) playSound(600, 0.1);
});

// =============================================
// System & Browser Integration
// =============================================

/**
 * Updates the sound toggle button icon based on sound state.
 */
function updateSoundIcon() {
    document.getElementById('soundToggle').innerHTML = soundEnabled ?
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 52"><path d="M 54.247 51.291 L 49.249 47.293 C 60.389 35.12 60.389 16.511 49.249 4.338 L 54.247 0.34 C 67.251 14.861 67.251 36.771 54.247 51.291 Z M 41.577 10.476 L 36.573 14.478 C 42.548 20.87 42.548 30.761 36.573 37.152 L 41.577 41.155 C 49.415 32.413 49.415 19.217 41.577 10.476 Z M 28.79 0 L 12.146 13.097 L 0 13.097 L 0 38.721 L 12.165 38.721 L 28.79 51.553 L 28.79 0 Z"/></svg>' :
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64.0002 59"><path d="M 7.069 0 L 44.844 37.775 L 45.659 38.591 L 53.087 46.018 C 53.088 46.018 53.088 46.018 53.088 46.018 L 57.721 50.652 L 61.522 54.454 L 56.992 58.983 L 28.79 30.781 L 28.79 55.42 L 12.165 42.589 L 0 42.589 L 0 16.964 L 12.146 16.964 L 13.728 15.719 L 2.539 4.53 L 7.069 0 Z M 54.247 4.207 C 64.418 15.563 66.634 31.44 60.895 44.767 L 55.948 39.819 C 59.532 29.158 57.299 17.001 49.249 8.204 L 54.247 4.207 Z M 41.577 14.343 C 45.875 19.136 47.816 25.269 47.401 31.272 L 40.008 23.879 C 39.284 21.941 38.184 20.108 36.708 18.492 L 36.573 18.345 L 41.577 14.343 Z M 28.79 3.867 L 28.79 12.662 L 23.868 7.74 L 28.79 3.867 Z"/></svg>';
}

let wakeLock = null;

/**
 * Requests a screen wake lock to prevent device sleep during workout.
 */
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) { }
}

/**
 * Releases the screen wake lock when workout ends.
 */
function releaseWakeLock() {
    if (wakeLock) {
        wakeLock.release().catch(() => { });
        wakeLock = null;
    }
}

loadPreferences();
updateConfigDisplay();
updateThemeIcon();

// =============================================
// Initialization & PWA Support
// =============================================

/**
 * Registers the Service Worker for PWA functionality.
 * This allows the app to work offline and be installed on mobile devices.
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}