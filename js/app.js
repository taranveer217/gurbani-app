// app.js

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // Initialize UI Data
    window.UI.renderHomeHukamnama();
    window.UI.renderNitnemLists(); // Updated function name
    window.UI.renderKirtanStations();
    window.UI.renderContinueListening();

    // Register Service Worker for Offline Caching
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').then(registration => {
                console.log('SW registered for offline support: ', registration.scope);
            }).catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
        });
    }
});
