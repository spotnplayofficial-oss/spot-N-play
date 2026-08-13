import { useState } from 'react';
import API from '../../api/axios';

// Replaces "Organized by <creator>" on event / sub-event detail pages —
// players get a way to reach the admin team instead of the individual
// creator. Reuses the same POST /api/contact endpoint as the "Get in
// Touch" section on the home page.
const ContactAdminCard = ({ context = '' }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await API.post('/contact', { message: context ? `[${context}] ${message.trim()}` : message.trim() });
      setMessage('');
      setSent(true);
      setOpen(false);
      setTimeout(() => setSent(false), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ev-contact-admin-card g-anim-4">
      <div className="flex items-center gap-3">
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)',
        }}>
          🛟
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-gray-900 dark:text-white">Questions about this event?</p>
          <p className="text-gray-500 text-xs">Contact the spotNplay admin team — they handle all event support.</p>
        </div>
      </div>

      {sent && <p className="text-green-400 text-xs mt-3">✅ Sent — the admin team will get back to you.</p>}

      {open ? (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="g-input"
            rows={3}
            placeholder="What do you need help with?"
            maxLength={2000}
            required
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setOpen(false)} className="g-btn-secondary" style={{ flex: 1, fontSize: 13, padding: '9px' }}>Cancel</button>
            <button type="submit" disabled={submitting || !message.trim()} className="g-btn-primary" style={{ flex: 1, fontSize: 13, padding: '9px' }}>
              {submitting ? 'Sending…' : 'Send to Admin'}
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setOpen(true)} className="g-btn-secondary mt-3" style={{ width: '100%', fontSize: 13, padding: '9px' }}>
          ✉️ Contact Admin
        </button>
      )}
    </div>
  );
};

export default ContactAdminCard;
