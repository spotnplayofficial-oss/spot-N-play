import express from 'express';
import QRCode from 'qrcode';
import { getBaileysStatus } from '../utils/whatsappService.js';

const router = express.Router();

// Allow anyone with server access to see status (could protect with admin later)
router.get('/status', (req, res) => {
  res.json(getBaileysStatus());
});

router.get('/qr', async (req, res) => {
  const { getBaileysStatus } = await import('../utils/whatsappService.js');
  // trigger lazy init if not yet started
  if (!getBaileysStatus().hasQR && !getBaileysStatus().ready) {
    // kick off Baileys by trying a dummy send (will generate QR)
    const { sendBgusInvites } = await import('../utils/whatsappService.js');
    sendBgusInvites({ teamName: 'init', captainMobile: '0000000000', players: [], ticketId: 'INIT' }, { title: 'init', _id: 'init' }).catch(()=>{});
    // wait a bit for QR
    for(let i=0;i<10;i++){
      if(getBaileysStatus().qr) break;
      await new Promise(r=>setTimeout(r,500));
    }
  }
  const status = getBaileysStatus();
  if (!status.qr) {
    if (status.ready) return res.status(200).json({ message: 'Already linked — Baileys ready, no QR needed' });
    return res.status(404).json({ message: 'No QR available yet — Baileys not enabled or still initializing. Check server logs.', status });
  }
  try {
    const png = await QRCode.toBuffer(status.qr, { width: 400, margin: 2 });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(png);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/qr-string', async (req, res) => {
  const { getBaileysStatus } = await import('../utils/whatsappService.js');
  const s = getBaileysStatus();
  res.json({ qr: s.qr || null, ready: s.ready, enabled: s.enabled });
});

export default router;
