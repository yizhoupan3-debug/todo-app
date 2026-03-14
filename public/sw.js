const CACHE_VERSION = 'v40'; // Bump on each deploy
const CACHE_NAME = `panpu-todo-${CACHE_VERSION}`;

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/style.css?v=40',
    '/css/base.css?v=40',
    '/css/checkin.css?v=40',
    '/css/pomodoro-stats.css?v=40',
    '/css/garden.css?v=40',
    '/js/utils.js?v=40',
    '/js/app.js?v=40',
    '/js/app-theme.js?v=40',
    '/js/app-persona-nav.js?v=40',
    '/js/app-coins.js?v=40',
    '/js/widget-installer.js?v=40',
    '/js/api.js?v=40',
    '/js/ambient.js?v=40',
    '/js/views/daily.js?v=40',
    '/js/views/monthly.js?v=40',
    '/js/views/checkin.js?v=40',
    '/js/views/stats.js?v=40',
    '/js/views/garden.js?v=40',
    '/js/views/garden-island.js?v=40',
    '/js/views/garden-shop.js?v=40',
    '/js/components/task-modal.js?v=40',
    '/js/components/ics-import.js?v=40',
    '/js/components/pomodoro.js?v=40',
    '/manifest.json',
    '/img/panpan.png',
    '/img/pupu.png',
    '/img/all.png',
    '/img/taofa.png',
    '/img/meow-coin.png?v=4',
    '/img/icon-48.png',
    '/img/icon-96.png',
    '/img/icon-144.png',
    '/img/icon-180.png',
    '/img/icon-192.png',
    '/img/icon-512.png',
    '/img/icon-maskable-192.png',
    '/img/icon-maskable-512.png',
];

// Install — pre-cache static assets for offline use
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting(); // Activate immediately
});

// Activate — delete ALL old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        })
    );
    self.clients.claim(); // Take control immediately
});

// Fetch — NETWORK-FIRST for everything
// Always try network first; only fall back to cache when offline
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET and API/socket requests
    if (event.request.method !== 'GET' || url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Got network response — update cache and return
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            })
            .catch(() => {
                // Network failed (offline) — fall back to cache
                return caches.match(event.request).then(cached => {
                    if (cached) return cached;
                    // Ultimate fallback for navigation
                    if (event.request.mode === 'navigate') {
                        return caches.match('/');
                    }
                });
            })
    );
});
