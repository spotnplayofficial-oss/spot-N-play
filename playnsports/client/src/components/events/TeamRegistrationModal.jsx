import { useState, useEffect } from 'react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const TeamRegistrationModal = ({ event, teamSize, price, initialTeam, onClose, onSubmit }) => {
  const isBgus = /bgus|battle\s*ground/i.test(event.title || '');
  const [selectedSize, setSelectedSize] = useState(teamSize || 4);
  const effectiveSize = isBgus ? selectedSize : teamSize;
  const others = Math.max(0, (effectiveSize || 0) - 1);
  const bgusPrice = (n) => (n === 4 ? 149 : 39 * n);
  const displayPrice = isBgus ? bgusPrice(effectiveSize) : (price ?? event.price);
  const [form, setForm] = useState(() => {
    if (initialTeam?.members?.length) {
      const mem = initialTeam.members;
      return {
        teamName: initialTeam.teamName || '',
        captainName: mem[0]?.name || '',
        captainMobile: mem[0]?.phone || mem[0]?.mobile || '',
        captainBgmiId: mem[0]?.bgmiId || '',
        players: mem.slice(1).map(m=>({ name: m.name||'', mobile: m.phone||m.mobile||'', bgmiId: m.bgmiId||'' })),
      };
    }
    return {
      teamName: '',
      captainName: '',
      captainMobile: '',
      captainBgmiId: '',
      players: Array.from({ length: others }, () => ({ name: '', mobile: '', bgmiId: '' })),
    };
  });

  const { user } = useAuth();
  // Auto-fill from joined LFT squad or current user profile
  useEffect(() => {
    if (!isBgus || initialTeam?.members?.length) return;
    let cancelled = false;
    (async () => {
      try {
        // Fill captain from current user
        if (user && !form.captainName) {
          setForm((prev) => prev.captainName ? prev : { ...prev, captainName: user.name || '', captainMobile: user.phone || prev.captainMobile });
        }
        // If user is part of a full BGUS LFT squad, pre-fill the 4
        const { data } = await API.get('/looking');
        const fullSquads = data.filter(r => r.status==='full' && (r.sport||'').toLowerCase().includes('bgmi') && (r.user?._id===user?._id || r.playersJoined?.some(p=> (p._id||p).toString()===user?._id)));
        if (fullSquads.length && !cancelled) {
          const squad = fullSquads[0];
          const members = [squad.user, ...(squad.playersJoined||[])].slice(0,4);
          const parseBgmi = (note) => {
            const m = String(note||'').match(/BGMI[:\s]*([0-9]+)/i);
            return m ? m[1] : '';
          };
          const cap = members[0];
          // Use stored bgmiId if available (new field), fallback to note parsing
          const capBgmi = squad.bgmiId || parseBgmi(squad.note) || '';
          const getJoinerBgmi = (idx) => {
            const info = squad.playersJoinedInfo?.[idx-1];
            return info?.bgmiId || '';
          };
          setForm({
            teamName: `Squad of ${cap?.name || user?.name || 'BGUS'}`.slice(0,20),
            captainName: cap?.name || user?.name || '',
            captainMobile: cap?.phone || cap?.mobile || user?.phone || '',
            captainBgmiId: capBgmi,
            players: members.slice(1).map((m,i)=>({ name: m.name||'', mobile: m.phone||m.mobile||'', bgmiId: getJoinerBgmi(i+1) })),
          });
          setSelectedSize(4);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [isBgus, initialTeam, user]);

  useEffect(() => {
    if (!isBgus) return;
    // Don't clobber auto-teamed pre-fill
    if (initialTeam?.members?.length) return;
    const needed = Math.max(0, effectiveSize - 1);
    setForm((prev) => {
      if (prev.players.length === needed) return prev;
      if (prev.players.length < needed) return { ...prev, players: [...prev.players, ...Array(needed - prev.players.length).fill(null).map(() => ({ name: '', mobile: '', bgmiId: '' }))] };
      return { ...prev, players: prev.players.slice(0, needed) };
    });
  }, [effectiveSize, isBgus, initialTeam]);
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
    if (form.players.length !== others) return setError(`This team needs exactly ${effectiveSize} players`);
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
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <form className="w-full max-w-xl rounded-[24px] p-0 max-h-[90vh] overflow-hidden flex flex-col" style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 80px rgba(0,0,0,0.65)' }} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="px-6 pt-6 pb-4" style={{ background: 'linear-gradient(135deg, rgba(74,222,128,0.12) 0%, transparent 60%)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-green-400 flex items-center justify-center text-black font-black text-sm">🎮</div>
            <div>
              <h2 className="text-[15px] font-black tracking-wide text-white" style={{ fontFamily: "'Bebas Neue', cursive", letterSpacing: 0.5 }}>{isBgus ? 'BGUS REGISTRATION' : 'REGISTER YOUR TEAM'}</h2>
              <p className="text-[11px] text-gray-400 -mt-1">{isBgus ? 'Squad (4) • BGMI ID required' : `${teamSize} players • One ticket`}</p>
            </div>
            <button type="button" onClick={onClose} className="ml-auto w-8 h-8 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center">✕</button>
          </div>
          <p className="text-xs font-semibold text-white/90 truncate">{event.title}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-green-400 text-black">₹39 / person</span>
            <span className="text-xs text-gray-400">Squad (4) <span className="text-white font-bold">₹149</span> <span className="text-green-400">Save ₹7</span></span>
          </div>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1 flex flex-col gap-4" style={{ background: '#0f0f0f' }}>
          {isBgus && (
            <div className="grid grid-cols-4 gap-2">
              {[1,2,3,4].map((n) => (
                <button key={n} type="button" onClick={() => setSelectedSize(n)} className={`py-3 rounded-2xl border text-center transition-all ${selectedSize===n ? 'bg-green-400 border-green-400 text-black shadow-lg shadow-green-400/20' : 'bg-white/[0.04] border-white/10 text-gray-400 hover:border-white/15'}`}>
                  <p className="text-xs font-black">{n===1?'Solo':n===2?'Duo':n===3?'Trio':'Squad'}</p>
                  <p className={`text-[11px] font-bold ${selectedSize===n ? 'text-black/70' : 'text-gray-500'}`}>₹{n===4?149:39*n}</p>
                  <p className={`text-[10px] ${selectedSize===n ? 'text-black/60' : 'text-gray-600'}`}>{n} player{n>1?'s':''}</p>
                </button>
              ))}
            </div>
          )}
          <p className="text-[11px] text-gray-500 text-center">{isBgus ? `${selectedSize===1?'Solo':selectedSize===2?'Duo':selectedSize===3?'Trio':'Squad'} • ${effectiveSize} player${effectiveSize>1?'s':''} • ₹${displayPrice} total • One ticket` : `${teamSize} players • ₹${price ?? event.price} per team`}</p>
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
            <button type="submit" disabled={loading} className="flex-[1.6] rf-btn" style={{ marginTop: 0 }}>{loading ? 'Registering…' : `Pay ₹${displayPrice} & Register`}</button>
          </div>
          <p className="text-[11px] text-center" style={{ color: '#6b7280' }}>You’ll be redirected to Razorpay to securely pay the entry fee.</p>
        </div>
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
