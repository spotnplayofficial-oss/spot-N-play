import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import EditEventModal from '../components/events/EditEventModal.jsx';
import UserChip from '../components/UserChip.jsx';
import { SPORT_EMOJI, sportLabel, formatEventDate, formatEventTime, approvalColor } from '../components/events/eventConstants.js';
import { EVENT_STYLES } from '../components/events/eventStyles.js';

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) return resolve(true);
    const s = document.createElement('script');
    s.id = 'razorpay-script';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState('success');
  const [expandParticipants, setExpandParticipants] = useState(false);

  /* ── inject page-level styles ── */
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = EVENT_STYLES + `
      .ed-hero {
        width: 100%;
        max-height: 380px;
        min-height: 220px;
        object-fit: cover;
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,0.07);
      }
      .ed-hero-placeholder {
        width: 100%;
        min-height: 180px;
        border-radius: 20px;
        background: linear-gradient(135deg, rgba(74,222,128,0.06) 0%, rgba(255,255,255,0.02) 100%);
        border: 1px solid rgba(74,222,128,0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 80px;
      }
      .ed-info-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        border-radius: 14px;
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.05);
      }
      .ed-info-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; }
      .ed-info-value { font-size: 14px; color: #e5e7eb; font-weight: 500; }
      .ed-section-title {
        font-size: 11px; color: #4ade80;
        text-transform: uppercase; letter-spacing: 0.12em;
        font-weight: 700; margin-bottom: 10px;
      }
      .ed-organizer-card {
        display: flex; align-items: center; gap: 14px;
        padding: 16px; border-radius: 16px;
        background: rgba(74,222,128,0.03);
        border: 1px solid rgba(74,222,128,0.1);
      }
      .ed-avatar {
        width: 48px; height: 48px; border-radius: 50%;
        object-fit: cover; border: 2px solid rgba(74,222,128,0.2); flex-shrink: 0;
      }
      .ed-avatar-initial {
        width: 48px; height: 48px; border-radius: 50%;
        background: rgba(74,222,128,0.1); border: 2px solid rgba(74,222,128,0.2);
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; font-weight: 700; color: #4ade80; flex-shrink: 0;
      }
      .ed-pay-box {
        padding: 20px; border-radius: 20px;
        background: rgba(74,222,128,0.04);
        border: 1px solid rgba(74,222,128,0.15);
      }
      .ed-price-big {
        font-family: 'Bebas Neue', cursive;
        font-size: 48px; color: #4ade80; line-height: 1;
      }
      /* Light mode */
      .light .ed-info-row { background: rgba(0,0,0,0.025); border-color: rgba(0,0,0,0.07); }
      .light .ed-info-value { color: #111827; }
      .light .ed-organizer-card { background: rgba(74,222,128,0.04); border-color: rgba(74,222,128,0.15); }
      .light .ed-pay-box { background: rgba(74,222,128,0.05); border-color: rgba(74,222,128,0.2); }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const flash = (msg, type = 'success') => {
    setMessage(msg);
    setMsgType(type);
    setTimeout(() => setMessage(''), 3500);
  };

  const fetchEvent = useCallback(async () => {
    try {
      const { data } = await API.get(`/events/${id}`);
      setEvent(data);
    } catch (err) {
      flash(err.response?.data?.message || 'Event not found', 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  /* ── derived ── */
  const isOrganizer = user && event && (
    event.organizer?._id?.toString() === user._id ||
    event.organizer?.toString() === user._id
  );
  const isAdmin = user?.role === 'admin';
  const isFree = event?.eventType !== 'paid';
  const participantCount = event?.participantCount ?? event?.participants?.length ?? 0;
  const isFull = event?.maxParticipants > 0 && participantCount >= event.maxParticipants;
  const fillPct = event?.maxParticipants > 0
    ? Math.min((participantCount / event.maxParticipants) * 100, 100)
    : 0;
  const isJoined = event?.isJoined;

  /* ── actions ── */
  const handleJoinFree = async () => {
    setActionLoading(true);
    try {
      await API.post(`/events/${id}/join`);
      flash('You joined the event 🎉');
      fetchEvent();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to join event', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave this event?')) return;
    setActionLoading(true);
    try {
      await API.post(`/events/${id}/leave`);
      flash('You left the event');
      fetchEvent();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to leave event', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── PAYMENT — calls the ORIGINAL eventController endpoints ── */
  const handlePay = async () => {
    setActionLoading(true);
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      flash('Razorpay failed to load. Check your connection.', 'error');
      setActionLoading(false);
      return;
    }

    try {
      // Uses the original route: POST /api/events/:id/pay/order  (eventController.js)
      const { data } = await API.post(`/events/${id}/pay/order`);

      const options = {
        key: data.keyId,
        amount: data.amount * 100,
        currency: data.currency,
        name: 'spotNplay',
        description: `Join — ${data.event.title}`,
        order_id: data.orderId,
        handler: async (response) => {
          try {
            // Uses the original route: POST /api/events/:id/pay/verify  (eventController.js)
            await API.post(`/events/${id}/pay/verify`, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            flash('Payment successful — you joined the event 🎉');
            fetchEvent();
          } catch (err) {
            flash(err.response?.data?.message || 'Payment verification failed', 'error');
          } finally {
            setActionLoading(false);
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
            setActionLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to start payment', 'error');
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this event? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      await API.patch(`/events/${id}/cancel`);
      flash('Event cancelled');
      fetchEvent();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to cancel event', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── loading state ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div style={{ width: 36, height: 36, border: '3px solid rgba(74,222,128,0.15)', borderTopColor: '#4ade80', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <p className="text-6xl mb-4">🔍</p>
          <h2 className="text-2xl font-semibold text-gray-400 mb-4">Event not found</h2>
          <button onClick={() => navigate('/events')} className="g-btn-primary">← Back to Events</button>
        </div>
      </div>
    );
  }

  const paidCount = event.participants?.filter((p) => p.paymentStatus === 'paid').length || 0;
  const revenue = event.participants?.reduce((sum, p) => sum + (p.amountPaid || 0), 0) || 0;

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

      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/events')}
          className="g-btn-secondary mb-6"
          style={{ fontSize: 13, padding: '8px 16px' }}
        >
          ← Back to Events
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left / main ── */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Hero */}
            {event.image ? (
              <img src={event.image} alt={event.title} className="ed-hero g-anim-1" />
            ) : (
              <div className="ed-hero-placeholder g-anim-1">
                {SPORT_EMOJI[event.sport] || '🏅'}
              </div>
            )}

            {/* Title & badges */}
            <div className="g-anim-2 flex items-start gap-4">
              <div style={{
                width: 52, height: 52, borderRadius: 14, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 26,
                background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)',
                flexShrink: 0,
              }}>
                {SPORT_EMOJI[event.sport] || '🏅'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={isFree ? 'ev-badge-free' : 'ev-badge-paid'}>
                    {isFree ? 'FREE' : `₹${event.price} / person`}
                  </span>
                  <span className={approvalColor(event.approvalStatus)}>
                    {event.approvalStatus === 'pending' && '⏳ Pending Approval'}
                    {event.approvalStatus === 'approved' && '✅ Approved'}
                    {event.approvalStatus === 'rejected' && '❌ Rejected'}
                  </span>
                  {event.status === 'cancelled' && (
                    <span className="ev-badge-cancelled">Cancelled</span>
                  )}
                </div>
                <h1 className="font-bebas text-4xl md:text-5xl tracking-wide shimmer-text leading-tight">
                  {event.title}
                </h1>
                <p className="text-gray-500 text-sm mt-1">{sportLabel(event.sport)}</p>
              </div>
            </div>

            {/* Rejection reason */}
            {event.approvalStatus === 'rejected' && event.rejectionReason && (
              <div className="g-card g-anim-2" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)' }}>
                <p className="text-red-400 text-sm"><strong>Rejection reason:</strong> {event.rejectionReason}</p>
              </div>
            )}

            {/* Info grid */}
            <div className="g-anim-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="ed-info-row">
                <span style={{ fontSize: 18 }}>📅</span>
                <div>
                  <p className="ed-info-label">Date</p>
                  <p className="ed-info-value">{formatEventDate(event.date)}</p>
                </div>
              </div>
              <div className="ed-info-row">
                <span style={{ fontSize: 18 }}>⏰</span>
                <div>
                  <p className="ed-info-label">Time</p>
                  <p className="ed-info-value">{formatEventTime(event.startTime)} – {formatEventTime(event.endTime)}</p>
                </div>
              </div>
              <div className="ed-info-row sm:col-span-2">
                <span style={{ fontSize: 18 }}>📍</span>
                <div>
                  <p className="ed-info-label">Venue</p>
                  <p className="ed-info-value">{event.venue}</p>
                </div>
              </div>
              {event.contactNumber && (
                <div className="ed-info-row">
                  <span style={{ fontSize: 18 }}>📞</span>
                  <div>
                    <p className="ed-info-label">Contact</p>
                    <p className="ed-info-value">
                      {event.contactName ? `${event.contactName} · ` : ''}{event.contactNumber}
                    </p>
                  </div>
                </div>
              )}
              <div className="ed-info-row">
                <span style={{ fontSize: 18 }}>👥</span>
                <div>
                  <p className="ed-info-label">Spots</p>
                  <p className="ed-info-value">
                    {participantCount}
                    {event.maxParticipants > 0 ? ` / ${event.maxParticipants}` : ' joined'}
                    {event.maxParticipants > 0 && (
                      <span className="text-gray-500 text-xs ml-1">
                        ({event.spotsLeft ?? (event.maxParticipants - participantCount)} left)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Capacity bar */}
            {event.maxParticipants > 0 && (
              <div className="g-anim-3">
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-gray-500">Capacity</span>
                  <span className="text-xs text-gray-400">{Math.round(fillPct)}% full</span>
                </div>
                <div className="ev-progress-track">
                  <div className="ev-progress-fill" style={{ width: `${fillPct}%` }} />
                </div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="g-anim-3">
                <p className="ed-section-title">About this event</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              </div>
            )}

            {/* Organizer */}
            <div className="g-anim-4">
              <p className="ed-section-title">Organized by</p>
              <div className="ed-organizer-card">
                {event.organizer?.avatar ? (
                  <img src={event.organizer.avatar} alt="" className="ed-avatar" />
                ) : (
                  <div className="ed-avatar-initial">
                    {event.organizer?.name?.charAt(0) || '?'}
                  </div>
                )}
                <div>
                  <UserChip user={event.organizer} size="md" stopPropagation={true} style={{ color: 'inherit' }} />
                  {event.organizer?.phone && <p className="text-gray-500 text-sm mt-1">📞 {event.organizer.phone}</p>}
                  {event.organizer?.email && <p className="text-gray-500 text-xs">{event.organizer.email}</p>}
                </div>
              </div>
            </div>

            {/* Participants — organizer / admin only */}
            {(isOrganizer || isAdmin) && (
              <div className="g-anim-4">
                <button
                  onClick={() => setExpandParticipants((v) => !v)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  className="ed-section-title flex items-center gap-2 hover:text-green-300 transition-colors"
                >
                  👥 Participants ({event.participants?.length || 0})
                  {event.eventType === 'paid' && (
                    <span className="text-yellow-400 ml-2 font-normal normal-case text-xs tracking-normal">
                      💰 ₹{revenue} from {paidCount} paid
                    </span>
                  )}
                  <span style={{ fontSize: 10 }}>{expandParticipants ? '▲' : '▼'}</span>
                </button>

                {expandParticipants && (
                  <div className="flex flex-col gap-2 mt-2 g-slideIn">
                    {event.participants?.length ? event.participants.map((p, i) => (
                      <div key={i} className="ev-participant-row">
                        {p.user?.avatar ? (
                          <img src={p.user.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div className="g-member-initial" style={{ marginLeft: 0, width: 32, height: 32 }}>
                            {p.user?.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <UserChip user={p.user} size="sm" stopPropagation={true} style={{ color: 'inherit' }} />
                          {p.user?.phone && <p className="text-gray-500 text-xs">📞 {p.user.phone}</p>}
                        </div>
                        {event.eventType === 'paid'
                          ? <span className="ev-badge-approved">Paid ₹{p.amountPaid}</span>
                          : <span className="ev-badge-free">Joined</span>}
                      </div>
                    )) : (
                      <p className="text-gray-500 text-sm text-center py-4">No participants yet.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right / action sidebar ── */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-24 self-start">

            {/* Join / Pay box */}
            {event.approvalStatus === 'approved' && event.status === 'upcoming' && !isOrganizer && !isAdmin && (
              <div className="ed-pay-box g-anim-2">
                {!isFree && (
                  <div className="mb-4">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Entry fee</p>
                    <p className="ed-price-big">₹{event.price}</p>
                    <p className="text-gray-500 text-xs">per person</p>
                  </div>
                )}

                {isJoined ? (
                  <>
                    <div className="flex items-center gap-2 mb-3 text-green-400 text-sm font-semibold">
                      <span>✅</span> You're in!
                    </div>
                    <button
                      onClick={handleLeave}
                      disabled={actionLoading}
                      className="g-btn-danger"
                      style={{ width: '100%', padding: '13px', fontSize: 14, textAlign: 'center' }}
                    >
                      {actionLoading ? 'Please wait…' : '🚪 Leave Event'}
                    </button>
                  </>
                ) : isFull ? (
                  <button disabled className="g-btn-secondary" style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed', padding: '13px' }}>
                    🔒 Event is Full
                  </button>
                ) : isFree ? (
                  <button
                    onClick={handleJoinFree}
                    disabled={actionLoading}
                    className="g-btn-primary"
                    style={{ width: '100%', padding: '13px', fontSize: 14, textAlign: 'center' }}
                  >
                    {actionLoading ? 'Joining…' : '🎉 Join for Free'}
                  </button>
                ) : (
                  <button
                    onClick={handlePay}
                    disabled={actionLoading}
                    className="g-btn-primary"
                    style={{ width: '100%', padding: '13px', fontSize: 14, textAlign: 'center' }}
                  >
                    {actionLoading ? 'Please wait…' : `💳 Pay ₹${event.price} & Join`}
                  </button>
                )}
              </div>
            )}

            {/* Organizer controls */}
            {isOrganizer && event.status !== 'cancelled' && (
              <div className="g-card g-anim-2 flex flex-col gap-3">
                <p className="ed-section-title" style={{ marginBottom: 0 }}>Manage Event</p>
                <button
                  onClick={() => setEditing(true)}
                  className="g-btn-secondary"
                  style={{ width: '100%', padding: '11px', fontSize: 13 }}
                >
                  ✏️ Edit Event Details
                </button>
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="g-btn-danger"
                  style={{ width: '100%', padding: '11px', fontSize: 13 }}
                >
                  {actionLoading ? 'Cancelling…' : '🗑️ Cancel Event'}
                </button>
                {event.approvalStatus === 'pending' && (
                  <p className="text-gray-500 text-xs text-center">
                    ⏳ Awaiting admin approval before participants can join.
                  </p>
                )}
              </div>
            )}

            {/* Info card */}
            <div className="g-card g-anim-3 flex flex-col gap-3">
              <p className="ed-section-title" style={{ marginBottom: 0 }}>Event Info</p>
              <div className="flex flex-col gap-2">
                {[
                  ['Sport', sportLabel(event.sport)],
                  ['Type', isFree ? 'Free' : 'Paid'],
                  ['Max Spots', event.maxParticipants > 0 ? event.maxParticipants : 'Unlimited'],
                  ['Status', event.status],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className={`text-gray-900 dark:text-white font-medium capitalize ${
                      label === 'Type' ? (isFree ? 'text-green-400' : 'text-yellow-400') : ''
                    }`}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <EditEventModal
          event={event}
          onClose={() => setEditing(false)}
          onUpdated={() => { fetchEvent(); setEditing(false); }}
          flash={flash}
        />
      )}
    </div>
  );
};

export default EventDetailPage;
