import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import EventCard from '../components/events/EventCard.jsx';
import CreateEventForm from '../components/events/CreateEventForm.jsx';
import MyEventsList from '../components/events/MyEventsList.jsx';
import { EVENT_STYLES } from '../components/events/eventStyles.js';
import { SPORTS, sportLabel } from '../components/events/eventConstants.js';
import { dataStore } from '../utils/dataStore';

const EventsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('explore');

  const [events, setEvents] = useState([]);
  const [joinedEvents, setJoinedEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);

  const [loading, setLoading] = useState(true);

  const [sportFilter, setSportFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState('success');

  /* ── inject styles ── */
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = EVENT_STYLES;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const flash = (msg, type = 'success') => {
    setMessage(msg);
    setMsgType(type);
    setTimeout(() => setMessage(''), 3500);
  };

  /* ── fetchers ── */
  const fetchExplore = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (sportFilter) params.set('sport', sportFilter);
      if (typeFilter) params.set('type', typeFilter);
      const isUnfiltered = !sportFilter && !typeFilter;
      const { data } = await API.get(`/events?${params.toString()}`);
      setEvents(data);
      if (isUnfiltered) dataStore.set('events:explore', data);
    } catch {
      setEvents([]);
    }
  }, [sportFilter, typeFilter]);

  const fetchJoined = useCallback(async () => {
    try {
      const { data } = await API.get('/events/joined');
      setJoinedEvents(data);
      dataStore.set('events:joined', data);
    } catch {
      setJoinedEvents([]);
    }
  }, []);

  const fetchMyEvents = useCallback(async () => {
    try {
      const { data } = await API.get('/events/my');
      setMyEvents(data);
      dataStore.set('events:my', data);
    } catch {
      setMyEvents([]);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchExplore(), fetchJoined(), fetchMyEvents()]);
  }, [fetchExplore, fetchJoined, fetchMyEvents]);

  /* ── initial load ── */
  useEffect(() => {
    const explore = dataStore.get('events:explore');
    const joined = dataStore.get('events:joined');
    const mine = dataStore.get('events:my');
    if (
      !sportFilter && !typeFilter &&
      explore.status === 'ready' && joined.status === 'ready' && mine.status === 'ready'
    ) {
      setEvents(explore.data);
      setJoinedEvents(joined.data);
      setMyEvents(mine.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    refreshAll().finally(() => setLoading(false));
  }, []);

  // re-fetch explore list when filters change
  useEffect(() => {
    fetchExplore();
  }, [sportFilter, typeFilter, fetchExplore]);

  /* ── navigate to detail page ── */
  const openEvent = (event) => {
    navigate(`/events/${event._id}`);
  };

  const tabs = [
    { id: 'explore', label: 'Explore', count: events.length },
    { id: 'joined', label: 'Joined', count: joinedEvents.length },
    { id: 'my', label: 'My Events', count: myEvents.length },
    { id: 'create', label: 'Create Event' },
  ];

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="fixed inset-0 grid-dots pointer-events-none opacity-20" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[1px] bg-gradient-to-r from-transparent via-green-400/20 to-transparent pointer-events-none" />

      <Navbar />

      {/* Toast */}
      {message && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 g-slideIn px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl whitespace-nowrap ${
          msgType === 'success'
            ? 'bg-green-400/15 border border-green-400/25 text-green-400'
            : 'bg-red-400/15 border border-red-400/25 text-red-400'
        }`}>
          {msgType === 'success' ? '✅' : '⚠️'} {message}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="g-anim-1 mb-8">
          <p className="text-green-400 text-xs uppercase tracking-[0.3em] mb-1">Community</p>
          <h1 className="font-bebas text-5xl md:text-6xl tracking-wide shimmer-text">EVENTS</h1>
          <p className="text-gray-500 text-sm mt-2">Discover, host, and join sports events near you.</p>
        </div>

        {/* Tabs */}
        <div className="g-anim-2" style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              data-tour={tab.id === 'explore' ? 'events-explore-tab' : tab.id === 'create' ? 'events-create-tab' : undefined}
              onClick={() => setActiveTab(tab.id)}
              className={`g-tab ${activeTab === tab.id ? 'g-tab-active' : 'g-tab-inactive'}`}
            >
              {tab.label}{typeof tab.count === 'number' ? ` (${tab.count})` : ''}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="g-anim-3">
          {activeTab === 'explore' && (
            <>
              <div className="flex gap-3 mb-5 flex-wrap">
                <select value={sportFilter} onChange={(e) => setSportFilter(e.target.value)} className="g-input" style={{ width: 'auto', minWidth: 150 }}>
                  <option value="">All Sports</option>
                  {SPORTS.map((s) => <option key={s} value={s}>{sportLabel(s)}</option>)}
                </select>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="g-input" style={{ width: 'auto', minWidth: 130 }}>
                  <option value="">Free & Paid</option>
                  <option value="free">Free Only</option>
                  <option value="paid">Paid Only</option>
                </select>
              </div>

              {loading ? (
                <p className="text-gray-500 text-center py-10">Loading events…</p>
              ) : events.length === 0 ? (
                <div className="ev-empty">
                  <span style={{ fontSize: 40 }}>📅</span>
                  <p className="text-gray-400">No upcoming events match your filters.</p>
                  <p className="text-gray-500 text-sm">Be the first to host one — switch to "Create Event"!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {events.map((event, i) => (
                    <EventCard key={event._id} event={event} animDelay={i * 0.05} onView={openEvent} />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'joined' && (
            joinedEvents.length === 0 ? (
              <div className="ev-empty">
                <span style={{ fontSize: 40 }}>🎟️</span>
                <p className="text-gray-400">You haven't joined any events yet.</p>
                <p className="text-gray-500 text-sm">Head over to "Explore" to find something to play!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {joinedEvents.map((event, i) => (
                  <EventCard key={event._id} event={event} animDelay={i * 0.05} onView={openEvent} />
                ))}
              </div>
            )
          )}

          {activeTab === 'my' && (
            <MyEventsList events={myEvents} onRefresh={refreshAll} flash={flash} onView={openEvent} />
          )}

          {activeTab === 'create' && (
            <CreateEventForm onCreated={() => { refreshAll(); setActiveTab('my'); }} flash={flash} />
          )}
        </div>
      </div>
    </div>
  );
};

export default EventsPage;