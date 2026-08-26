import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import ContactAdminCard from '../components/events/ContactAdminCard.jsx';
import RegistrationFormModal from '../components/events/RegistrationFormModal.jsx';
import { SPORT_EMOJI, eventLabel, formatEventDate, formatEventTime } from '../components/events/eventConstants.js';
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

const SubEventDetailPage = () => {
  const { id, subId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState('success');
  const [step, setStep] = useState(1); // 1 = choose tickets, 2 = confirm & pay
  const [quantity, setQuantity] = useState(1);
  const [expandParticipants, setExpandParticipants] = useState(false);
  const [checkInInput, setCheckInInput] = useState('');
  const [checkInLoading, setCheckInLoading] = useState(false);
  // Events with formConfig (e.g. National Sports Day) collect extra
  // registration details before the join/pay call goes out.
  const needsRegForm = !!(event?.formConfig?.collectCollegeRegNo || event?.formConfig?.collectYear);
  const [showRegForm, setShowRegForm] = useState(false);

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

  const subEvent = useMemo(() => event?.subEvents?.find((se) => se._id === subId), [event, subId]);

  useEffect(() => { setStep(1); setQuantity(1); }, [subId]);

  /* ── derived ── */
  const isOrganizer = user && event && (
    event.organizer?._id?.toString() === user._id ||
    event.organizer?.toString() === user._id
  );
  const isAdmin = user?.role === 'admin';
  const isFree = subEvent?.eventType !== 'paid';

  // Owner/admin get the full un-shaped event (raw `bookings`), players get
  // the shaped `participantCount` / `isJoined` / `myBooking` fields.
  const bookings = subEvent?.bookings || [];
  const participantCount = subEvent?.participantCount ?? bookings.reduce((sum, b) => sum + (b.quantity || 1), 0);
  const spotsLeft = subEvent?.capacity > 0 ? Math.max(subEvent.capacity - participantCount, 0) : null;
  const isFull = subEvent?.capacity > 0 && spotsLeft <= 0;
  const isJoined = subEvent?.isJoined ?? bookings.some((b) => (b.user?._id || b.user)?.toString() === user?._id);
  const myBooking = subEvent?.myBooking || bookings.find((b) => (b.user?._id || b.user)?.toString() === user?._id) || null;

  const maxBookable = Math.min(
    subEvent?.maxTicketsPerBooking || 1,
    spotsLeft === null ? (subEvent?.maxTicketsPerBooking || 1) : spotsLeft
  );

  /* ── actions ── */
  const handleConfirmFree = async (extra = {}) => {
    setActionLoading(true);
    try {
      await API.post(`/events/${id}/subevents/${subId}/join`, { quantity, ...extra });
      flash('You booked your spot 🎉 Your ticket has been emailed to you.');
      fetchEvent();
    } catch (err) {
      if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        flash('Please verify your email first — head to your profile to verify, then come back and book.', 'error');
      } else {
        flash(err.response?.data?.message || 'Failed to book', 'error');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handlePay = async (extra = {}) => {
    setActionLoading(true);
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      flash('Razorpay failed to load. Check your connection.', 'error');
      setActionLoading(false);
      return;
    }

    try {
      const { data } = await API.post(`/events/${id}/subevents/${subId}/pay/order`, { quantity, ...extra });

      const options = {
        key: data.keyId,
        amount: data.amount * 100,
        currency: data.currency,
        name: 'spotNplay',
        description: `${data.event.title} — ${data.subEvent.title}`,
        order_id: data.orderId,
        handler: async (response) => {
          try {
            await API.post(`/events/${id}/subevents/${subId}/pay/verify`, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              quantity,
              ...extra,
            });
            flash('Payment successful — you booked your spot 🎉');
            fetchEvent();
          } catch (err) {
            flash(err.response?.data?.message || 'Payment verification failed', 'error');
          } finally {
            setActionLoading(false);
          }
        },
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
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

  const handleLeave = async () => {
    if (!window.confirm('Cancel your booking for this sub-event?')) return;
    setActionLoading(true);
    try {
      await API.post(`/events/${id}/subevents/${subId}/leave`);
      flash('Your booking was cancelled');
      fetchEvent();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to cancel booking', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!checkInInput.trim()) return;
    setCheckInLoading(true);
    try {
      const { data } = await API.patch(`/events/${id}/subevents/${subId}/checkin`, { ticketId: checkInInput.trim() });
      flash(data.message);
      setCheckInInput('');
      fetchEvent();
    } catch (err) {
      flash(err.response?.data?.message || 'Check-in failed', 'error');
    } finally {
      setCheckInLoading(false);
    }
  };

  /* ── loading / not-found ── */
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

  if (!event || !subEvent) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <p className="text-6xl mb-4">🔍</p>
          <h2 className="text-2xl font-semibold text-gray-400 mb-4">Sub-event not found</h2>
          <button onClick={() => navigate(`/events/${id}`)} className="g-btn-primary">← Back to Event</button>
        </div>
      </div>
    );
  }

  const bannerImage = subEvent.image || event.image;
  const totalPrice = isFree ? 0 : subEvent.price * quantity;
  const canBook = event.approvalStatus === 'approved' && event.status === 'upcoming' && subEvent.status === 'upcoming' && !isOrganizer && !isAdmin;

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="fixed inset-0 grid-dots pointer-events-none opacity-20" />
      <Navbar />

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
        <button onClick={() => navigate(`/events/${id}`)} className="g-btn-secondary mb-5" style={{ fontSize: 13, padding: '8px 16px' }}>
          ← Back to {event.title}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left / main ── */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {bannerImage ? (
              <img src={bannerImage} alt={subEvent.title} className="ed-hero g-anim-1" />
            ) : (
              <div className="ed-hero-placeholder g-anim-1">{SPORT_EMOJI[event.sport] || '🏅'}</div>
            )}

            <div className="g-anim-2">
              <p className="text-green-400 text-xs uppercase tracking-[0.25em] mb-1">{event.title} · {subEvent.gameTitle || eventLabel(event)}</p>
              <h1 className="font-bebas text-4xl md:text-5xl tracking-wide shimmer-text leading-tight">{subEvent.title}</h1>
              <span className={isFree ? 'ev-badge-free' : 'ev-badge-paid'} style={{ marginTop: 8, display: 'inline-block' }}>
                {isFree ? 'FREE' : `₹${subEvent.price} / ticket`}
              </span>
              {subEvent.status === 'cancelled' && <span className="ev-badge-cancelled" style={{ marginLeft: 8 }}>Cancelled</span>}
            </div>

            <div className="g-anim-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="ed-info-row">
                <span style={{ fontSize: 18 }}>📅</span>
                <div><p className="ed-info-label">Date</p><p className="ed-info-value">{formatEventDate(subEvent.date)}</p></div>
              </div>
              <div className="ed-info-row">
                <span style={{ fontSize: 18 }}>⏰</span>
                <div><p className="ed-info-label">Time</p><p className="ed-info-value">{formatEventTime(subEvent.startTime)} – {formatEventTime(subEvent.endTime)}</p></div>
              </div>
              <div className="ed-info-row sm:col-span-2">
                <span style={{ fontSize: 18 }}>📍</span>
                <div><p className="ed-info-label">{event.eventCategory === 'esports' ? 'Lobby / Stream' : 'Venue'}</p><p className="ed-info-value">{subEvent.venue}</p></div>
              </div>
              {event.eventCategory === 'esports' && (
                <div className="ed-info-row sm:col-span-2">
                  <span style={{ fontSize: 18 }}>🎮</span>
                  <div>
                    <p className="ed-info-label">Esports Details</p>
                    <p className="ed-info-value">
                      {[subEvent.gameTitle || event.gameTitle, subEvent.platform || event.platform, subEvent.matchFormat || event.matchFormat, event.serverRegion].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
              )}
              {event.eventCategory === 'esports' && (subEvent.prizePool > 0 || event.prizePool > 0) && (
                <div className="ed-info-row sm:col-span-2">
                  <span style={{ fontSize: 18 }}>🏆</span>
                  <div>
                    <p className="ed-info-label">Prize Pool</p>
                    <p className="ed-info-value" style={{ color: '#fbbf24' }}>₹{(subEvent.prizePool || event.prizePool).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              )}
              {event.eventCategory === 'esports' && (subEvent.streamUrl || event.streamUrl) && (
                <div className="ed-info-row sm:col-span-2">
                  <span style={{ fontSize: 18 }}>📺</span>
                  <div>
                    <p className="ed-info-label">Stream</p>
                    <a href={subEvent.streamUrl || event.streamUrl} target="_blank" rel="noopener noreferrer" className="ed-info-value text-blue-400 hover:text-blue-300" style={{ textDecoration: 'none' }}>
                      Watch live →
                    </a>
                  </div>
                </div>
              )}
              <div className="ed-info-row">
                <span style={{ fontSize: 18 }}>👥</span>
                <div>
                  <p className="ed-info-label">Booked</p>
                  <p className="ed-info-value">
                    {participantCount}{subEvent.capacity > 0 ? ` / ${subEvent.capacity}` : ' (unlimited)'}
                  </p>
                </div>
              </div>
              <div className="ed-info-row">
                <span style={{ fontSize: 18 }}>🎟️</span>
                <div>
                  <p className="ed-info-label">Max per player</p>
                  <p className="ed-info-value">{subEvent.maxTicketsPerBooking} ticket{subEvent.maxTicketsPerBooking > 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            {subEvent.description && (
              <div className="g-anim-3">
                <p className="ed-section-title">Key Details</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed whitespace-pre-line">{subEvent.description}</p>
              </div>
            )}

            {!isOrganizer && !isAdmin && <ContactAdminCard context={`Sub-event: ${event.title} — ${subEvent.title}`} />}

            {/* Bookings — organizer / admin only */}
            {(isOrganizer || isAdmin) && (
              <div className="g-anim-4">
                <button
                  onClick={() => setExpandParticipants((v) => !v)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  className="ed-section-title flex items-center gap-2 hover:text-green-300 transition-colors"
                >
                  👥 Bookings ({bookings.length}, {participantCount} tickets)
                  {!isFree && (
                    <span className="text-yellow-400 ml-2 font-normal normal-case text-xs tracking-normal">
                      💰 ₹{bookings.reduce((s, b) => s + (b.amountPaid || 0), 0)} collected
                    </span>
                  )}
                  <span style={{ fontSize: 10 }}>{expandParticipants ? '▲' : '▼'}</span>
                </button>

                {expandParticipants && (
                  <div className="flex flex-col gap-2 mt-2 g-slideIn">
                    {bookings.length ? bookings.map((b, i) => (
                      <div key={b.ticketId || i} className="ev-participant-row">
                        {b.user?.avatar ? (
                          <img src={b.user.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div className="g-member-initial" style={{ marginLeft: 0, width: 32, height: 32 }}>{b.user?.name?.charAt(0) || '?'}</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-gray-900 dark:text-white text-sm font-medium truncate">
                            {b.user?.name}{b.quantity > 1 ? ` · ${b.quantity} tickets` : ''}
                          </p>
                          {b.user?.phone && <p className="text-gray-500 text-xs">📞 {b.user.phone}</p>}
                          {b.ticketId && <p className="text-gray-500 text-[11px] tracking-wide">🎟️ {b.ticketId}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {b.paymentStatus === 'paid' ? <span className="ev-badge-approved">Paid ₹{b.amountPaid}</span> : <span className="ev-badge-free">Joined</span>}
                          {b.checkedIn ? <span className="text-green-400 text-[10px] font-bold">✅ Checked in</span> : <span className="text-gray-500 text-[10px]">Not arrived yet</span>}
                        </div>
                      </div>
                    )) : <p className="text-gray-500 text-sm text-center py-4">No bookings yet.</p>}
                  </div>
                )}
              </div>
            )}

            {(isOrganizer || isAdmin) && subEvent.status === 'upcoming' && (
              <div className="g-card g-anim-4 flex flex-col gap-2">
                <p className="ed-section-title" style={{ marginBottom: 0 }}>🚪 Check In a Booking</p>
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
                  <button onClick={handleCheckIn} disabled={checkInLoading || !checkInInput.trim()} className="g-btn-primary" style={{ padding: '0 18px', fontSize: 13 }}>
                    {checkInLoading ? '…' : 'Check In'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Right / booking wizard ── */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-24 self-start">
            {canBook && (
              <div className="ed-pay-box g-anim-2">
                {isJoined ? (
                  <>
                    <div className="flex items-center gap-2 mb-3 text-green-400 text-sm font-semibold"><span>✅</span> You're booked!</div>
                    {myBooking?.ticketId && (
                      <div style={{ background: 'rgba(74,222,128,0.06)', border: '1px dashed rgba(74,222,128,0.4)', borderRadius: 10, padding: '12px 14px', marginBottom: 14, textAlign: 'center' }}>
                        <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Your ticket ID</p>
                        <p className="text-green-400 font-bold" style={{ fontSize: 18, letterSpacing: 1.5 }}>{myBooking.ticketId}</p>
                        {myBooking.quantity > 1 && <p className="text-gray-500 text-[11px] mt-1">Covers {myBooking.quantity} people</p>}
                        <p className="text-gray-500 text-[11px] mt-1">Show this at the entrance{myBooking.checkedIn ? ' — already checked in 🎉' : ''}</p>
                      </div>
                    )}
                    <button onClick={handleLeave} disabled={actionLoading} className="g-btn-danger" style={{ width: '100%', padding: '13px', fontSize: 14 }}>
                      {actionLoading ? 'Please wait…' : '🚪 Cancel Booking'}
                    </button>
                  </>
                ) : isFull ? (
                  <button disabled className="g-btn-secondary" style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed', padding: '13px' }}>🔒 Sub-Event Full</button>
                ) : (
                  <>
                    {/* Step tracker */}
                    <div className="sev-step-track mb-4">
                      <div className={`sev-step-dot ${step === 1 ? 'active' : 'done'}`}>1</div>
                      <div className={`sev-step-line ${step >= 2 ? 'done' : ''}`} />
                      <div className={`sev-step-dot ${step === 2 ? 'active' : ''}`}>2</div>
                    </div>

                    {step === 1 && (
                      <>
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Step 1 · Number of players</p>
                        <div className="flex items-center justify-center gap-4 mb-4">
                          <button type="button" className="sev-qty-btn" disabled={quantity <= 1} onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
                          <span className="font-bebas text-4xl text-white" style={{ minWidth: 40, textAlign: 'center' }}>{quantity}</span>
                          <button type="button" className="sev-qty-btn" disabled={quantity >= maxBookable} onClick={() => setQuantity((q) => Math.min(maxBookable, q + 1))}>+</button>
                        </div>
                        <p className="text-gray-500 text-xs text-center mb-4">Up to {maxBookable} ticket{maxBookable > 1 ? 's' : ''} per player{spotsLeft !== null ? ` · ${spotsLeft} spot(s) left` : ''}</p>
                        <button onClick={() => setStep(2)} className="g-btn-primary" style={{ width: '100%', padding: '13px', fontSize: 14 }}>Continue →</button>
                      </>
                    )}

                    {step === 2 && (
                      <>
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Step 2 · Confirm & Book</p>
                        <div className="flex flex-col gap-1.5 mb-4 text-sm">
                          <div className="flex justify-between"><span className="text-gray-500">Sub-event</span><span className="font-medium text-right">{subEvent.title}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Tickets</span><span className="font-medium">{quantity}</span></div>
                          {!isFree && <div className="flex justify-between"><span className="text-gray-500">Price / ticket</span><span className="font-medium">₹{subEvent.price}</span></div>}
                        </div>
                        {!isFree && (
                          <div className="mb-4">
                            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Total</p>
                            <p className="ed-price-big">₹{totalPrice}</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button onClick={() => setStep(1)} className="g-btn-secondary" style={{ flex: 1, padding: '12px', fontSize: 13 }}>← Back</button>
                          <button
                            onClick={() => {
                              const fn = isFree ? handleConfirmFree : handlePay;
                              if (needsRegForm) setShowRegForm(true);
                              else fn();
                            }}
                            disabled={actionLoading}
                            className="g-btn-primary"
                            style={{ flex: 2, padding: '12px', fontSize: 14 }}
                          >
                            {actionLoading ? 'Please wait…' : isFree ? '🎉 Confirm Booking' : `💳 Pay ₹${totalPrice} & Book`}
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {(isOrganizer || isAdmin) && (
              <div className="g-card g-anim-3 flex flex-col gap-3">
                <p className="ed-section-title" style={{ marginBottom: 0 }}>Manage</p>
                <p className="text-gray-500 text-xs">Edit sub-event details (venue, time, price, capacity) from the parent event's "Edit Event" screen.</p>
                <button onClick={() => navigate(`/events/${id}`)} className="g-btn-secondary" style={{ width: '100%', padding: '11px', fontSize: 13 }}>
                  ← Back to Manage Event
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showRegForm && (
        <RegistrationFormModal
          event={event}
          onClose={() => setShowRegForm(false)}
          onSubmit={async (payload) => {
            setShowRegForm(false);
            if (isFree) await handleConfirmFree(payload);
            else await handlePay(payload);
          }}
        />
      )}
    </div>
  );
};

export default SubEventDetailPage;
