import { useState } from 'react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { SPORT_EMOJI, eventLabel, formatEventDate, formatEventTime } from './eventConstants.js';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) return resolve(true);
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const EventDetailModal = ({ event, onClose, onUpdated, flash }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!event) return null;

  const isFree = event.eventType !== 'paid';
  const isFull = event.maxParticipants > 0 && (event.participantCount || 0) >= event.maxParticipants;
  const fillPct = event.maxParticipants > 0
    ? Math.min(((event.participantCount || 0) / event.maxParticipants) * 100, 100)
    : 0;

  const handleJoinFree = async () => {
    setLoading(true);
    try {
      await API.post(`/events/${event._id}/join`);
      flash('You joined the event 🎉');
      onUpdated();
      onClose();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to join event', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    setLoading(true);
    try {
      await API.post(`/events/${event._id}/leave`);
      flash('You left the event');
      onUpdated();
      onClose();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to leave event', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    setLoading(true);
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      flash('Razorpay failed to load. Check your connection.', 'error');
      setLoading(false);
      return;
    }

    try {
      const { data } = await API.post(`/events/${event._id}/pay/order`);

      const options = {
        key: data.keyId,
        amount: data.amount * 100,
        currency: data.currency,
        name: 'spotNplay',
        description: `Join event — ${data.event.title}`,
        order_id: data.orderId,
        handler: async (response) => {
          try {
            await API.post(`/events/${event._id}/pay/verify`, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            flash('Payment successful — you joined the event 🎉');
            onUpdated();
            onClose();
          } catch (err) {
            flash(err.response?.data?.message || 'Payment verification failed', 'error');
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone,
        },
        theme: { color: '#4ade80' },
        modal: {
          ondismiss: () => {
            flash('Payment cancelled', 'error');
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to start payment', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="g-overlay g-overlayIn" onClick={onClose}>
      <div className="g-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="g-sport-icon" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}>
              {SPORT_EMOJI[event.sport] || '🏅'}
            </div>
            <div className="min-w-0">
              <h3 className="font-bebas text-2xl tracking-wide text-white truncate">{event.title}</h3>
              <p className="text-gray-500 text-xs">{eventLabel(event)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl flex-shrink-0 leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex flex-col gap-4" style={{ flex: 1 }}>
          {event.image && <img src={event.image} alt={event.title} className="ev-banner" style={{ height: 180 }} />}

          <div className="flex items-center gap-2 flex-wrap">
            <span className={isFree ? 'ev-badge-free' : 'ev-badge-paid'}>{isFree ? 'FREE' : `₹${event.price} / person`}</span>
            <span className="ev-sport-chip">📅 {formatEventDate(event.date)}</span>
            <span className="ev-sport-chip">⏰ {formatEventTime(event.startTime)} – {formatEventTime(event.endTime)}</span>
          </div>

          <p className="text-gray-500 text-sm">{event.eventCategory === 'esports' ? 'Lobby' : 'Venue'}: {event.venue}</p>

          {event.description && (
            <p className="text-gray-400 text-sm leading-relaxed">{event.description}</p>
          )}

          {/* Organizer / contact */}
          {/* <div className="g-card" style={{ padding: 14 }}>
            <p className="g-label mb-2">Organized by</p>
            <div className="flex items-center gap-3">
              {event.organizer?.avatar ? (
                <img src={event.organizer.avatar} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div className="g-member-initial" style={{ marginLeft: 0, width: 36, height: 36, fontSize: 14 }}>{event.organizer?.name?.charAt(0)}</div>
              )}
              <div>
                <p className="text-white text-sm font-semibold">{event.organizer?.name}</p>
                {event.organizer?.phone && (
                  <p className="text-gray-500 text-xs">📞 {event.organizer.phone}</p>
                )}
              </div>
            </div>
          </div> */}

          {/* Participants */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="g-label" style={{ marginBottom: 0 }}>Participants</p>
              <p className="text-gray-400 text-xs">
                {event.participantCount || 0}{event.maxParticipants > 0 ? ` / ${event.maxParticipants}` : ''}
              </p>
            </div>
            {event.maxParticipants > 0 && (
              <div className="ev-progress-track">
                <div className="ev-progress-fill" style={{ width: `${fillPct}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-white/5 flex gap-3">
          {event.isJoined ? (
            <button onClick={handleLeave} disabled={loading} className="g-btn-danger" style={{ flex: 1, padding: '12px 18px', fontSize: 14, textAlign: 'center' }}>
              {loading ? 'Please wait…' : '🚪 Leave Event'}
            </button>
          ) : isFull ? (
            <button disabled className="g-btn-secondary" style={{ flex: 1, opacity: 0.5, cursor: 'not-allowed' }}>Event is full</button>
          ) : isFree ? (
            <button onClick={handleJoinFree} disabled={loading} className="g-btn-primary" style={{ flex: 1 }}>
              {loading ? 'Joining…' : '🎉 Join for Free'}
            </button>
          ) : (
            <button onClick={handlePay} disabled={loading} className="g-btn-primary" style={{ flex: 1 }}>
              {loading ? 'Please wait…' : `💳 Pay ₹${event.price} & Join`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailModal;
