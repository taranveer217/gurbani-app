// sw.js - Basic Service Worker for PWA

const CACHE_NAME = 'gurbani-nitnem-v3';
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
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .catch(err => console.error('Cache error', err))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then(keys => Promise.all(
            keys.filter(key => key.startsWith('gurbani-nitnem-') && key !== CACHE_NAME)
                .map(key => caches.delete(key))
            ))
        ])
    );
});

self.addEventListener('fetch', event => {
    // Only cache GET requests
    if (event.request.method !== 'GET') return;

    // The API layer validates freshness and owns its data cache. Never let the
    // app-shell service worker turn a live API request into stale data.
    if (new URL(event.request.url).hostname === 'api.gurbaninow.com') return;

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
