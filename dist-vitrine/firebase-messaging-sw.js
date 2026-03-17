/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyCuL0s6P1o2GDWTBzokMr4Sp2Pk8hEdgXQ",
    authDomain: "immo-dashboard-ci.firebaseapp.com",
    projectId: "immo-dashboard-ci",
    storageBucket: "immo-dashboard-ci.firebasestorage.app",
    messagingSenderId: "270527679044",
    appId: "1:270527679044:web:1c502b9aef393e58970a11"
});

const messaging = firebase.messaging();

// Handle background messages (when app is closed or in background)
messaging.onBackgroundMessage((payload) => {
    const { title, body, icon } = payload.notification || {};
    const data = payload.data || {};

    self.registration.showNotification(title || 'ImmoDash', {
        body: body || '',
        icon: icon || '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        data: { link: data.link || '/', type: data.type || 'default' },
        actions: [{ action: 'open', title: 'Ouvrir' }]
    });
});

// Handle notification click — open the app on the right page
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const link = event.notification.data?.link || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Focus existing tab if one is open
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    client.navigate(link);
                    return;
                }
            }
            // Otherwise open a new tab
            return clients.openWindow(link);
        })
    );
});
