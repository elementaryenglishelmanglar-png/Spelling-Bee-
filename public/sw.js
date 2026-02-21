const CACHE_NAME = 'spelling-bee-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/bee.png' // Additional assets will be cached dynamically as they are parsed
];

// Install event: cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event: stale-while-revalidate strategy
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    // For API calls or external resources (like supabase or CDN modules), bypass cache 
    // or use a different strategy. Let's just handle same-origin or known safe requests here.
    const url = new URL(event.request.url);
    if (!url.protocol.startsWith('http')) return;

    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            const cachedResponse = await cache.match(event.request);

            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // Only cache good responses
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    cache.put(event.request, networkResponse.clone());
                }
                return networkResponse;
            }).catch(() => {
                // If network fails and we have no cache, we might want to return an offline page here
                // For now, it will just fail gracefully
            });

            // Return the cached response immediately if there is one, and kick off a network request
            // in the background to update the cache for the *next* time.
            return cachedResponse || fetchPromise;
        })
    );
});
