import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import API from '../api/axios';

const fallback = {
  whatsappNumber: '',
  whatsappMessage: 'Hi SpotNPlay, I need help.',
};

const whatsappHref = (settings = fallback) => {
  const number = String(settings.whatsappNumber || '').replace(/[^\d]/g, '');
  if (!number) return '/collaborate';
  return `https://wa.me/${number}?text=${encodeURIComponent(settings.whatsappMessage || fallback.whatsappMessage)}`;
};

const WhatsAppCTA = () => {
  const [settings, setSettings] = useState(fallback);

  useEffect(() => {
    API.get('/site/settings').then(({ data }) => setSettings(data)).catch(() => {});
  }, []);

  return (
    <a
      href={whatsappHref(settings)}
      target={settings.whatsappNumber ? '_blank' : undefined}
      rel={settings.whatsappNumber ? 'noopener noreferrer' : undefined}
      className="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full bg-green-400 px-4 py-3 text-sm font-black text-black shadow-2xl shadow-green-400/20 transition-transform hover:-translate-y-1"
    >
      <MessageCircle size={18} /> WhatsApp
    </a>
  );
};

export { whatsappHref };
export default WhatsAppCTA;
