import { useState, useEffect } from 'react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function BgusLftPool({ event }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bgmiId, setBgmiId] = useState('');
  const [playersNeeded, setPlayersNeeded] = useState(3);
  const [note, setNote] = useState('');
  const [posting, setPosting] = useState(false);

  const fetchRequests = async () => {
    try {
      const { data } = await API.get('/looking');
      const filtered = data.filter(r => (r.sport||'').toLowerCase().includes('bgmi') || (r.sport||'').toLowerCase().includes('esports') || r.note?.toLowerCase().includes('bgus'));
      setRequests(filtered);
    } catch { setRequests([]); } finally { setLoading(false); }
  };
  useEffect(()=>{ fetchRequests(); }, []);

  const postLft = async (e) => {
    e.preventDefault();
    if(!bgmiId.trim()) return alert('Enter BGMI ID');
    setPosting(true);
    try {
      // Use current location fallback to LPU area if no geolocation
      const lat = 31.2550;
      const lng = 75.7037;
      await API.post('/looking', {
        sport: 'bgmi',
        lat, lng,
        locationName: 'LPU Esports Arena - BGUS',
        playersNeeded: Number(playersNeeded),
        scheduledFor: new Date(Date.now()+ 60*60*1000).toISOString(),
        duration: 60*24*7,
        bgmiId: bgmiId.trim(),
        note: `BGUS LFT | BGMI:${bgmiId.trim()} | ${note.trim()} | Event:${event._id}`,
      });
      setBgmiId(''); setNote('');
      fetchRequests();
    } catch(err){ alert(err.response?.data?.message||'Failed to post'); }
    finally{ setPosting(false); }
  };

  const [joinMsg, setJoinMsg] = useState('');
  const join = async (id) => {
    const bgmi = window.prompt('Enter your BGMI ID to join this squad:');
    if(!bgmi || !bgmi.trim()) return alert('BGMI ID is required to join');
    try {
      await API.post(`/looking/${id}/join`, { bgmiId: bgmi.trim() });
      setJoinMsg('✅ Request sent — you joined! Check notifications for updates');
      setTimeout(()=>setJoinMsg(''), 3000);
      fetchRequests();
    } catch(err){ alert(err.response?.data?.message||'Join failed'); }
  };

  return (
    <div className="g-card g-anim-3 flex flex-col gap-4">
      <p className="ed-section-title" style={{marginBottom:0}}>Find Squad — Browse + Request Pool</p>
      <p className="text-xs text-gray-500">Solo / Duo / Trio looking to form a 4-player BGUS squad. Post your BGMI ID, browse others, and request to team up. No auto-match — captain assembles and then books as Squad via the form above.</p>
      {joinMsg && <div className="rounded-xl px-3 py-2 text-xs" style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.2)',color:'#4ade80'}}>{joinMsg}</div>}
      {user && (
        <form onSubmit={postLft} className="flex flex-col gap-3 p-4 rounded-2xl border border-green-400/10 bg-gradient-to-br from-green-400/[0.04] to-transparent backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-green-400 flex items-center justify-center text-black text-xs font-black">+</div>
            <p className="text-sm font-bold text-white">Looking for Squad</p>
            <span className="ml-auto text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">BGMI • Squad (4)</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <input value={bgmiId} onChange={e=>setBgmiId(e.target.value)} placeholder="Your BGMI ID  •  e.g. 5123456789" className="g-input" required />
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Playstyle  •  e.g. IGL • Entry fragger • Support" className="g-input" />
          </div>
          <div className="flex items-center gap-2">
            <select value={playersNeeded} onChange={e=>setPlayersNeeded(e.target.value)} className="g-input" style={{flex:1}}>
              <option value={3}>Squad — 4 Players</option>
              <option value={2}>Trio — 3 Players</option>
              <option value={1}>Duo — 2 Players</option>
            </select>
            <button disabled={posting} className="g-btn-primary py-2 px-5 text-sm whitespace-nowrap">{posting?'Posting…':'Post'}</button>
          </div>
          <p className="text-[11px] text-gray-500 text-center">You’ll be visible to 370+ players • Others can request to join</p>
        </form>
      )}
      <div className="flex flex-col gap-2">
        {loading ? <p className="text-xs text-gray-500">Loading pool…</p> : requests.length===0 ? <p className="text-xs text-gray-500">No one looking right now — be the first to post!</p> : requests.map(r=>{
          const hasJoined = r.playersJoined?.some(p => (p._id||p).toString() === user?._id);
          const isOwner = r.user?._id === user?._id;
          const isMember = isOwner || hasJoined;
          const isFull = r.status==='full';
          return (
          <div key={r._id} className={`flex flex-col gap-2 p-3 rounded-xl border ${isFull && isMember ? 'border-green-400/30 bg-green-400/5' : 'border-white/5 bg-white/[0.02]'}`}>
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{r.user?.name || 'Player'} — needs {r.playersNeeded} more {isFull && isMember ? '· Auto-teamed ✅' : ''}</p>
                <p className="text-xs text-gray-500 truncate">{r.note || r.locationName} · {r.playersJoined?.length||0}/{r.playersNeeded} joined {hasJoined ? '· You joined ✅' : ''}</p>
                {isFull && isMember && <p className="text-[11px] text-green-400 mt-1">Squad: {[r.user?.name, ...(r.playersJoined||[]).map(p=>p.name||'Player')].join(', ')}</p>}
              </div>
              {!isOwner && !hasJoined && r.status==='active' && <button onClick={()=>join(r._id)} className="g-btn-secondary py-1 px-3 text-xs">Request</button>}
              {hasJoined && !isFull && <span className="text-xs text-green-400">Joined — auto-teamed</span>}
              {isFull && isMember && <button onClick={()=>{
                // Auto-fill BGUS squad booking with this auto-teamed 4 (including BGMI IDs)
                const parseBgmi = (note) => {
                  const m = String(note||'').match(/BGMI[:\s]*([0-9]+)/i);
                  return m ? m[1] : '';
                };
                const capBgmi = r.bgmiId || parseBgmi(r.note) || '';
                const squad = [
                  { ...r.user, bgmiId: capBgmi },
                  ...(r.playersJoined||[]).map((p,i)=>{
                    const info = r.playersJoinedInfo?.[i];
                    return { ...p, bgmiId: info?.bgmiId || '' };
                  })
                ];
                const teamName = `Squad of ${r.user?.name || 'BGUS'}`.slice(0,20);
                window.dispatchEvent(new CustomEvent('bgus-autoteam', { detail: { teamName, members: squad, requestId: r._id } }));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} className="g-btn-primary py-1 px-3 text-xs">Book BGUS as Squad</button>}
              {isFull && !isMember && <span className="text-xs text-gray-400">Full</span>}
            </div>
            {isFull && isMember && <p className="text-[11px] text-gray-400">Auto-teamed: all 4 are now a squad — captain can book BGUS in one click above. You’ll get the ticket + WhatsApp invite.</p>}
          </div>
        )})}
      </div>
    </div>
  );
}
