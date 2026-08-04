import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';

// ── VAPID setup ──────────────────────────────────────────────────
// These identify this server to the browser's push service (Chrome/Firefox
// etc route through their own push infrastructure — this is how they know
// the push came from us). Generate your own pair with:
//   npx web-push generate-vapid-keys
// and put them in server/.env — never commit real keys.
const VAPID_CONTACT_EMAIL_FALLBACK = 'mailto:admin@spotnplay.app';

let pushConfigured = null; // null = not checked yet, true/false once resolved

const ensureConfigured = () => {
  if (pushConfigured !== null) return pushConfigured;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (publicKey && privateKey) {
    webpush.setVapidDetails(process.env.VAPID_CONTACT_EMAIL || VAPID_CONTACT_EMAIL_FALLBACK, publicKey, privateKey);
    pushConfigured = true;
  } else {
    console.warn('⚠️  VAPID keys not set — push notifications (site-closed) are disabled. Notifications will still work in-app and cross-tab while the site is open.');
    pushConfigured = false;
  }
  return pushConfigured;
};

// Pushes one notification payload to every device/browser a user has
// subscribed from. Never throws — a push failure must never break the
// feature that triggered it. Automatically prunes subscriptions the
// browser has revoked (410 Gone / 404) so we don't keep retrying dead ones.
export const sendPushToUser = async (userId, payload) => {
  if (!ensureConfigured() || !userId) return;

  try {
    const subs = await PushSubscription.find({ user: userId });
    if (subs.length === 0) return;

    const body = JSON.stringify(payload);

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
            body
          );
        } catch (err) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await PushSubscription.deleteOne({ _id: sub._id });
          } else {
            console.error('Push send failed:', err?.message || err);
          }
        }
      })
    );
  } catch (err) {
    console.error('sendPushToUser() failed:', err.message);
  }
};

export const isPushConfigured = () => ensureConfigured();
export const getVapidPublicKey = () => (ensureConfigured() ? process.env.VAPID_PUBLIC_KEY : null);
