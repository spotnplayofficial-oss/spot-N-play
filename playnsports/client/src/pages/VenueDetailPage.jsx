import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import API from '../api/axios';

const VenueDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState('success');

  const fetchVenue = useCallback(async () => {
    try {
      const { data } = await API.get(`/venues/${id}`);
      setVenue(data);
    } catch {
      setVenue(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchVenue(); }, [fetchVenue]);

  // Once a venue has gone live, real sport/court/capacity booking takes
  // over — that's the same flow grounds already use, so send the visitor
  // there instead of duplicating the whole booking wizard here.
  useEffect(() => {
    if (venue?.venueMode === 'live') {
      navigate(`/grounds/${id}`, { replace: true });
    }
  }, [venue, id, navigate]);

  const flash = (msg, type = 'success') => {
    setMessage(msg);
    setMsgType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleClaimTrial = async () => {
    setClaiming(true);
    try {
      const { data } = await API.post(`/venues/${id}/claim-trial`);
      flash(data.message);
      fetchVenue();
    } catch (err) {
      flash(err?.response?.data?.message || 'Could not claim trial', 'error');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 pt-32 text-center">
          <p className="text-2xl mb-2">Venue not found</p>
          <button onClick={() => navigate('/venues')} className="text-green-500 dark:text-green-400 text-sm">← Back to Venues</button>
        </div>
      </div>
    );
  }

  const trial = venue.myTrial;
  const trialActive = trial && trial.status !== 'expired' && new Date(trial.expiresAt) > new Date();
  const isInterestMode = venue.venueMode === 'interest';

  const typeLabel = {
    gym: '🏋️ Gym', pool: '🏊 Pool', social: '🎉 Social Ground', ground: '🔵 Ground',
  }[venue.venueType] || '🏟️ Venue';
  const typeIcon = { gym: '🏋️', pool: '🏊', social: '🎉', ground: '🏟️' }[venue.venueType] || '🏟️';

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <Navbar />

      {message && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-medium shadow-2xl ${
          msgType === 'success'
            ? 'bg-green-400/10 border border-green-400/25 text-green-500 dark:text-green-400'
            : 'bg-red-400/10 border border-red-400/25 text-red-500 dark:text-red-400'
        }`}>
          {msgType === 'success' ? '✅' : '⚠️'} {message}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <button onClick={() => navigate('/venues')} className="text-gray-500 dark:text-gray-400 text-sm mb-4 hover:text-green-400 transition-colors">← Back to Venues</button>

        {/* Gallery */}
        <div className="rounded-3xl overflow-hidden border border-black/8 dark:border-white/8 mb-2 bg-black/5 dark:bg-white/5" style={{ height: 320 }}>
          {venue.images?.length > 0 ? (
            <img src={venue.images[activeImg]} alt={venue.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">{typeIcon}</div>
          )}
        </div>
        {venue.images?.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {venue.images.map((img, i) => (
              <button
                key={img}
                onClick={() => setActiveImg(i)}
                className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 ${activeImg === i ? 'border-green-400' : 'border-transparent opacity-70'}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="md:col-span-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-400/10 text-green-500 dark:text-green-400 border border-green-400/20">{typeLabel}</span>
            <h1 className="text-3xl mt-3 mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.03em' }}>{venue.name}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">📍 {venue.address}</p>
            {venue.description && <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line">{venue.description}</p>}
          </div>

          {/* Trial / Interest CTA card */}
          <div className="rounded-3xl border border-green-400/20 bg-gradient-to-b from-green-400/10 to-transparent p-5 h-fit">
            {isInterestMode ? (
              <>
                <p className="font-bebas text-xl tracking-wide mb-1">👀 Coming Soon</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-4">
                  This venue isn't bookable yet — we're gauging interest before finalizing the deal. Just by opening this page, you've let the owner know you'd book here.
                </p>
                <div className="bg-black/5 dark:bg-white/5 border border-dashed border-green-400/30 rounded-2xl p-4 text-center">
                  <p className="text-2xl mb-1">✅</p>
                  <p className="text-sm font-semibold text-green-500 dark:text-green-400">Your interest has been noted!</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">We'll notify you if this venue goes live.</p>
                </div>
              </>
            ) : (
              <>
                <p className="font-bebas text-xl tracking-wide mb-1">🎟️ 2-Day Free Trial</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-4">No card, no commitment — just show up.</p>

                {trialActive ? (
                  <div>
                    <div className="bg-black/5 dark:bg-white/5 border border-dashed border-green-400/30 rounded-2xl p-4 text-center mb-3">
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Ticket ID</p>
                      <p className="text-lg font-bold tracking-widest">{trial.ticketId}</p>
                    </div>
                    {trial.status === 'checked_in' ? (
                      <p className="text-center text-green-500 dark:text-green-400 text-sm font-semibold">✅ Checked in — enjoy!</p>
                    ) : (
                      <p className="text-center text-gray-500 dark:text-gray-400 text-xs">
                        Valid until {new Date(trial.expiresAt).toLocaleString()}. Show this ID at the venue.
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleClaimTrial}
                    disabled={claiming}
                    className="w-full bg-gradient-to-r from-green-400 to-green-600 text-black font-bold text-sm rounded-xl py-3 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-400/30 disabled:opacity-50"
                  >
                    {claiming ? 'Claiming…' : trial?.status === 'expired' ? 'Claim Another Trial' : 'Get Free Trial'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VenueDetailPage;
