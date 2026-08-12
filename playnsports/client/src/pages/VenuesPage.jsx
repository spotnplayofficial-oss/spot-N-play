import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import API from '../api/axios';
import { dataStore } from '../utils/dataStore';

const FILTERS = [
  { id: 'all', label: 'All', dot: '⚪' },
  { id: 'ground', label: 'Grounds', dot: '🔵' },
  { id: 'social', label: 'Social', dot: '🟡' },
  { id: 'gym', label: 'Gyms', dot: '🟢' },
  { id: 'pool', label: 'Pools', dot: '🩵' },
];

// Venue(s) that should always be pinned to the top of the list.
// Add more ids/names here if you want to pin additional venues.
const PINNED_VENUE_IDS = ['6a72d7a2e82e77562697e008'];
const PINNED_VENUE_NAMES = ['fitness edge'];

const isPinned = (v) =>
  PINNED_VENUE_IDS.includes(v._id) ||
  PINNED_VENUE_NAMES.includes((v.name || '').trim().toLowerCase());

const sortWithPinnedFirst = (list) => {
  const pinned = [];
  const rest = [];
  list.forEach((v) => (isPinned(v) ? pinned.push(v) : rest.push(v)));
  return [...pinned, ...rest];
};

const VenuesPage = () => {
  const navigate = useNavigate();
  const [venues, setVenues] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = dataStore.get('venues:all');
    if (cached.status === 'ready') {
      setVenues(sortWithPinnedFirst(cached.data));
      setLoading(false);
      return;
    }
    dataStore.getOrFetch('venues:all', () => API.get('/venues').then((r) => r.data))
      .then((data) => setVenues(sortWithPinnedFirst(data)))
      .catch(() => setVenues([]))
      .finally(() => setLoading(false));
  }, []);

  const visible = filter === 'all' ? venues : venues.filter((v) => v.venueType === filter);

  const openVenue = (v) => {
    navigate(v.venueMode === 'live' ? `/grounds/${v._id}` : `/venues/${v._id}`);
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <h1 className="text-3xl sm:text-4xl mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.03em' }}>Venues</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Grounds, social grounds, gyms, and pools — all in one place</p>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`text-sm font-semibold rounded-xl px-4 py-2 border whitespace-nowrap transition-colors ${filter === f.id ? 'bg-green-400/15 border-green-400/30 text-green-500 dark:text-green-400' : 'border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-green-400/20'}`}
            >
              {f.dot} {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[6, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-3xl border border-black/8 dark:border-white/8 h-64 animate-pulse bg-black/[0.02] dark:bg-white/[0.02]" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <span className="text-4xl">🏟️</span>
            <p className="text-sm mt-2">No venues here yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((v, i) => (
              <div
                key={v._id}
                onClick={() => openVenue(v)}
                className="animate-cardIn rounded-3xl border border-black/8 dark:border-white/8 overflow-hidden cursor-pointer transition-all hover:-translate-y-1 hover:border-green-400/30 hover:shadow-lg hover:shadow-green-400/5"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="h-36 bg-black/5 dark:bg-white/5 relative overflow-hidden">
                  {v.images?.[0] ? (
                    <img src={v.images[0]} alt={v.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      {v.venueType === 'gym' ? '🏋️' : v.venueType === 'pool' ? '🏊' : v.venueType === 'social' ? '🎉' : '🏟️'}
                    </div>
                  )}
                  <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded-full bg-black/60 text-white backdrop-blur-sm capitalize">
                    {v.venueType === 'gym' ? '🏋️ Gym' : v.venueType === 'pool' ? '🏊 Pool' : v.venueType === 'social' ? '🎉 Social' : `🔵 ${v.sport || 'Ground'}`}
                  </span>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-sm truncate">{v.name}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs truncate mt-0.5">📍 {v.address}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs font-semibold text-green-500 dark:text-green-400">
                      {v.venueMode === 'trial' ? '🎟️ 2-Day Free Trial'
                        : v.venueMode === 'interest' ? '👀 Show Interest'
                        : v.venueType === 'social' ? 'Free'
                        : 'Live Booking'}
                    </span>
                    <span className="text-xs text-gray-400">View →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VenuesPage;