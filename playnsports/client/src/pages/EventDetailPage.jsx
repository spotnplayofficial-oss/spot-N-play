import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import EditEventModal from '../components/events/EditEventModal.jsx';
import UserChip from '../components/UserChip.jsx';
import ContactAdminCard from '../components/events/ContactAdminCard.jsx';
import RegistrationFormModal from '../components/events/RegistrationFormModal.jsx';
import TeamRegistrationModal from '../components/events/TeamRegistrationModal.jsx';
import { SPORT_EMOJI, eventLabel, sportLabel, formatEventDate, formatEventTime, approvalColor } from '../components/events/eventConstants.js';
import { EVENT_STYLES, EVENT_DETAIL_STYLES } from '../components/events/eventStyles.js';
import SEO from '../components/SEO';

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
    style.textContent = EVENT_STYLES + EVENT_DETAIL_STYLES;
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
  const hasSubEvents = event?.subEvents?.length > 0;
  const isEsports = event?.eventCategory === 'esports';
  const participantCount = event?.participantCount ?? event?.participants?.length ?? 0;
  const isFull = event?.maxParticipants > 0 && participantCount >= event.maxParticipants;
  const fillPct = event?.maxParticipants > 0
    ? Math.min((participantCount / event.maxParticipants) * 100, 100)
    : 0;
  const isJoined = event?.isJoined;

  /* ── actions ── */
  const needsRegForm = !!(event?.formConfig?.collectCollegeRegNo || event?.formConfig?.collectYear);
  const isTeamEvent = !hasSubEvents && event?.registrationType === 'team';
  const [csvLoading, setCsvLoading] = useState(false);

  const downloadCsv = async () => {
    setCsvLoading(true);
    try {
      const res = await API.get(`/events/${id}/registrations.csv`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(event.title || 'event').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-registrations.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not download registrations');
    } finally {
      setCsvLoading(false);
    }
  };
  const [showRegForm, setShowRegForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);

  const handleJoinFree = async (extra = {}) => {
    setActionLoading(true);
    try {
      await API.post(`/events/${id}/join`, extra);
      flash('You joined the event 🎉 Your ticket has been emailed to you.');
      fetchEvent();
    } catch (err) {
      if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        flash('Please verify your email first — head to your profile to verify, then come back and join.', 'error');
      } else {
        flash(err.response?.data?.message || 'Failed to join event', 'error');
      }
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

  const [checkInInput, setCheckInInput] = useState('');
  const [checkInLoading, setCheckInLoading] = useState(false);
  const handleCheckIn = async () => {
    if (!checkInInput.trim()) return;
    setCheckInLoading(true);
    try {
      const { data } = await API.patch(`/events/${id}/checkin`, { ticketId: checkInInput.trim() });
      flash(data.message);
      setCheckInInput('');
      fetchEvent();
    } catch (err) {
      flash(err.response?.data?.message || 'Check-in failed', 'error');
    } finally {
      setCheckInLoading(false);
    }
  };

  /* ── PAYMENT — calls the ORIGINAL eventController endpoints ── */
  const handlePay = async (extra = {}) => {
    setActionLoading(true);
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      flash('Razorpay failed to load. Check your connection.', 'error');
      setActionLoading(false);
      return;
    }

    try {
      // Uses the original route: POST /api/events/:id/pay/order  (eventController.js)
      const { data } = await API.post(`/events/${id}/pay/order`, extra);

      // keep team/college fields for verify
      const verifyExtra = extra;
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
              ...verifyExtra,
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
      if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        flash('Please verify your email first — head to your profile to verify, then come back and pay.', 'error');
      } else {
        flash(err.response?.data?.message || 'Failed to start payment', 'error');
      }
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
      <SEO title={event?.title ? `${event.title}` : 'Event'} description={event?.description?.slice(0, 155) || 'Join this sports event on SpotNPlay — book your ticket and play.'} canonical={event?._id ? `/events/${event._id}` : '/events'} noindex />
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

      <div className="max-w-4xl mx-auto px-4 pt-4 pb-8">
        <button
          onClick={() => navigate('/events')}
          className="g-btn-secondary mb-5"
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
                  {hasSubEvents ? (
                    <span className="ev-sport-chip">🗂️ {event.subEvents.length} sub-event{event.subEvents.length > 1 ? 's' : ''}</span>
                  ) : (
                    <span className={isFree ? 'ev-badge-free' : 'ev-badge-paid'}>
                      {isFree ? 'FREE' : isTeamEvent ? (/bgus|battle ground/i.test(event.title) ? `₹39 / person · ₹149 / squad` : `₹${event.price} / team`) : `₹${event.price} / person`}
                    </span>
                  )}
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
                <p className="text-gray-500 text-sm mt-1">{eventLabel(event)}</p>
              </div>
            </div>

            {/* Rejection reason */}
            {event.approvalStatus === 'rejected' && event.rejectionReason && (
              <div className="g-card g-anim-2" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)' }}>
                <p className="text-red-400 text-sm"><strong>Rejection reason:</strong> {event.rejectionReason}</p>
              </div>
            )}

            {/* Info grid — single-session events only; sub-event containers show
                their own date/time/venue per sub-event below instead */}
            {!hasSubEvents && (
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
                    <p className="ed-info-label">{isEsports ? 'Lobby / Stream' : 'Venue'}</p>
                    <p className="ed-info-value">{event.venue}</p>
                  </div>
                </div>
                {isEsports && (
                  <div className="ed-info-row sm:col-span-2">
                    <span style={{ fontSize: 18 }}>🎮</span>
                    <div>
                      <p className="ed-info-label">Esports Details</p>
                      <p className="ed-info-value">
                        {[event.gameTitle, event.platform, event.matchFormat, event.serverRegion].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                )}
                {isEsports && event.prizePool > 0 && (
                  <div className="ed-info-row sm:col-span-2">
                    <span style={{ fontSize: 18 }}>🏆</span>
                    <div>
                      <p className="ed-info-label">Prize Pool</p>
                      <p className="ed-info-value" style={{ color: '#fbbf24' }}>₹{event.prizePool.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                )}
                {isEsports && event.streamUrl && (
                  <div className="ed-info-row sm:col-span-2">
                    <span style={{ fontSize: 18 }}>📺</span>
                    <div>
                      <p className="ed-info-label">Stream</p>
                      <a href={event.streamUrl} target="_blank" rel="noopener noreferrer" className="ed-info-value text-blue-400 hover:text-blue-300" style={{ textDecoration: 'none' }}>
                        Watch live →
                      </a>
                    </div>
                  </div>
                )}
                {isTeamEvent ? (
                  <div className="ed-info-row">
                    <span style={{ fontSize: 18 }}>⚡</span>
                    <div>
                      <p className="ed-info-label">Availability</p>
                      <p className="ed-info-value">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border" style={{ background: 'rgba(251,146,60,0.12)', color: '#f97316', borderColor: 'rgba(251,146,60,0.30)' }}>⚡ Only limited slots left!</span>
                      </p>
                    </div>
                  </div>
                ) : (
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
                )}
              </div>
            )}

            {/* Capacity bar — hidden for team events (show limited slots pill instead) */}
            {!hasSubEvents && event.maxParticipants > 0 && !isTeamEvent && (
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

            {/* Sub-events list */}
            {hasSubEvents && (
              <div className="g-anim-3">
                <p className="ed-section-title">Sub-Events — pick one to book</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {event.subEvents.map((se) => {
                    const seFree = se.eventType !== 'paid';
                    const seCount = se.participantCount ?? (se.bookings || []).reduce((sum, b) => sum + (b.quantity || 1), 0);
                    const seFull = se.capacity > 0 && seCount >= se.capacity;
                    return (
                      <div key={se._id} className="sev-tile" onClick={() => navigate(`/events/${event._id}/subevents/${se._id}`)}>
                        {se.image || event.image ? (
                          <img src={se.image || event.image} alt={se.title} className="sev-tile-banner" />
                        ) : (
                          <div className="sev-tile-banner-placeholder">{SPORT_EMOJI[event.sport] || '🏅'}</div>
                        )}
                        <div className="sev-tile-body">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{se.title}</p>
                            <span className={seFree ? 'ev-badge-free' : 'ev-badge-paid'} style={{ flexShrink: 0 }}>
                              {seFree ? 'FREE' : `₹${se.price}`}
                            </span>
                          </div>
                          <p className="text-gray-500 text-xs">📅 {formatEventDate(se.date)} · {formatEventTime(se.startTime)}</p>
                          <p className="text-gray-500 text-xs truncate">📍 {se.venue}</p>
                          {se.capacity > 0 && !se.isJoined && !seFull && (
                            <div className="mt-2 flex">
                              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border" style={{ background: 'rgba(251,146,60,0.12)', color: '#f97316', borderColor: 'rgba(251,146,60,0.30)' }}>⚡ Only limited seats left!</span>
                            </div>
                          )}
                          {(!se.capacity || se.isJoined || seFull) && (
                            <div className="flex items-center justify-between mt-1">
                              {se.isJoined ? (
                                <span className="ev-badge-approved">✓ Booked</span>
                              ) : seFull ? (
                                <span className="ev-badge-cancelled">Full</span>
                              ) : (
                                <span className="text-gray-500 text-xs">Open · up to {se.maxTicketsPerBooking}/player</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!isOrganizer && !isAdmin && <ContactAdminCard context={`Event: ${event.title}`} />}

            {/* Participants — organizer / admin only, single-session events only
                (sub-event bookings are managed on each sub-event's own page) */}
            {!hasSubEvents && (isOrganizer || isAdmin) && (
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
                          {p.ticketId && <p className="text-gray-500 text-[11px] tracking-wide">🎟️ {p.ticketId}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {event.eventType === 'paid'
                            ? <span className="ev-badge-approved">Paid ₹{p.amountPaid}</span>
                            : <span className="ev-badge-free">Joined</span>}
                          {p.checkedIn ? (
                            <span className="text-green-400 text-[10px] font-bold">✅ Checked in</span>
                          ) : (
                            <span className="text-gray-500 text-[10px]">Not arrived yet</span>
                          )}
                        </div>
                      </div>
                    )) : (
                      <p className="text-gray-500 text-sm text-center py-4">No participants yet.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Check-in — organizer confirms someone actually showed up at the door */}
            {!hasSubEvents && (isOrganizer || isAdmin) && event.status === 'upcoming' && (
              <div className="g-card g-anim-4 flex flex-col gap-2">
                <p className="ed-section-title" style={{ marginBottom: 0 }}>🚪 Check In a Participant</p>
                <p className="text-gray-500 text-xs">Type or scan the ticket ID they show you at the entrance.</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={checkInInput}
                    onChange={(e) => setCheckInInput(e.target.value.toUpperCase())}
                    placeholder="SPT-XXXXXXXX"
                    className="g-input"
                    style={{ flex: 1, fontFamily: 'monospace', letterSpacing: 1 }}
                    onKeyDown={(e) => e.key === 'Enter' && handleCheckIn()}
                  />
                  <button
                    onClick={handleCheckIn}
                    disabled={checkInLoading || !checkInInput.trim()}
                    className="g-btn-primary"
                    style={{ padding: '0 18px', fontSize: 13 }}
                  >
                    {checkInLoading ? '…' : 'Check In'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Right / action sidebar ── */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-24 self-start">

            {/* Join / Pay box — single-session events. Sub-event containers
                book per sub-event instead (see the tiles list on the left). */}
            {!hasSubEvents && event.approvalStatus === 'approved' && event.status === 'upcoming' && !isOrganizer && !isAdmin && (
              <div className="ed-pay-box g-anim-2">
                {!isFree && (
                  <div className="mb-4">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Entry fee</p>
                    <p className="ed-price-big">₹{event.price}</p>
                    <p className="text-gray-500 text-xs">
                      {isTeamEvent ? (/bgus|battle ground/i.test(event.title) ? 'per squad (₹39 per person)' : 'per team') : 'per person'}
                    </p>
                  </div>
                )}

                {isJoined ? (
                  <>
                    <div className="flex items-center gap-2 mb-3 text-green-400 text-sm font-semibold">
                      <span>✅</span> You're in!
                    </div>
                    {event.myParticipation?.ticketId && (
                      <div style={{ background: 'rgba(74,222,128,0.06)', border: '1px dashed rgba(74,222,128,0.4)', borderRadius: 10, padding: '12px 14px', marginBottom: 14, textAlign: 'center' }}>
                        <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Your ticket ID</p>
                        <p className="text-green-400 font-bold" style={{ fontSize: 18, letterSpacing: 1.5 }}>{event.myParticipation.ticketId}</p>
                        <p className="text-gray-500 text-[11px] mt-1">Show this at the entrance to check in{event.myParticipation.checkedIn ? ' — already checked in 🎉' : ''}</p>
                      </div>
                    )}
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
                    onClick={() => {
                      if (isTeamEvent) setShowTeamForm(true);
                      else if (needsRegForm) setShowRegForm(true);
                      else handleJoinFree();
                    }}
                    disabled={actionLoading}
                    className="g-btn-primary"
                    style={{ width: '100%', padding: '13px', fontSize: 14, textAlign: 'center' }}
                  >
                    {actionLoading ? 'Joining…' : '🎉 Join for Free'}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (isTeamEvent) setShowTeamForm(true);
                      else handlePay();
                    }}
                    disabled={actionLoading}
                    className="g-btn-primary"
                    style={{ width: '100%', padding: '13px', fontSize: 14, textAlign: 'center' }}
                  >
                    {actionLoading ? 'Please wait…' : `💳 Pay ₹${event.price} & Join`}
                  </button>
                )}
              </div>
            )}

            {hasSubEvents && event.approvalStatus === 'approved' && event.status === 'upcoming' && !isOrganizer && !isAdmin && (
              <div className="ed-pay-box g-anim-2 text-center">
                <p style={{ fontSize: 28 }}>🗂️</p>
                <p className="font-semibold text-sm text-gray-900 dark:text-white mt-2">Choose a sub-event to book</p>
                <p className="text-gray-500 text-xs mt-1">Tap any sub-event card on the left — each has its own booking flow.</p>
              </div>
            )}

            {(isOrganizer || isAdmin) && (
              <div className="g-card g-anim-2 flex flex-col gap-3">
                <p className="ed-section-title" style={{ marginBottom: 0 }}>Registrations</p>
                <button
                  onClick={downloadCsv}
                  disabled={csvLoading}
                  className="g-btn-primary"
                  style={{ width: '100%', padding: '11px', fontSize: 13 }}
                >
                  {csvLoading ? 'Preparing…' : '📊 Download Registrations (CSV)'}
                </button>
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
                  [isEsports ? 'Game' : 'Sport', eventLabel(event)],
                  ...(isEsports ? [
                    ['Platform', event.platform || 'Any'],
                    ['Format', event.matchFormat || 'Open'],
                    ['Region', event.serverRegion || 'Not specified'],
                  ] : []),
                  ['Type', hasSubEvents ? `${event.subEvents.length} sub-events` : (isFree ? 'Free' : 'Paid')],
                  ['Max Spots', hasSubEvents ? '—' : (event.maxParticipants > 0 ? event.maxParticipants : 'Unlimited')],
                  ['Status', event.status],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className={`text-gray-900 dark:text-white font-medium capitalize ${
                      label === 'Type' && !hasSubEvents ? (isFree ? 'text-green-400' : 'text-yellow-400') : ''
                    }`}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team registration modal — XL style for team events */}
      {showTeamForm && (
        <TeamRegistrationModal
          event={event}
          teamSize={event.teamSize}
          price={event.price}
          onClose={() => setShowTeamForm(false)}
          onSubmit={async (teamFields) => {
            setShowTeamForm(false);
            // if this team event also collects college form, merge college fields via second modal? For now team modal is primary.
            // If needsRegForm too, we could chain, but XL team events don't use college form.
            if (isFree) await handleJoinFree(teamFields);
            else await handlePay(teamFields);
          }}
        />
      )}
      {showRegForm && !isTeamEvent && (
        <RegistrationFormModal
          event={event}
          onClose={() => setShowRegForm(false)}
          onSubmit={async (payload) => {
            setShowRegForm(false);
            if (isFree) await handleJoinFree(payload);
            else await handlePay(payload);
          }}
        />
      )}
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
