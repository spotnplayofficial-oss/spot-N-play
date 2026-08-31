/**
 * WhatsApp invite service — pluggable providers.
 *
 * Free OSS options supported:
 *  - Meta WhatsApp Cloud API (official) → env WHATSAPP_CLOUD_TOKEN + WHATSAPP_PHONE_NUMBER_ID
 *  - Baileys (WhiskeySockets/Baileys, WhatsApp Web) → WHATSAPP_BAILEYS_ENABLED=true
 *  - Mock (default) → logs + wa.me links, works on localhost with zero setup
 *
 * Usage: await sendBgusInvites({ teamName, captainName, captainMobile, captainBgmiId, players, ticketId }, event)
 */

const formatWaJid = (mobile) => {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  const intl = digits.length === 10 ? `91${digits}` : digits;
  return intl;
};

const buildInviteText = (team, event) => {
  const title = event.title || 'SpotNPlay event';
  return `🎮 *${title}* — You're invited!\n\nHi! Your squad *${team.teamName}* has been registered with ticket *${team.ticketId || ''}*.\nCaptain: ${team.captainName} (${team.captainBgmiId || 'BGMI ID pending'})\nVenue: ${event.venue || 'TBA'}\nDate: ${event.date || ''} ${event.startTime || ''}\n\nShow this ticket at check-in. Good luck! — Team SpotNPlay\nhttps://spot-n-play.com/events/${event._id}`;
};

const sendViaCloudApi = async (toDigits, text) => {
  const token = process.env.WHATSAPP_CLOUD_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return { skipped: true, reason: 'no cloud credentials' };
  const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to: toDigits,
    type: 'text',
    text: { preview_url: false, body: text },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `Cloud API ${res.status}`);
  return { ok: true, provider: 'cloud', id: data.messages?.[0]?.id };
};

// Baileys singleton — lazy init, QR printed to console + saved for API
let baileysSock = null;
let baileysReady = false;
let latestQR = null;
let baileysInitPromise = null;

const getBaileysSock = async () => {
  if (process.env.WHATSAPP_BAILEYS_ENABLED !== 'true') return null;
  if (baileysSock && baileysReady) return baileysSock;
  if (baileysInitPromise) {
    await baileysInitPromise;
    return baileysReady ? baileysSock : null;
  }
  baileysInitPromise = (async () => {
    try {
      const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = await import('@whiskeysockets/baileys');
      let qrcode = null;
      try { qrcode = (await import('qrcode-terminal')).default; } catch {}
      const { state, saveCreds } = await useMultiFileAuthState('./whatsapp_auth');
      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // we handle QR ourselves for cleaner logs + API
        browser: ['SpotNPlay', 'Chrome', '1.0'],
      });
      baileysSock = sock;
      sock.ev.on('creds.update', saveCreds);
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
          latestQR = qr;
          console.log('\n[whatsapp] Baileys QR code — scan with WhatsApp > Linked Devices > Link a device:\n');
          if (qrcode) qrcode.generate(qr, { small: true });
          else console.log(qr);
          console.log('\n[whatsapp] QR also available via GET /api/whatsapp/qr (if you add the route) — raw string length', qr.length);
        }
        if (connection === 'open') {
          baileysReady = true;
          latestQR = null;
          console.log('[whatsapp] Baileys connected ✅ Ready to send');
        }
        if (connection === 'close') {
          const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
          console.log('[whatsapp] Baileys disconnected', lastDisconnect?.error?.message || '', shouldReconnect ? '— reconnecting...' : '— logged out');
          baileysReady = false;
          baileysSock = null;
          baileysInitPromise = null;
          latestQR = null;
          if (shouldReconnect) {
            // auto-reconnect after a delay
            setTimeout(() => getBaileysSock().catch(() => {}), 3000);
          }
        }
      });
      // wait up to 60s for connection or QR
      for (let i = 0; i < 40; i++) {
        if (baileysReady) break;
        if (latestQR) break;
        await new Promise((r) => setTimeout(r, 500));
      }
      return sock;
    } catch (e) {
      console.warn('[whatsapp] Baileys init failed (mock fallback):', e.message);
      baileysInitPromise = null;
      return null;
    }
  })();
  await baileysInitPromise;
  // wait a bit more for ready if we have QR but not yet scanned
  if (latestQR && !baileysReady) {
    console.log('[whatsapp] Waiting for QR scan... (scan the QR above with your phone)');
    for (let i = 0; i < 60; i++) {
      if (baileysReady) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return baileysReady ? baileysSock : null;
};

export const getBaileysStatus = () => ({
  enabled: process.env.WHATSAPP_BAILEYS_ENABLED === 'true',
  ready: baileysReady,
  hasQR: !!latestQR,
  qr: latestQR,
});

const sendViaBaileys = async (toDigits, text) => {
  const sock = await getBaileysSock();
  if (!sock || !baileysReady) {
    // if we have QR but not ready, inform caller
    if (latestQR) throw new Error('Baileys not ready — scan QR first (see server logs or GET /api/whatsapp/qr)');
    return { skipped: true, reason: 'baileys not ready' };
  }
  const jid = `${toDigits}@s.whatsapp.net`;
  await sock.sendMessage(jid, { text });
  return { ok: true, provider: 'baileys' };
};

const sendSingleInvite = async (toMobile, text) => {
  const digits = formatWaJid(toMobile);
  if (!digits) return { ok: false, to: toMobile, error: 'invalid mobile' };
  // 1) try Cloud API
  try {
    const r = await sendViaCloudApi(digits, text);
    if (!r.skipped) return { ok: true, to: toMobile, ...r };
  } catch (e) {
    console.warn(`[whatsapp] cloud failed for ${toMobile}:`, e.message);
  }
  // 2) try Baileys
  try {
    const r = await sendViaBaileys(digits, text);
    if (!r.skipped) return { ok: true, to: toMobile, ...r };
  } catch (e) {
    console.warn(`[whatsapp] baileys failed for ${toMobile}:`, e.message);
    // fall through to mock — don't block booking if Baileys not linked
  }
  // 3) mock — log + wa.me link (free, no credentials)
  const waLink = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  console.log(`[whatsapp mock] → ${toMobile} (${digits}) :: ${text.slice(0, 80)}... | wa.me: ${waLink}`);
  return { ok: true, provider: 'mock', to: toMobile, waLink, mocked: true };
};

export const sendBgusInvites = async (team, event) => {
  const mobiles = [
    team.captainMobile,
    ...(team.players || []).map((p) => p.mobile),
  ].filter(Boolean);
  const uniq = [...new Set(mobiles.map((m) => String(m).trim()).filter(Boolean))];
  if (uniq.length === 0) return { sent: 0, results: [] };
  const text = buildInviteText(team, event);
  const results = [];
  for (const m of uniq) {
    try {
      const r = await sendSingleInvite(m, text);
      results.push(r);
    } catch (e) {
      results.push({ ok: false, to: m, error: e.message });
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  try {
    const mongoose = (await import('mongoose')).default;
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.collection('whatsappLogs').insertOne({
        eventId: event._id,
        eventTitle: event.title,
        teamName: team.teamName,
        ticketId: team.ticketId,
        recipients: uniq,
        results,
        createdAt: new Date(),
      });
    }
  } catch {}
  console.log(`[whatsapp] BGUS invites for ${team.teamName} (${team.ticketId}): ${results.filter(r=>r.ok).length}/${uniq.length} sent via ${results[0]?.provider || 'unknown'}`);
  return { sent: results.filter((r) => r.ok).length, total: uniq.length, results };
};

export default { sendBgusInvites, getBaileysStatus };
