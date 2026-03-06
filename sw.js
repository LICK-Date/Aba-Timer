// =============================================
// Service Worker Configuration
// =============================================

const CACHE_NAME = 'tabata-timer-v1';
const ASSETS = [
    './',
    'index.html',
    'css/styles.css',
    'js/main.js',
    'manifest.json',
    'images/logo.png',
    'images/logo-white.png',
    'images/logo-black.png',
    'images/favicon.ico'
];


// =============================================
// Lifecycle Events
// =============================================

/**
 * Install Event: Caches all static assets for offline use.
 * skipWaiting() ensures the new worker becomes active immediately.
 */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching assets');
                return cache.addAll(ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

/**
 * Activate Event: Cleans up old caches to save space.
 */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Clearing old cache');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

/**
 * Fetch Event: Network-first falling back to cache, or Cache-first.
 * Currently uses Cache-first for better performance and offline support.
 */
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});
