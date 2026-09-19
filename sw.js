// sw.js - Basic Service Worker for PWA

const CACHE_NAME = 'gurbani-nitnem-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/api.js',
    '/js/player.js',
    '/js/ui.js',
    '/js/app.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Mukta+Mahee:wght@400;600;800&display=swap',
    'https://unpkg.com/lucide@latest'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .catch(err => console.error('Cache error', err))
    );
});

self.addEventListener('fetch', event => {
    // Only cache GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cache if available, else fetch network
                return response || fetch(event.request).catch(() => {
                    // Offline fallback if needed
                });
            })
    );
});
