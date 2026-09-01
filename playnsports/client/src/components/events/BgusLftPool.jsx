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
        note: `BGUS LFT | BGMI:${bgmiId.trim()} | ${note.trim()} | Event:${event._id}`,
      });
      setBgmiId(''); setNote('');
      fetchRequests();
    } catch(err){ alert(err.response?.data?.message||'Failed to post'); }
    finally{ setPosting(false); }
  };

  const join = async (id) => {
    try { await API.post(`/looking/${id}/join`); fetchRequests(); } catch(err){ alert(err.response?.data?.message||'Join failed'); }
  };

  return (
    <div className="g-card g-anim-3 flex flex-col gap-4">
      <p className="ed-section-title" style={{marginBottom:0}}>Find Squad — Browse + Request Pool</p>
      <p className="text-xs text-gray-500">Solo / Duo / Trio looking to form a 4-player BGUS squad. Post your BGMI ID, browse others, and request to team up. No auto-match — captain assembles and then books as Squad via the form above.</p>
      {user && (
        <form onSubmit={postLft} className="flex flex-col gap-2 p-3 rounded-2xl border border-white/5 bg-black/5 dark:bg-white/[0.02]">
          <p className="text-xs font-bold text-green-400">Post — Looking for Team</p>
          <input value={bgmiId} onChange={e=>setBgmiId(e.target.value)} placeholder="Your BGMI ID *" className="g-input" required />
          <div className="grid grid-cols-2 gap-2">
            <select value={playersNeeded} onChange={e=>setPlayersNeeded(e.target.value)} className="g-input">
              <option value={3}>Need 3 (you +3 = Squad)</option>
              <option value={2}>Need 2 (Trio)</option>
              <option value={1}>Need 1 (Duo)</option>
            </select>
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Note e.g. IGL, Support" className="g-input" />
          </div>
          <button disabled={posting} className="g-btn-primary py-2 text-sm">{posting?'Posting…':'Post LFT'}</button>
        </form>
      )}
      <div className="flex flex-col gap-2">
        {loading ? <p className="text-xs text-gray-500">Loading pool…</p> : requests.length===0 ? <p className="text-xs text-gray-500">No one looking right now — be the first to post!</p> : requests.map(r=>(
          <div key={r._id} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02]">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{r.user?.name || 'Player'} — needs {r.playersNeeded} more</p>
              <p className="text-xs text-gray-500 truncate">{r.note || r.locationName} · {r.playersJoined?.length||0}/{r.playersNeeded} joined</p>
            </div>
            {r.user?._id !== user?._id && r.status==='active' && <button onClick={()=>join(r._id)} className="g-btn-secondary py-1 px-3 text-xs">Request</button>}
            {r.status==='full' && <span className="text-xs text-green-400">Full</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
