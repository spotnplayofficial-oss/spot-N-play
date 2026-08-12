import { useState, useEffect, useCallback } from 'react';
import API from '../api/axios';

const useLocalStyles = () => {
  useEffect(() => {
    if (document.getElementById('pbp-styles')) return;
    const style = document.createElement('style');
    style.id = 'pbp-styles';
    style.textContent = `
      .pbp .glass-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(0,0,0,0.06); border-radius: 24px; padding: 24px; }
      html.dark .pbp .glass-card { border-color: rgba(255,255,255,0.06); }
      .pbp .tab-btn { padding: 8px 16px; border-radius: 12px; font-size: 12px; font-weight: 600; white-space: nowrap; cursor: pointer; transition: all .2s ease; }
      .pbp .tab-active { background: rgba(74,222,128,0.12); color: #4ade80; border: 1px solid rgba(74,222,128,0.25); }
      .pbp .tab-inactive { background: transparent; color: #6b7280; border: 1px solid rgba(107,114,128,0.2); }
      .pbp .slot-card { border-radius: 16px; padding: 14px; border: 1px solid; cursor: pointer; transition: all .15s ease; }
      .pbp .slot-card.girls { background: rgba(236,72,153,0.08); border-color: rgba(236,72,153,0.3); }
      .pbp .slot-card.general { background: rgba(59,130,246,0.06); border-color: rgba(59,130,246,0.25); }
      .pbp .slot-card.full { opacity: 0.5; cursor: not-allowed; }
      .pbp .slot-card.chosen { box-shadow: 0 0 0 2px #4ade80; }
      .pbp .slot-card:hover:not(.full) { transform: translateY(-1px); }
      .pbp .badge-girls { background: rgba(236,72,153,0.15); color: #ec4899; border: 1px solid rgba(236,72,153,0.3); }
      .pbp .badge-general { background: rgba(59,130,246,0.15); color: #3b82f6; border: 1px solid rgba(59,130,246,0.3); }
      .pbp .input-field { width: 100%; background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 10px 12px; color: inherit; font-size: 13px; outline: none; }
      html.dark .pbp .input-field { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); }
      .pbp .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 5px; display: block; }
      .pbp .btn-primary { background: linear-gradient(135deg,#4ade80,#22c55e); color: #052e12; font-weight: 700; border-radius: 12px; padding: 12px 24px; font-size: 14px; }
      .pbp .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
      .pbp .btn-secondary { background: rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.1); color: #6b7280; font-weight: 600; border-radius: 12px; padding: 10px 20px; font-size: 13px; }
      html.dark .pbp .btn-secondary { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); }
      .pbp .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 60; display: flex; align-items: center; justify-content: center; padding: 16px; }
      .pbp .modal-box { background: #0f0f0f; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 24px; max-width: 420px; width: 100%; color: #fff; }
    `;
    document.head.appendChild(style);
  }, []);
};

const STEPS = [
  { n: 1, label: 'Date' },
  { n: 2, label: 'Slot' },
  { n: 3, label: 'Plan' },
  { n: 4, label: 'Confirm' },
];

const fmtTime = (t) => {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};
const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};
const dateLabel = (n) => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : new Date(addDays(n)).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }));

