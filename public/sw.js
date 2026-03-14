const CACHE_VERSION = '__CACHE_VERSION__';
const CACHE_NAME = `panpu-todo-${CACHE_VERSION}`;

const STATIC_ASSETS = __PRECACHE_ASSETS__;

// Install — pre-cache static assets for offline use
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            await Promise.all(STATIC_ASSETS.map(async (asset) => {
                try {
                    await cache.add(asset);
                } catch (err) {
                    console.warn('[sw] precache failed:', asset, err);
                }
            }));
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
                if (!response || response.status >= 400 || response.type === 'opaque') {
                    return response;
                }
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
