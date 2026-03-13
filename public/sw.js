const CACHE_VERSION = 'v11'; // Bump on each deploy
const CACHE_NAME = `panpu-todo-${CACHE_VERSION}`;

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/utils.js',
    '/js/app.js',
    '/js/api.js',
    '/js/ambient.js',
    '/js/views/daily.js',
    '/js/views/monthly.js',
    '/js/views/checkin.js',
    '/js/views/stats.js',
    '/js/views/garden.js',
    '/js/components/task-modal.js',
    '/js/components/ics-import.js',
    '/js/components/pomodoro.js',
    '/manifest.json',
    '/img/panpan.png',
    '/img/pupu.png',
    '/img/all.png',
    '/img/taofa.png',
    '/img/cat-coin.png',
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
