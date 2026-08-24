import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Gamepad2, Monitor, Trophy, Users, MapPin, Flame } from 'lucide-react';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import EventCard from '../components/events/EventCard.jsx';
import LiveRequestCard from '../components/LiveRequestCard.jsx';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { EVENT_STYLES } from '../components/events/eventStyles.js';
import { ESPORTS_GAMES, ESPORTS_PLATFORMS, ESPORTS_FORMATS } from '../components/events/eventConstants.js';

// The esports home — one page for gamers: live squad requests, upcoming
// esports events and a clear path to host their own lobby. Everything here
// filters on game (BGMI, Valorant, …) + platform + format, the vocabulary
// esports players actually think in.

const ESPORTS_HUB_STYLES = `
  .hub-hero {
    position: relative; overflow: hidden;
    border-radius: 24px; padding: 40px 32px;
    background: linear-gradient(135deg, rgba(74,222,128,0.12) 0%, rgba(6,6,6,0) 55%), #0b0f0d;
    border: 1px solid rgba(74,222,128,0.18);
    display: flex; flex-direction: column; gap: 14px;
  }
  .hub-hero h1 {
    font-family: 'Bebas Neue', cursive;
    font-size: clamp(44px, 8vw, 84px); line-height: 0.9;
    letter-spacing: 0.02em; color: #fff;
    display: flex; align-items: center; gap: 14px;
  }
  .hub-hero h1 .gamepad { color: #4ade80; }
  .hub-hero p { color: #9ca3af; font-size: 15px; max-width: 560px; line-height: 1.6; }
  .hub-chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .hub-game-chip {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12px; font-weight: 600; cursor: pointer;
    padding: 7px 14px; border-radius: 100px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.09);
    color: #9ca3af; transition: all 0.15s;
  }
  .hub-game-chip:hover { border-color: rgba(74,222,128,0.35); color: #e5e7eb; }
  .hub-game-chip.active { background: rgba(74,222,128,0.14); border-color: rgba(74,222,128,0.45); color: #4ade80; }
  .hub-section-title {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    margin: 28px 0 14px;
  }
  .hub-section-title h2 {
    font-size: 15px; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: #4ade80;
    display: flex; align-items: center; gap: 8px;
  }
  .hub-section-title .count {
    font-size: 11px; font-weight: 600; color: #6b7280;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
    padding: 2px 10px; border-radius: 100px;
  }
  .hub-request-card {
    border-radius: 18px;
    border: 1px solid rgba(74,222,128,0.14);
    background: linear-gradient(135deg, rgba(74,222,128,0.05) 0%, rgba(255,255,255,0.015) 100%);
    padding: 16px; cursor: pointer;
    transition: transform 0.18s ease, border-color 0.18s ease;
  }
  .hub-request-card:hover { transform: translateY(-2px); border-color: rgba(74,222,128,0.35); }
  .hub-request-card .req-game { font-weight: 700; font-size: 15px; color: #e5e7eb; }
  .hub-request-card .req-meta { font-size: 12px; color: #9ca3af; }
  .hub-cta-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px; }
  .hub-cta {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 13px; font-weight: 700;
    padding: 11px 18px; border-radius: 14px;
    background: rgba(74,222,128,0.12); border: 1px solid rgba(74,222,128,0.3);
    color: #4ade80; transition: all 0.15s;
  }
  .hub-cta:hover { background: rgba(74,222,128,0.2); transform: translateY(-1px); }
  .hub-cta.solid { background: #4ade80; border-color: #4ade80; color: #0a0a0a; }
  .hub-cta.solid:hover { background: #5eea94; }
  .hub-prize { color: #fbbf24; font-weight: 700; font-size: 12px; }
  .hub-stream { color: #60a5fa; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
  .hub-empty {
    border: 1px dashed rgba(255,255,255,0.12); border-radius: 16px;
    padding: 36px 20px; text-align: center; color: #6b7280; font-size: 13px;
  }
  .light .hub-hero { background: linear-gradient(135deg, rgba(74,222,128,0.12) 0%, rgba(0,0,0,0) 55%), #f6f7f2; border-color: rgba(74,222,128,0.3); }
  .light .hub-hero h1 { color: #111827; }
  .light .hub-hero p { color: #4b5563; }
  .light .hub-game-chip { background: rgba(0,0,0,0.03); border-color: rgba(0,0,0,0.09); color: #4b5563; }
  .light .hub-game-chip.active { background: rgba(74,222,128,0.14); border-color: rgba(74,222,128,0.5); color: #15803d; }
  .light .hub-section-title .count { background: rgba(0,0,0,0.03); border-color: rgba(0,0,0,0.08); color: #6b7280; }
  .light .hub-request-card { background: linear-gradient(135deg, rgba(74,222,128,0.05) 0%, rgba(0,0,0,0.015) 100%); border-color: rgba(74,222,128,0.25); }
  .light .hub-request-card .req-game { color: #111827; }
  .light .hub-empty { border-color: rgba(0,0,0,0.12); }
`;

const EsportsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeRequests } = useSocket();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gameFilter, setGameFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [formatFilter, setFormatFilter] = useState('');
  const [joiningId, setJoiningId] = useState(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = EVENT_STYLES + ESPORTS_HUB_STYLES;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  /* ── fetchers ── */
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ category: 'esports' });
      if (gameFilter) params.set('game', gameFilter);
      if (platformFilter) params.set('platform', platformFilter);
      const { data } = await API.get(`/events?${params.toString()}`);
      setEvents(data);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [gameFilter, platformFilter]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Esports squad requests — live from the socket context, filtered locally
  // by game/platform so the page updates instantly without refetching.
  const requests = useMemo(() => {
    const list = activeRequests.filter((r) => (r.sport || '').toLowerCase() === 'esports');
    if (gameFilter) return list.filter((r) => r.gameTitle === gameFilter);
    return list;
  }, [activeRequests, gameFilter]);

  // Local view of the same data used for the count badge + empty states
  /* ── request actions ── */
  const handleJoin = async (id) => {
    setJoiningId(id);
    try {
      await API.post(`/looking/${id}/join`);
    } catch {
      // socket events keep the list fresh; errors surface via toast-less flash below
    } finally {
      setJoiningId(null);
    }
  };

  const handleCancel = async (id) => {
    setJoiningId(id);
    try {
      await API.post(`/looking/${id}/cancel`);
    } catch {
      // ignore — socket removes the card
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="fixed inset-0 grid-dots pointer-events-none opacity-20" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[1px] bg-gradient-to-r from-transparent via-green-400/20 to-transparent pointer-events-none" />

      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* ── Hero ── */}
        <div className="g-anim-1 hub-hero">
          <h1><Gamepad2 className="gamepad" size={48} strokeWidth={1.5} /> ESPORTS HUB</h1>
          <p>
            Squad up, join a lobby or host a tournament. Filter by your game, platform and format —
            and go from <strong className="text-green-400">“anyone playing?”</strong> to a full lobby in minutes.
          </p>
          <div className="hub-cta-row">
            {user && (
              <a href="#squads" className="hub-cta solid"><Users size={15} /> Find a Squad</a>
            )}
            <a href="#events" className="hub-cta"><Trophy size={15} /> Upcoming Events</a>
            <Link to="/events" state={{ activeTab: 'create' }} className="hub-cta"><Flame size={15} /> Host a Lobby</Link>
            <Link to="/map" className="hub-cta"><MapPin size={15} /> Gamers Near Me</Link>
          </div>
        </div>

        {/* ── Game / platform / format filters ── */}
        <div className="g-anim-2 flex flex-col gap-3 mt-6">
          <div className="hub-chip-row">
            <button className={`hub-game-chip ${!gameFilter ? 'active' : ''}`} onClick={() => setGameFilter('')}>🎮 All Games</button>
            {ESPORTS_GAMES.map((game) => (
              <button key={game} className={`hub-game-chip ${gameFilter === game ? 'active' : ''}`} onClick={() => setGameFilter(gameFilter === game ? '' : game)}>
                {game}
              </button>
            ))}
          </div>
          <div className="flex gap-3 flex-wrap">
            <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="g-input" style={{ width: 'auto', minWidth: 150 }}>
              <option value="">All Platforms</option>
              {ESPORTS_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={formatFilter} onChange={(e) => setFormatFilter(e.target.value)} className="g-input" style={{ width: 'auto', minWidth: 150 }}>
              <option value="">All Formats</option>
              {ESPORTS_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            {(gameFilter || platformFilter || formatFilter) && (
              <button onClick={() => { setGameFilter(''); setPlatformFilter(''); setFormatFilter(''); }} className="text-gray-500 text-xs font-semibold hover:text-green-400" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                ✕ Clear filters
              </button>
            )}
          </div>
        </div>

        {/* ── Live squad requests ── */}
        <div id="squads" className="scroll-mt-20">
          <div className="hub-section-title g-anim-2">
            <h2><Users size={16} /> Live Squad Requests</h2>
            <span className="count">{requests.length} active</span>
          </div>
          {requests.length === 0 ? (
            <div className="hub-empty g-anim-2">
              {gameFilter
                ? `No one is looking for a ${gameFilter} squad right now. Be the first — post a request from the map page!`
                : 'No esports squad requests right now. Post one from the map page, or join the action on a tournament below.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 g-anim-3">
              {requests.map((request) => (
                <LiveRequestCard
                  key={request._id}
                  request={request}
                  onJoin={handleJoin}
                  onCancel={handleCancel}
                  joining={joiningId === request._id}
                  compact
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Upcoming esports events ── */}
        <div id="events" className="scroll-mt-20">
          <div className="hub-section-title g-anim-2">
            <h2><Trophy size={16} /> Upcoming Esports Events</h2>
            <span className="count">{events.length} tournaments</span>
          </div>
          {loading ? (
            <p className="text-gray-500 text-center py-10">Loading events…</p>
          ) : events.length === 0 ? (
            <div className="hub-empty g-anim-2">
              No upcoming esports events{gameFilter ? ` for ${gameFilter}` : ''} yet.
              <br />Host your own lobby — it goes live after a quick admin approval.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 g-anim-3">
              {events
                .filter((event) => !formatFilter || event.matchFormat === formatFilter)
                .map((event, i) => (
                  <EventCard key={event._id} event={event} animDelay={i * 0.05} onView={() => navigate(`/events/${event._id}`)} />
                ))}
            </div>
          )}
        </div>

        {/* ── Footer CTA ── */}
        <div className="hub-cta-row g-anim-3 mt-10">
          <Link to="/events" state={{ activeTab: 'create' }} className="hub-cta solid" style={{ padding: '13px 22px' }}>
            <Flame size={16} /> Host an Esports Event
          </Link>
          <Link to="/map" className="hub-cta" style={{ padding: '13px 22px' }}>
            <Monitor size={16} /> Find Gamers on the Map
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EsportsPage;
