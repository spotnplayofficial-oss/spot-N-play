import API from '../api/axios';

// Converts the VAPID public key (base64url string from the server) into the
// Uint8Array format pushManager.subscribe() requires.
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
};

export const isPushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;

// Registers the service worker (idempotent — safe to call on every load).
const registerServiceWorker = async () => {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch (err) {
    console.error('Service worker registration failed:', err);
    return null;
  }
};

// Full opt-in flow: register the service worker, ask for Notification
// permission if not already decided, then subscribe with the browser's
// push service and save the subscription on the server. Safe to call
// repeatedly — each step short-circuits if already done.
export const enablePushNotifications = async () => {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' };

  const registration = await registerServiceWorker();
  if (!registration) return { ok: false, reason: 'sw-failed' };

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, reason: 'denied' };
  } else if (Notification.permission !== 'granted') {
    return { ok: false, reason: 'denied' };
  }

  try {
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const { data } = await API.get('/push/vapid-key');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
    }

    await API.post('/push/subscribe', {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))),
      },
      userAgent: navigator.userAgent,
    });

    return { ok: true };
  } catch (err) {
    console.error('Push subscription failed:', err);
    return { ok: false, reason: 'subscribe-failed' };
  }
};

export const disablePushNotifications = async () => {
  if (!isPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await API.post('/push/unsubscribe', { endpoint: subscription.endpoint }).catch(() => {});
      await subscription.unsubscribe();
    }
  } catch (err) {
    console.error('Push unsubscribe failed:', err);
  }
};
