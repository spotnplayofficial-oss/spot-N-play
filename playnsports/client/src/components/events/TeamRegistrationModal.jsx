import { useState } from 'react';

const TeamRegistrationModal = ({ event, teamSize, price, onClose, onSubmit }) => {
  const isBgus = /bgus|battle\s*ground/i.test(event.title || '');
  const others = Math.max(0, (teamSize || 0) - 1);
  const [form, setForm] = useState({
    teamName: '',
    captainName: '',
    captainMobile: '',
    captainBgmiId: '',
    players: Array.from({ length: others }, () => ({ name: '', mobile: '', bgmiId: '' })),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setPlayer = (idx, field, value) => {
    setForm((prev) => {
      const next = [...prev.players];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, players: next };
    });
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    setError('');
    if (!form.teamName.trim()) return setError('Please enter a team name');
    if (!form.captainName.trim() || form.captainMobile.replace(/\D/g, '').length < 10) return setError('Please enter captain name and valid 10-digit mobile');
    if (isBgus && !form.captainBgmiId.trim()) return setError("Please enter captain's BGMI ID");
    if (form.players.length !== others) return setError(`This team needs exactly ${teamSize} players`);
    for (let i = 0; i < form.players.length; i++) {
      const p = form.players[i];
      if (!p.name.trim() || p.mobile.replace(/\D/g, '').length < 10) return setError(`Player ${i + 2}: enter name and valid 10-digit mobile`);
      if (isBgus && !p.bgmiId.trim()) return setError(`Player ${i + 2}: enter BGMI ID`);
    }
    setLoading(true);
    try {
      await onSubmit({
        teamName: form.teamName.trim(),
        captainName: form.captainName.trim(),
        captainMobile: form.captainMobile.trim(),
        ...(isBgus ? { captainBgmiId: form.captainBgmiId.trim() } : {}),
        players: form.players.map((p) => ({ name: p.name.trim(), mobile: p.mobile.trim(), ...(isBgus ? { bgmiId: p.bgmiId.trim() } : {}) })),
      });
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to register team — please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <form className="w-full max-w-xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--glass-bg, #101010)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 24px 80px rgba(0,0,0,0.55)' }} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 className="text-lg font-bold mb-1" style={{ fontFamily: "'Bebas Neue', cursive", letterSpacing: 1 }}>{isBgus ? 'BGUS SQUAD REGISTRATION' : 'REGISTER YOUR TEAM'} — {event.title?.toUpperCase()}</h2>
        <p className="text-xs mb-4" style={{ color: '#9ca3af' }}>{isBgus ? 'Squad only · 4 players · BGMI ID required · ₹39 per person · ₹149 per squad' : `${teamSize} players per team · Entry ₹${price ?? event.price} per team`} · One ticket covers whole team</p>
        {error && <div className="rounded-xl px-3 py-2 mb-4 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>⚠️ {error}</div>}

        <div className="flex flex-col gap-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: '#9ca3af' }}>Team Name *</span>
            <input value={form.teamName} onChange={(e) => setForm({ ...form, teamName: e.target.value })} placeholder="e.g. Thunder Strikers" className="rf-input" required />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest" style={{ color: '#9ca3af' }}>Captain Name *</span>
              <input value={form.captainName} onChange={(e) => setForm({ ...form, captainName: e.target.value })} placeholder="Captain full name" className="rf-input" required />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest" style={{ color: '#9ca3af' }}>Captain Mobile *</span>
              <input type="tel" value={form.captainMobile} onChange={(e) => setForm({ ...form, captainMobile: e.target.value })} placeholder="10-digit mobile" className="rf-input" required />
            </label>
          </div>
          {isBgus && (
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest" style={{ color: '#9ca3af' }}>Captain BGMI ID *</span>
              <input value={form.captainBgmiId} onChange={(e) => setForm({ ...form, captainBgmiId: e.target.value })} placeholder="e.g. 5123456789" className="rf-input" required />
            </label>
          )}

          <div className="mt-1">
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#9ca3af' }}>Other Players — {others} required {isBgus ? '(BGMI ID required)' : ''}</p>
            <div className="flex flex-col gap-2">
              {form.players.map((p, idx) => (
                <div key={idx} className={isBgus ? 'grid grid-cols-1 sm:grid-cols-3 gap-2' : 'grid grid-cols-1 sm:grid-cols-2 gap-2'}>
                  <input value={p.name} onChange={(e) => setPlayer(idx, 'name', e.target.value)} placeholder={`Player ${idx + 2} Name *`} className="rf-input" required />
                  <input type="tel" value={p.mobile} onChange={(e) => setPlayer(idx, 'mobile', e.target.value)} placeholder={`Player ${idx + 2} Mobile *`} className="rf-input" required />
                  {isBgus && <input value={p.bgmiId} onChange={(e) => setPlayer(idx, 'bgmiId', e.target.value)} placeholder={`BGMI ID *`} className="rf-input" required />}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold">Cancel</button>
            <button type="submit" disabled={loading} className="flex-[1.6] rf-btn" style={{ marginTop: 0 }}>{loading ? 'Registering…' : `Pay ₹${price ?? event.price} & Register`}</button>
          </div>
          <p className="text-[11px] text-center" style={{ color: '#6b7280' }}>You’ll be redirected to Razorpay to securely pay the entry fee.</p>
        </div>
      </form>
      <style>{`
        .rf-input { width: 100%; margin-top: 6px; padding: 10px 12px; border-radius: 12px; font-size: 13px; outline: none; color: inherit; font-family: 'DM Sans', sans-serif; background: rgba(127,127,127,0.08); border: 1px solid rgba(127,127,127,0.22); }
        .rf-input:focus { border-color: rgba(74,222,128,0.55); box-shadow: 0 0 0 3px rgba(74,222,128,0.08); }
        .rf-btn { width: 100%; padding: 12px; border-radius: 14px; font-weight: 700; font-size: 14px; background: linear-gradient(135deg, #4ade80, #16a34a); color: #052e12; font-family: 'DM Sans', sans-serif; cursor: pointer; }
        .rf-btn:disabled { opacity: 0.6; }
      `}</style>
    </div>
  );
};

export default TeamRegistrationModal;
