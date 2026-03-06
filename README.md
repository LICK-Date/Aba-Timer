<div align="center">

<img src="images/logo-round.png" alt="Tabata Timer Logo" width="100" />

# Tabata Timer

**A simple, fast, and distraction-free Tabata interval timer for your workouts.**

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-10b981.svg)](https://devilquest.github.io/TabataTimer/)
![PWA](https://img.shields.io/badge/PWA-Ready-3b82f6.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-f59e0b.svg)](LICENSE)

🌐 **[Try it live → devilquest.github.io/TabataTimer](https://devilquest.github.io/TabataTimer/)**

</div>

---

## 🏋️ What is this?

**Tabata** is a form of high-intensity interval training (HIIT). A standard Tabata session consists of **8 rounds** of **20 seconds of intense exercise** followed by **10 seconds of rest** — totalling just 4 minutes of pure effort.

This app is a **clean, no-nonsense timer** built to help you focus entirely on your workout. No ads, no sign-ups, no distractions. Just set your intervals, hit start, and go.

---

## ✨ Features

- ⚙️ **Fully customizable** — set your own preparation time, work time, rest time, and number of rounds
- 🔔 **Audio cues** — beeps for countdowns, phase transitions, and workout completion
- 📊 **Visual progress ring** — a smooth circular timer so you always know how much time is left
- 🌗 **Dark & Light mode** — pick the theme that suits your gym or your screen
- 💾 **Settings saved automatically** — your configuration is remembered between sessions
- 📴 **Works offline** — fully functional without an internet connection (PWA)
- 📲 **Installable on any device** — add it to your home screen like a native app

---

## 🚀 How to Use

1. **Set your intervals** using the `+` / `−` buttons on the main screen.
   - **Preparation:** warm-up countdown before the first round starts
   - **Work:** the duration of each effort interval
   - **Rest:** recovery time between rounds
   - **Rounds:** total number of work/rest cycles
2. The **summary panel** shows you the total workout time before you begin.
3. Press **Start Workout** and follow the on-screen timer and audio cues.
4. During the workout, you can **pause**, **skip** the current phase, or **stop** at any time.
5. When all rounds are done, a completion screen (and a little melody 🎶) will let you know you're finished.

> **Tip:** You can install this app on your phone by tapping *"Add to Home Screen"* in your browser — it works just like a native app, even offline!

---
---

## 🛠️ Technical Documentation

This section is intended for developers who want to understand, modify, or self-host this project.

### Tech Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 (Semantic) |
| Styling | Vanilla CSS3 (Custom Properties, CSS Grid, Flexbox) |
| Logic | Vanilla JavaScript (ES6+) |
| Audio | Web Audio API |
| Offline | Service Worker + Cache API |
| Installable | Web App Manifest (PWA) |

> No frameworks, no build tools, no dependencies. Zero `npm install` required.

---

### Project Structure

```
/
├── index.html          # Single-page application shell
├── manifest.json       # PWA manifest (name, icons, theme, display mode)
├── sw.js               # Service Worker (offline caching strategy)
├── css/
│   └── styles.css      # All styles — theming, layout, animations
├── js/
│   └── main.js         # All application logic
└── images/
    ├── favicon.ico
    ├── logo.png
    ├── logo-white.png
    └── logo-black.png
```

---

### Architecture Overview

This is a **single-page application (SPA)** with no routing library. Three screens are rendered in the DOM simultaneously and toggled via CSS classes:

- `#configScreen` — workout configuration (default active screen)
- `#timerScreen` — live countdown timer
- `#completedScreen` — post-workout summary

Screen transitions use a CSS `opacity` fade (250ms) managed by the `switchScreen()` function.

---

### Core JavaScript

All logic lives in `js/main.js` and is organized around a few key areas:

#### State Management
The application uses two plain objects to manage its state:

```js
// Static configuration (user-defined, persisted to localStorage)
const config = { preparation, work, rest, rounds };

// Dynamic runtime state (updated every second during workout)
let state = { phase, currentRound, timeLeft, paused, interval };
```

#### Timer Engine
The timer is driven by a standard `setInterval` at 1-second resolution. On each tick:
1. Countdown beeps play for the last 3 seconds of any phase.
2. `timeLeft` is decremented.
3. When it hits 0, `nextPhase()` is called to transition the state machine.

The **phase state machine** follows this flow:

```
[preparation] → [work] → [rest] → [work] → ... → [work] → [completed]
```

If preparation or rest time is set to `0`, those phases are skipped automatically.

#### Progress Ring Animation
The circular progress indicator is an SVG `<circle>` animated via CSS `stroke-dashoffset`. Instead of updating it every second (which would be janky), a **single CSS transition** is applied for the full duration of the phase:

```js
ring.style.transition = `stroke-dashoffset ${total}s linear`;
ring.style.strokeDashoffset = 0;
```

On pause, the current computed `strokeDashoffset` is captured and the transition is frozen. On resume, a new transition is applied for the remaining `timeLeft`.

#### Audio (Web Audio API)
All sounds are generated programmatically — no audio files are used. The `playSound(frequency, duration)` function creates an `OscillatorNode` connected to a `GainNode` with an exponential ramp for a natural fade-out. The `AudioContext` is initialized lazily on the first user interaction to comply with browser autoplay policies.

#### Persistence (localStorage)
User preferences (config values, theme, sound state) are saved to `localStorage` on every change and loaded on page init via `loadPreferences()`.

#### Screen Wake Lock API
During an active workout, the app requests a `WakeLock` via the [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API) to prevent the device from sleeping. The lock is released when the workout ends or is stopped.

---

### Progressive Web App (PWA)

The app is a fully compliant PWA:

- **`manifest.json`** — defines the app name, icons, theme color, and `standalone` display mode (removes the browser UI when installed).
- **`sw.js`** — implements a **cache-first** strategy. On install, all static assets are pre-cached. Subsequent requests are served from cache, falling back to the network if a resource is not found.

```
Install  → Cache all static assets
Fetch    → Cache hit? Serve from cache : fetch from network
Activate → Delete stale caches from previous versions
```

---

### How to Run Locally

No build step, no dependencies, no terminal required.

**Option 1 — Just open the file (recommended for most cases)**

Double-click `index.html` to open it directly in your browser. The timer will work fully. This is the simplest way to use or test the app locally.

**Option 2 — Local HTTP server (required for PWA/Service Worker)**

The Service Worker (offline support, installability) requires the page to be served over `http://` — it will not register when opened via `file://`. If you want to test PWA features, use any static server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (npx)
npx serve .

# Using VS Code
# Install the "Live Server" extension and click "Go Live"
```

Then open `http://localhost:8000` in your browser.

---

### Browser Compatibility

The app relies on standard modern web APIs and is compatible with all current major browsers:

| Feature | Chrome | Firefox | Safari | Edge |
|---|---|---|---|---|
| Core Timer | ✅ | ✅ | ✅ | ✅ |
| Web Audio API | ✅ | ✅ | ✅ | ✅ |
| Service Worker / PWA | ✅ | ✅ | ✅ | ✅ |
| Screen Wake Lock API | ✅ | ✅ | ⚠️ Partial | ✅ |
| CSS Custom Properties | ✅ | ✅ | ✅ | ✅ |

> The Screen Wake Lock API has limited support on some iOS versions. The app degrades gracefully — the timer continues to function normally, but the screen may turn off during workouts on affected devices.

---

## 📋 Changelog

### [1.0.0]
Initial release.

- ⚙️ Configurable preparation, work, rest time and number of rounds
- 📊 Circular progress ring with smooth CSS animation
- 🔔 Procedural audio cues via Web Audio API (countdown beeps, phase transitions, completion melody)
- 🌗 Dark and light theme with persistent preference
- 💾 Settings saved to localStorage
- 📲 PWA support — installable and fully offline-capable via Service Worker
- 🔒 Screen Wake Lock to prevent device sleep during workouts

---

## ⚖️ License

Copyright (c) 2026 Devilquest — [MIT License](LICENSE)

---

<br>

## :heart: Donations
**If you enjoy this project, any support is greatly appreciated!**  

<a href="https://www.buymeacoffee.com/devilquest" target="_blank"><img src="https://i.imgur.com/RHHFQWs.png" alt="Buy Me A Dinosaur"></a>