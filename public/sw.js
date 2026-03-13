const CACHE_VERSION = 'v7'; // Bump on each deploy
const CACHE_NAME = `panpu-todo-${CACHE_VERSION}`;

// Static assets (cache-first)
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
    '/img/icon-192.png',
    '/img/icon-512.png',
];

// Install — cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        })
    );
    self.clients.claim();
});

// Fetch — different strategies for different resource types
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET and API/socket requests
    if (event.request.method !== 'GET' || url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
        return;
    }

    // HTML pages: network-first (get latest version)
    if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request).then(cached => {
                        return cached || caches.match('/');
                    });
                })
        );
        return;
    }

    // Static assets (JS, CSS, images): cache-first, fallback to network
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            });
        }).catch(() => {
            // Ultimate fallback for navigation
            if (event.request.mode === 'navigate') {
                return caches.match('/');
            }
        })
    );
});
