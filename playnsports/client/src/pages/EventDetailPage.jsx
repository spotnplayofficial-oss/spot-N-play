import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search, Calendar, CalendarRange, Clock, MapPin, Users, Layers,
  CircleCheck, CircleX, Hourglass, Ticket, Wallet, DoorOpen, Pencil, Trash2,
  ChevronDown, ChevronUp, Lock, PartyPopper, CreditCard, Trophy, Phone,
} from 'lucide-react';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import EditEventModal from '../components/events/EditEventModal.jsx';
import UserChip from '../components/UserChip.jsx';
import ContactAdminCard from '../components/events/ContactAdminCard.jsx';
import EventBanner from '../components/events/EventBanner.jsx';
import { sportLabel, formatEventDate, formatEventTime, approvalColor } from '../components/events/eventConstants.js';
import { EVENT_STYLES, EVENT_DETAIL_STYLES } from '../components/events/eventStyles.js';

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
  const participantCount = event?.participantCount ?? event?.participants?.length ?? 0;
  const isFull = event?.maxParticipants > 0 && participantCount >= event.maxParticipants;
  const fillPct = event?.maxParticipants > 0
    ? Math.min((participantCount / event.maxParticipants) * 100, 100)
    : 0;
  const isJoined = event?.isJoined;

  const subEventSummary = (() => {
    if (!hasSubEvents) return null;
    const dates = [...event.subEvents.map((se) => se.date)].sort();
    const venues = new Set(event.subEvents.map((se) => se.venue));
    const dateRange = dates[0] === dates[dates.length - 1]
      ? formatEventDate(dates[0])
      : `${formatEventDate(dates[0])} – ${formatEventDate(dates[dates.length - 1])}`;
    return { dateRange, venueCount: venues.size };
  })();

  /* ── actions ── */
  const handleJoinFree = async () => {
    setActionLoading(true);
    try {
      await API.post(`/events/${id}/join`);
      flash('You joined the event — your ticket has been emailed to you.');
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
            flash('Payment successful — you joined the event.');
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
          <Search size={48} className="mx-auto mb-4 text-gray-600" strokeWidth={1.5} />
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
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 g-slideIn px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl whitespace-nowrap flex items-center gap-2 ${
          msgType === 'success'
            ? 'bg-green-400/15 border border-green-400/25 text-green-400'
            : 'bg-red-400/15 border border-red-400/25 text-red-400'
        }`}>
          {msgType === 'success' ? <CircleCheck size={16} /> : <CircleX size={16} />} {message}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 pt-4 pb-8">
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
            <EventBanner src={event.image} alt={event.title} aspect="21 / 8" className="g-anim-1 ed-hero-frame" icon={Trophy} />

            {/* Title & badges */}
            <div className="g-anim-2">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {hasSubEvents ? (
                  <span className="ev-sport-chip"><Layers size={12} /> {event.subEvents.length} sub-event{event.subEvents.length > 1 ? 's' : ''}</span>
                ) : (
                  <span className={isFree ? 'ev-badge-free' : 'ev-badge-paid'}>
                    {isFree ? 'FREE' : `₹${event.price} / person`}
                  </span>
                )}
                <span className={approvalColor(event.approvalStatus)}>
                  {event.approvalStatus === 'pending' && <><Hourglass size={11} /> Pending Approval</>}
                  {event.approvalStatus === 'approved' && <><CircleCheck size={11} /> Approved</>}
                  {event.approvalStatus === 'rejected' && <><CircleX size={11} /> Rejected</>}
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

            {/* Rejection reason */}
            {event.approvalStatus === 'rejected' && event.rejectionReason && (
              <div className="g-card g-anim-2" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)' }}>
                <p className="text-red-400 text-sm"><strong>Rejection reason:</strong> {event.rejectionReason}</p>
              </div>
            )}

            {/* Info grid — single-session events show date/time/venue/spots;
                sub-event containers show a summary strip instead */}
            {!hasSubEvents ? (
              <div className="g-anim-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="ed-info-row">
                  <Calendar size={18} className="ed-info-icon" />
                  <div>
                    <p className="ed-info-label">Date</p>
                    <p className="ed-info-value">{formatEventDate(event.date)}</p>
                  </div>
                </div>
                <div className="ed-info-row">
                  <Clock size={18} className="ed-info-icon" />
                  <div>
                    <p className="ed-info-label">Time</p>
                    <p className="ed-info-value">{formatEventTime(event.startTime)} – {formatEventTime(event.endTime)}</p>
                  </div>
                </div>
                <div className="ed-info-row sm:col-span-2">
                  <MapPin size={18} className="ed-info-icon" />
                  <div>
                    <p className="ed-info-label">Venue</p>
                    <p className="ed-info-value">{event.venue}</p>
                  </div>
                </div>
                <div className="ed-info-row">
                  <Users size={18} className="ed-info-icon" />
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
            ) : (
              <div className="g-anim-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="ed-info-row">
                  <Trophy size={18} className="ed-info-icon" />
                  <div>
                    <p className="ed-info-label">Sport</p>
                    <p className="ed-info-value">{sportLabel(event.sport)}</p>
                  </div>
                </div>
                <div className="ed-info-row">
                  <Layers size={18} className="ed-info-icon" />
                  <div>
                    <p className="ed-info-label">Sub-Events</p>
                    <p className="ed-info-value">{event.subEvents.length}</p>
                  </div>
                </div>
                <div className="ed-info-row">
                  <CalendarRange size={18} className="ed-info-icon" />
                  <div>
                    <p className="ed-info-label">Dates</p>
                    <p className="ed-info-value">{subEventSummary.dateRange}</p>
                  </div>
                </div>
                <div className="ed-info-row">
                  <MapPin size={18} className="ed-info-icon" />
                  <div>
                    <p className="ed-info-label">Venues</p>
                    <p className="ed-info-value">{subEventSummary.venueCount > 1 ? `${subEventSummary.venueCount} venues` : '1 venue'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Capacity bar */}
            {!hasSubEvents && event.maxParticipants > 0 && (
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
                <p className="ed-section-title"><Layers size={13} /> Sub-Events</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {event.subEvents.map((se) => {
                    const seFree = se.eventType !== 'paid';
                    const seCount = se.participantCount ?? (se.bookings || []).reduce((sum, b) => sum + (b.quantity || 1), 0);
                    const seFull = se.capacity > 0 && seCount >= se.capacity;
                    return (
                      <div key={se._id} className="sev-tile" onClick={() => navigate(`/events/${event._id}/subevents/${se._id}`)}>
                        <EventBanner src={se.image || event.image} alt={se.title} aspect="16 / 10" className="sev-tile-banner-frame" icon={Trophy} />
                        <div className="sev-tile-body">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-base text-gray-900 dark:text-white truncate">{se.title}</p>
                            <span className={seFree ? 'ev-badge-free' : 'ev-badge-paid'} style={{ flexShrink: 0 }}>
                              {seFree ? 'FREE' : `₹${se.price}`}
                            </span>
                          </div>
                          <p className="text-gray-500 text-sm flex items-center gap-1.5">
                            <Calendar size={13} className="flex-shrink-0" /> {formatEventDate(se.date)} · {formatEventTime(se.startTime)}
                          </p>
                          <p className="text-gray-500 text-sm flex items-center gap-1.5 truncate">
                            <MapPin size={13} className="flex-shrink-0" /> <span className="truncate">{se.venue}</span>
                          </p>
                          {/* <div className="flex items-center justify-between mt-1.5">
                            {se.isJoined ? (
                              <span className="ev-badge-approved"><CircleCheck size={12} /> Booked</span>
                            ) : seFull ? (
                              <span className="ev-badge-cancelled">Full</span>
                            ) : (
                              <span className="text-gray-500 text-xs">
                                {seCount}{se.capacity > 0 ? ` / ${se.capacity}` : ''} booked · up to {se.maxTicketsPerBooking}/player
                              </span>
                            )}
                          </div> */}
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
                  <Users size={12} /> Participants ({event.participants?.length || 0})
                  {event.eventType === 'paid' && (
                    <span className="text-yellow-400 ml-2 font-normal normal-case text-xs tracking-normal flex items-center gap-1">
                      <Wallet size={12} /> ₹{revenue} from {paidCount} paid
                    </span>
                  )}
                  {expandParticipants ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
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
                          {p.user?.phone && <p className="text-gray-500 text-xs flex items-center gap-1"><Phone size={11} /> {p.user.phone}</p>}
                          {p.ticketId && <p className="text-gray-500 text-[11px] tracking-wide flex items-center gap-1"><Ticket size={11} /> {p.ticketId}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {event.eventType === 'paid'
                            ? <span className="ev-badge-approved">Paid ₹{p.amountPaid}</span>
                            : <span className="ev-badge-free">Joined</span>}
                          {p.checkedIn ? (
                            <span className="text-green-400 text-[10px] font-bold flex items-center gap-1"><CircleCheck size={11} /> Checked in</span>
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
                <p className="ed-section-title" style={{ marginBottom: 0 }}><DoorOpen size={13} /> Check In a Participant</p>
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
                    <p className="text-gray-500 text-xs">per person</p>
                  </div>
                )}

                {isJoined ? (
                  <>
                    <div className="flex items-center gap-2 mb-3 text-green-400 text-sm font-semibold">
                      <CircleCheck size={16} /> You're in!
                    </div>
                    {event.myParticipation?.ticketId && (
                      <div style={{ background: 'rgba(74,222,128,0.06)', border: '1px dashed rgba(74,222,128,0.4)', borderRadius: 10, padding: '12px 14px', marginBottom: 14, textAlign: 'center' }}>
                        <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Your ticket ID</p>
                        <p className="text-green-400 font-bold" style={{ fontSize: 18, letterSpacing: 1.5 }}>{event.myParticipation.ticketId}</p>
                        <p className="text-gray-500 text-[11px] mt-1">
                          Show this at the entrance to check in{event.myParticipation.checkedIn ? ' — already checked in' : ''}
                        </p>
                      </div>
                    )}
                    <button
                      onClick={handleLeave}
                      disabled={actionLoading}
                      className="g-btn-danger"
                      style={{ width: '100%', padding: '13px', fontSize: 14, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      <DoorOpen size={15} /> {actionLoading ? 'Please wait…' : 'Leave Event'}
                    </button>
                  </>
                ) : isFull ? (
                  <button disabled className="g-btn-secondary" style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed', padding: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Lock size={15} /> Event is Full
                  </button>
                ) : isFree ? (
                  <button
                    onClick={handleJoinFree}
                    disabled={actionLoading}
                    className="g-btn-primary"
                    style={{ width: '100%', padding: '13px', fontSize: 14, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <PartyPopper size={15} /> {actionLoading ? 'Joining…' : 'Join for Free'}
                  </button>
                ) : (
                  <button
                    onClick={handlePay}
                    disabled={actionLoading}
                    className="g-btn-primary"
                    style={{ width: '100%', padding: '13px', fontSize: 14, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <CreditCard size={15} /> {actionLoading ? 'Please wait…' : `Pay ₹${event.price} & Join`}
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
                  style={{ width: '100%', padding: '11px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Pencil size={14} /> Edit Event Details
                </button>
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="g-btn-danger"
                  style={{ width: '100%', padding: '11px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Trash2 size={14} /> {actionLoading ? 'Cancelling…' : 'Cancel Event'}
                </button>
                {event.approvalStatus === 'pending' && (
                  <p className="text-gray-500 text-xs text-center flex items-center justify-center gap-1.5">
                    <Hourglass size={12} /> Awaiting admin approval before participants can join.
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
