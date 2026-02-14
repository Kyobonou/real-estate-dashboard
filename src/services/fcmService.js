import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getMessagingInstance, db } from '../firebase';

const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY;

/**
 * Initialize FCM: check support, request permission, get token, save to Firestore.
 * Returns the FCM token or null if anything fails.
 */
export async function initFCM(uid) {
    const messaging = await getMessagingInstance();

    if (!messaging) {
        console.warn('FCM: not supported in this browser');
        return null;
    }

    if (!VAPID_KEY) {
        console.warn('FCM: VITE_FCM_VAPID_KEY is not set');
        return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        console.warn('FCM: notification permission denied');
        return null;
    }

    try {
        // Register the FCM service worker
        const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: swRegistration
        });

        if (token) {
            await saveFcmToken(uid, token);
            return token;
        }

        console.warn('FCM: no token received');
        return null;
    } catch (error) {
        console.error('FCM: initialization failed', error);
        return null;
    }
}

/**
 * Save FCM token to Firestore user document.
 */
async function saveFcmToken(uid, token) {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
        fcmToken: token,
        fcmTokenUpdatedAt: serverTimestamp()
    });
}

/**
 * Listen for foreground messages. Returns an unsubscribe function.
 * Must be called after getMessagingInstance() resolves.
 */
export async function onForegroundMessage(callback) {
    const messaging = await getMessagingInstance();
    if (!messaging) return () => {};
    return onMessage(messaging, callback);
}

/**
 * Get the current notification permission state.
 * Returns 'granted', 'denied', 'default', or 'unsupported'.
 */
export function getNotificationPermission() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
}