const loadRazorpayScript = () => new Promise((resolve) => {
  if (document.getElementById('razorpay-script')) return resolve(true);
  const script = document.createElement('script');
  script.id = 'razorpay-script';
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

// Same numbered-circle stepper look GroundDetail's own booking wizard uses,
// generalized to N steps instead of 3, with click-to-jump-back on any
// already-completed step (never forward past what's actually chosen).
const Stepper = ({ step, onJump }) => (
  <div className="flex items-center gap-2 mb-5">
    {STEPS.map((s, idx) => (
      <div key={s.n} className="flex items-center gap-2 flex-1">
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <button
            type="button"
            disabled={s.n >= step}
            onClick={() => onJump(s.n)}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step > s.n ? 'bg-green-400 text-black cursor-pointer' : step === s.n ? 'bg-green-400/20 text-green-400 border-2 border-green-400' : 'bg-black/5 dark:bg-white/5 text-gray-500 border border-black/10 dark:border-white/10'
            }`}
          >
            {step > s.n ? '✓' : s.n}
          </button>
          <span className={`text-[10px] uppercase tracking-wider ${step >= s.n ? 'text-green-400' : 'text-gray-500'}`}>{s.label}</span>
        </div>
        {idx < STEPS.length - 1 && <div className={`h-0.5 flex-1 rounded ${step > s.n ? 'bg-green-400' : 'bg-black/10 dark:bg-white/10'}`} />}
      </div>
    ))}
  </div>
);

const BackButton = ({ onClick, label = 'Back' }) => (
  <button onClick={onClick} className="text-gray-600 hover:text-gray-900 dark:hover:text-white text-xs w-fit flex items-center gap-1 transition-colors mb-3">
    ← {label}
  </button>
);

const PoolBookingPanel = ({ ground, user, showMessage }) => {
  useLocalStyles();
  const [step, setStep] = useState(1);

  const [dayOffset, setDayOffset] = useState(0);
  const [availability, setAvailability] = useState(null);
  const [checkoutInfo, setCheckoutInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePoolId, setActivePoolId] = useState(null);

  const [confirmSlot, setConfirmSlot] = useState(null); // girls-only popup pending
  const [chosenSlot, setChosenSlot] = useState(null);
  const [membershipPlanId, setMembershipPlanId] = useState('');
  const [partySize, setPartySize] = useState(1);
  const [includeRegistration, setIncludeRegistration] = useState(false);
  const [certUrl, setCertUrl] = useState('');
  const [certUploading, setCertUploading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [ticket, setTicket] = useState(null);

  const date = addDays(dayOffset);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [avail, info] = await Promise.all([
        API.get(`/pools/${ground._id}/availability`, { params: { date } }),
        checkoutInfo ? Promise.resolve({ data: checkoutInfo }) : API.get(`/pools/${ground._id}/checkout-info`),
      ]);
      setAvailability(avail.data);
      if (!checkoutInfo) setCheckoutInfo(info.data);
      setActivePoolId((prev) => prev || avail.data.pools?.[0]?.poolId || null);
      if (info.data?.medicalCertificateUrl && !certUrl) setCertUrl(info.data.medicalCertificateUrl);
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to load pool availability', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ground._id, date]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    if (checkoutInfo?.membershipPlans?.length && !membershipPlanId) setMembershipPlanId(checkoutInfo.membershipPlans[0]._id);
  }, [checkoutInfo, membershipPlanId]);

  const activePool = availability?.pools?.find((p) => p.poolId === activePoolId) || availability?.pools?.[0];
  const selectedPlan = checkoutInfo?.membershipPlans?.find((p) => p._id === membershipPlanId);
  const estimatedTotal = selectedPlan ? selectedPlan.price * partySize + (includeRegistration ? checkoutInfo.registrationFee : 0) : 0;

  const jumpTo = (n) => { if (n < step) setStep(n); };

  const handleSlotClick = (slot) => {
    if (slot.bookedCount >= slot.capacity) return;
    if (slot.category === 'girls_only') {
      setConfirmSlot(slot);
    } else {
      setChosenSlot(slot);
      setPartySize(1);
      setIncludeRegistration(false);
      setStep(3);
    }
  };

  const handleCertUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCertUploading(true);
    try {
      const formData = new FormData();
      formData.append('certificate', file);
      const { data } = await API.post('/upload/certificate', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setCertUrl(data.fileUrl);
      showMessage?.('Certificate uploaded ✅');
    } catch {
      showMessage?.('Certificate upload failed', 'error');
    } finally {
      setCertUploading(false);
    }
  };

  const handlePay = async () => {
    if (!chosenSlot || !membershipPlanId) return;
    setPaying(true);
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) { showMessage?.('Razorpay failed to load. Check your connection.', 'error'); setPaying(false); return; }

    const bookingBody = {
      poolId: activePool.poolId,
      date,
      startTime: chosenSlot.startTime,
      membershipPlanId,
      partySize,
      includeRegistration,
    };

    try {
      const { data } = await API.post(`/pools/${ground._id}/order`, bookingBody);
      const options = {
        key: data.keyId,
        amount: data.amount * 100,
        currency: data.currency,
        name: 'PLAYNSPORTS',
        description: `${ground.name} — ${activePool.name} — ${date} ${fmtTime(chosenSlot.startTime)}`,
        order_id: data.orderId,
        handler: async (response) => {
          try {
            const { data: result } = await API.post(`/pools/${ground._id}/verify`, {
              ...bookingBody,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              medicalCertificateUrl: certUrl,
            });
            setTicket(result.booking);
            showMessage?.('Payment successful — booked 🎉');
            fetchAll();
          } catch (err) {
            showMessage?.(err.response?.data?.message || 'Payment verification failed', 'error');
          } finally {
            setPaying(false);
          }
        },
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        theme: { color: '#4ade80' },
        modal: { ondismiss: () => { showMessage?.('Payment cancelled', 'error'); setPaying(false); } },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Could not start payment', 'error');
      setPaying(false);
    }
  };

  const resetWizard = () => {
    setTicket(null);
    setStep(1);
    setChosenSlot(null);
    setMembershipPlanId(checkoutInfo?.membershipPlans?.[0]?._id || '');
  };

  if (ticket) {
    return (
      <div className="pbp glass-card text-center py-12">
        <span className="text-5xl block mb-3">🎟️</span>
        <h3 className="font-bebas text-2xl tracking-wide mb-1">BOOKING CONFIRMED</h3>
        <p className="text-gray-500 text-sm mb-4">Your ticket has been emailed to you — it's also in your dashboard notifications.</p>
        <div className="inline-block bg-green-400/10 border border-dashed border-green-400/40 rounded-xl px-6 py-3 mb-4">
          <p className="text-[10px] text-green-500 uppercase tracking-widest">Ticket ID</p>
          <p className="text-xl font-bold tracking-widest">{ticket.ticketId}</p>
        </div>
        <p className="text-gray-500 text-xs">{ticket.poolName} · {ticket.date} · {fmtTime(ticket.startTime)}–{fmtTime(ticket.endTime)} · {ticket.partySize} people</p>
        <button className="btn-secondary mt-5" onClick={resetWizard}>Book another slot</button>
      </div>
    );
  }

  if (availability?.notice && !availability.pools?.length) {
    return (
      <div className="pbp glass-card text-center py-16">
        <span className="text-5xl block mb-4">🚧</span>
        <p className="text-gray-500 text-sm">{availability.notice}</p>
      </div>
    );
  }

  return (
    <div className="pbp glass-card">
      <h3 className="font-bebas text-2xl text-gray-900 dark:text-white tracking-wide mb-1">🏊 BOOK A POOL SESSION</h3>
      <p className="text-gray-500 text-sm mb-5">Pick a date, then a slot, then your membership plan to confirm.</p>

      <Stepper step={step} onJump={jumpTo} />

      {/* ── Step 1: Date (+ pool, if more than one) ── */}
      {step === 1 && (
        <div>
          {availability?.pools?.length > 1 && (
            <div className="mb-4">
              <label className="label">Pool</label>
              <div className="flex gap-2">
                {availability.pools.map((p) => (
                  <button key={p.poolId} onClick={() => setActivePoolId(p.poolId)} className={`tab-btn ${activePoolId === p.poolId ? 'tab-active' : 'tab-inactive'}`}>{p.name}</button>
                ))}
              </div>
            </div>
          )}
          <label className="label">Date</label>
          <div className="flex gap-2 mb-5">
            {[0, 1, 2].map((n) => (
              <button key={n} onClick={() => setDayOffset(n)} className={`tab-btn ${dayOffset === n ? 'tab-active' : 'tab-inactive'}`}>{dateLabel(n)}</button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => setStep(2)} disabled={loading || !activePool}>Continue →</button>
        </div>
      )}

      {/* ── Step 2: Slot ── */}
      {step === 2 && (
        <div>
          <BackButton onClick={() => setStep(1)} label="Change date" />
          <p className="text-sm text-gray-500 mb-3">{activePool?.name} · {dateLabel(dayOffset)}</p>

          {loading && <p className="text-gray-500 text-sm py-8 text-center">Loading slots…</p>}
          {!loading && activePool?.slots?.length === 0 && <p className="text-gray-500 text-sm italic py-8 text-center">No sessions scheduled for {dateLabel(dayOffset).toLowerCase()}.</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activePool?.slots?.map((slot) => {
              const full = slot.bookedCount >= slot.capacity;
              return (
                <div key={slot.startTime} onClick={() => handleSlotClick(slot)} className={`slot-card ${slot.category === 'girls_only' ? 'girls' : 'general'} ${full ? 'full' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{fmtTime(slot.startTime)} – {fmtTime(slot.endTime)}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${slot.category === 'girls_only' ? 'badge-girls' : 'badge-general'}`}>
                      {slot.category === 'girls_only' ? '👧 Girls Only' : 'General'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{full ? 'Fully booked' : `${slot.capacity - slot.bookedCount} spots left of ${slot.capacity}`}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Step 3: Plan ── */}
      {step === 3 && chosenSlot && checkoutInfo && (
        <div>
          <BackButton onClick={() => setStep(2)} label="Change slot" />
          <p className="text-sm text-gray-500 mb-4">
            {activePool?.name} · {dateLabel(dayOffset)} · {fmtTime(chosenSlot.startTime)}–{fmtTime(chosenSlot.endTime)}
            {chosenSlot.category === 'girls_only' && <span className="ml-2 badge-girls text-[10px] px-2 py-0.5 rounded-full">Girls Only</span>}
          </p>

          <div className="mb-4">
            <label className="label">Membership plan</label>
            <div className="flex flex-col gap-2">
              {checkoutInfo.membershipPlans.map((plan) => (
                <label key={plan._id} className={`slot-card general flex items-center gap-3 ${membershipPlanId === plan._id ? 'chosen' : ''}`} style={{ cursor: 'pointer' }}>
                  <input type="radio" name="plan" checked={membershipPlanId === plan._id} onChange={() => setMembershipPlanId(plan._id)} />
                  <span className="text-sm font-semibold">{plan.name}</span>
                  <span className="text-xs text-gray-500 ml-auto">₹{plan.price} {plan.billingLabel}</span>
                </label>
              ))}
              {checkoutInfo.membershipPlans.length === 0 && <p className="text-gray-500 text-xs italic">No membership plans set up yet — contact the venue.</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="label">Party size (max {checkoutInfo.maxPartySize})</label>
              <input type="number" min="1" max={checkoutInfo.maxPartySize} className="input-field" value={partySize}
                onChange={(e) => setPartySize(Math.max(1, Math.min(Number(e.target.value) || 1, checkoutInfo.maxPartySize)))} />
            </div>
            {checkoutInfo.registrationFee > 0 && !checkoutInfo.alreadyRegistered && (
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-xs text-gray-500">
                  <input type="checkbox" checked={includeRegistration} onChange={(e) => setIncludeRegistration(e.target.checked)} />
                  Add one-time registration ₹{checkoutInfo.registrationFee}
                </label>
              </div>
            )}
          </div>

          <div className="mb-5">
            <label className="label">Medical certificate (optional — stored on your profile if uploaded)</label>
            {certUrl ? (
              <div className="flex items-center gap-3 text-xs">
                <a href={certUrl} target="_blank" rel="noreferrer" className="text-green-500 underline">📄 Certificate on file — view</a>
                <label className="btn-secondary text-xs cursor-pointer">{certUploading ? 'Uploading…' : 'Replace'}<input type="file" accept="image/*,.pdf" className="hidden" onChange={handleCertUpload} disabled={certUploading} /></label>
              </div>
            ) : (
              <label className="btn-secondary text-xs cursor-pointer inline-block">{certUploading ? 'Uploading…' : '📎 Upload certificate'}<input type="file" accept="image/*,.pdf" className="hidden" onChange={handleCertUpload} disabled={certUploading} /></label>
            )}
          </div>

          <button className="btn-primary" onClick={() => setStep(4)} disabled={!membershipPlanId || estimatedTotal <= 0}>Continue to confirm →</button>
        </div>
      )}

      {/* ── Step 4: Confirm ── */}
      {step === 4 && chosenSlot && selectedPlan && (
        <div>
          <BackButton onClick={() => setStep(3)} label="Change plan" />

          <div className="rounded-2xl border border-black/8 dark:border-white/8 p-4 mb-5 flex flex-col gap-2">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Pool</span><span className="font-semibold">{activePool?.name}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Date & time</span><span className="font-semibold">{dateLabel(dayOffset)}, {fmtTime(chosenSlot.startTime)}–{fmtTime(chosenSlot.endTime)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Category</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${chosenSlot.category === 'girls_only' ? 'badge-girls' : 'badge-general'}`}>{chosenSlot.category === 'girls_only' ? '👧 Girls Only' : 'General'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Plan</span><span className="font-semibold">{selectedPlan.name} ({selectedPlan.billingLabel})</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Party size</span><span className="font-semibold">{partySize}</span></div>
            {includeRegistration && <div className="flex justify-between text-sm"><span className="text-gray-500">Registration</span><span className="font-semibold">₹{checkoutInfo.registrationFee}</span></div>}
            {certUrl && <div className="flex justify-between text-sm"><span className="text-gray-500">Certificate</span><span className="font-semibold text-green-500">Attached ✓</span></div>}
          </div>

          <div className="flex items-center justify-between border-t border-black/10 dark:border-white/10 pt-4">
            <div>
              <p className="text-gray-500 text-xs">Total (full payment now)</p>
              <p className="text-2xl font-bold">₹{estimatedTotal}</p>
            </div>
            <button className="btn-primary" onClick={handlePay} disabled={paying}>{paying ? 'Processing…' : `Pay ₹${estimatedTotal}`}</button>
          </div>
        </div>
      )}

      {/* Girls-only confirmation popup */}
      {confirmSlot && (
        <div className="pbp modal-backdrop" onClick={() => setConfirmSlot(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-bebas text-xl tracking-wide mb-2 text-pink-400">👧 GIRLS ONLY SESSION</h4>
            <p className="text-sm text-gray-300 mb-1">This session ({fmtTime(confirmSlot.startTime)} – {fmtTime(confirmSlot.endTime)}) is reserved for female swimmers only.</p>
            {/* <p className="text-sm text-pink-300 mb-5">If you book this and are found not to be female at the venue, <strong>no refund will be given.</strong></p> */}
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setConfirmSlot(null)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={() => { setChosenSlot(confirmSlot); setPartySize(1); setIncludeRegistration(false); setConfirmSlot(null); setStep(3); }}>I understand, continue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoolBookingPanel;
