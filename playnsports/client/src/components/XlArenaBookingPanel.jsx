import { useState, useEffect, useMemo } from 'react';
import API from '../api/axios';
import { dataStore } from '../utils/dataStore';

// Exclusive turf and subscription booking panel:
// - Single Venue View: Locked exclusively to the current venue (no other arena locations).
// - Hourly Model (turfs, courts): Game (if >1) → Date → Time Slots → [Request] → Payment.
// - Subscription Model (gyms, monthly memberships): Game (if >1) → Daily Hour Slot → [Request] → Payment.
//   (Subscription users pick their preferred daily 1-hour session; NO date selection is shown).
// - Invoice ("YOUR BOOKING"): Updates live with selected ground, plan/game, daily hour or slots, and real total amount.

const TOKEN_AMOUNT = 500;
const WINDOW_DAYS = 30;

const SPORT_EMOJI = {
  'box cricket': '🏏',
  'box football': '⚽',
  cricket: '🏏',
  football: '⚽',
  gym: '🏋️',
  badminton: '🏸',
  tennis: '🎾',
  basketball: '🏀',
  swimming: '🏊',
  yoga: '🧘',
};
const sportEmoji = (s) => SPORT_EMOJI[s?.toLowerCase?.()] || '🏆';

const INCLUDED = [
  'Playing Equipment Available',
  'Free Wi-Fi',
  'Free Parking',
  'Drinking Water',
  'Ample Garden Space',
  'Kids Playing Area',
];

const ARENA_RULES = [
  'Proper sports attire and shoes only — no metal spikes or bare feet on turf/courts.',
  'Report 10 minutes early — sessions start sharp, late arrival eats into slot time.',
  'No outside food, smoking, or alcohol inside the venue premises.',
  'Damage to venue equipment, courts, or machines will be charged.',
];

const isoOf = (d) => d.toISOString().split('T')[0];
const todayISO = () => isoOf(new Date());
const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return isoOf(d);
};
const dayLabel = (ds) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(ds + 'T00:00:00').getDay()];
const fmtDate = (ds) =>
  new Date(ds + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
const slotHours = (s) => {
  const [sh, sm] = s.startTime.split(':').map(Number);
  const [eh, em] = s.endTime.split(':').map(Number);
  return Math.max((eh * 60 + em - (sh * 60 + sm)) / 60, 0) || 1;
};

const XlArenaBookingPanel = ({ ground, user, showMessage, onBooked }) => {
  const [step, setStep] = useState(1);

  // Venue state — locked strictly to the passed venue
  const [locDoc, setLocDoc] = useState(ground || null);
  const [turfId, setTurfId] = useState(null);

  // Selections
  const [gameId, setGameId] = useState(null);
  const [date, setDate] = useState(null);
  const [slotIds, setSlotIds] = useState([]);
  const [selectedHour, setSelectedHour] = useState(null);

  // Booking Request state (when bookingRequestsEnabled is true)
  const [requestStatus, setRequestStatus] = useState(null); // null | 'pending_approval' | 'advance_pending' | 'cancelled'
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [requestDetails, setRequestDetails] = useState(null);

  // Payment state
  const [payMode, setPayMode] = useState('full');
  const [payLoading, setPayLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  // Membership state
  const [xlInfo, setXlInfo] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [memLoading, setMemLoading] = useState(false);

  // Always sync with ground prop
  useEffect(() => {
    if (ground) {
      setLocDoc(ground);
    }
  }, [ground]);

  // Fetch full ground document (with slots) if missing
  useEffect(() => {
    const gid = ground?._id || locDoc?._id;
    if (!gid) return;
    if (locDoc?.slots && locDoc.slots.length > 0 && String(locDoc._id) === String(gid)) return;

    let live = true;
    (async () => {
      try {
        const { data } = await API.get(`/grounds/${gid}`);
        if (live && data) {
          setLocDoc(data);
        }
      } catch {
        /* keep existing locDoc */
      }
    })();
    return () => {
      live = false;
    };
  }, [ground?._id, locDoc?._id, locDoc?.slots]);

  // Active venue helpers
  const activeVenue = locDoc || ground;
  const arenaName = activeVenue?.name || 'Venue';
  const isPool = activeVenue?.venueType === 'pool';
  const bookingRequestsEnabled = !isPool && Boolean(activeVenue?.bookingRequestsEnabled);

  // Subscription Model Detection:
  // Gyms, or any venue with pricingPreference === 'custom' and hourly === false
  const isSubscriptionModel = useMemo(() => {
    return Boolean(
      activeVenue?.venueType === 'gym' ||
        (activeVenue?.pricingPreference === 'custom' && activeVenue?.customPricingTypes?.hourly === false) ||
        (activeVenue?.customPricingTypes?.subscription && !activeVenue?.customPricingTypes?.hourly)
    );
  }, [activeVenue]);

  // Games and Turfs within this venue
  const games = useMemo(() => (locDoc?.sports || []).filter((s) => s.isActive), [locDoc]);
  const game = useMemo(
    () => games.find((s) => String(s._id) === String(gameId)) || games[0] || null,
    [games, gameId]
  );

  const turfs = useMemo(() => {
    const all = [];
    (locDoc?.sports || []).forEach((s) =>
      (s.courts || [])
        .filter((c) => c.isActive)
        .forEach((c) => all.push({ ...c, sportId: s._id, sportName: s.name }))
    );
    return game ? all.filter((t) => String(t.sportId) === String(game._id)) : all;
  }, [locDoc, game]);

  const turf = useMemo(
    () => turfs.find((t) => String(t._id) === String(turfId)) || turfs[0] || null,
    [turfs, turfId]
  );

  // Auto-select game and turf
  useEffect(() => {
    if (games.length >= 1 && !gameId) {
      setGameId(games[0]._id);
    }
  }, [games, gameId]);

  useEffect(() => {
    if (turfs.length >= 1 && !turfId) {
      setTurfId(turfs[0]._id);
    }
  }, [turfs, turfId]);

  // Fetch membership catalogue and current member status
  useEffect(() => {
    const gid = locDoc?._id || ground?._id;
    if (!gid) return;
    API.get(`/xl/${gid}/info`)
      .then(({ data }) => setXlInfo(data))
      .catch(() => setXlInfo(null));
  }, [locDoc?._id, ground?._id]);

  // Active membership plan selection
  const currentPlan = useMemo(() => {
    return (
      selectedPlan ||
      xlInfo?.plans?.[0] || {
        name: 'Standard',
        label: '1 Month Membership',
        price: Number(locDoc?.customSubscriptionPricing?.oneMonth) || 600,
        months: 1,
        validityDays: 30,
      }
    );
  }, [selectedPlan, xlInfo?.plans, locDoc?.customSubscriptionPricing]);

  const subscriptionPrice = Number(currentPlan?.price) || 600;

  // Available Daily Hour Slots for Subscription Model
  const availableHourSlots = useMemo(() => {
    const slots = locDoc?.slots || [];
    const hourMap = new Map();

    if (slots.length > 0) {
      slots.forEach((s) => {
        if (!s.startTime || !s.endTime) return;
        const key = `${s.startTime} — ${s.endTime}`;
        if (!hourMap.has(key)) {
          hourMap.set(key, { label: key, startTime: s.startTime, endTime: s.endTime, slotDoc: s });
        }
      });
    }

    if (hourMap.size === 0) {
      for (let h = 6; h < 22; h++) {
        const sh = String(h).padStart(2, '0') + ':00';
        const eh = String(h + 1).padStart(2, '0') + ':00';
        const key = `${sh} — ${eh}`;
        hourMap.set(key, { label: key, startTime: sh, endTime: eh, slotDoc: null });
      }
    }

    return Array.from(hourMap.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [locDoc?.slots]);

  // Dynamic Stepper stages
  // Hourly Model: [Game (if >1)] → Date → Time Slots → [Request] → Payment
  // Subscription Model: [Game (if >1)] → Hour Slot → [Request] → Payment (NO DATE!)
  const stepKeys = useMemo(() => {
    if (isSubscriptionModel) {
      return [
        ...(games.length > 1 ? ['game'] : []),
        'hour',
        ...(bookingRequestsEnabled ? ['request'] : []),
        'payment',
      ];
    }
    return [
      ...(games.length > 1 ? ['game'] : []),
      'date',
      'slots',
      ...(bookingRequestsEnabled ? ['request'] : []),
      'payment',
    ];
  }, [isSubscriptionModel, games.length, bookingRequestsEnabled]);

  const stepLabels = useMemo(() => {
    const map = {
      game: 'Game',
      date: 'Date',
      slots: 'Time Slots',
      hour: 'Hour Slot',
      request: 'Request',
      payment: 'Payment',
    };
    return stepKeys.map((k) => map[k] || k);
  }, [stepKeys]);

  // Keep step clamped within [1, stepKeys.length]
  useEffect(() => {
    if (step > stepKeys.length) {
      setStep(1);
    }
  }, [stepKeys.length, step]);

  const currentKey = stepKeys[Math.min(Math.max(step - 1, 0), stepKeys.length - 1)] || 'payment';

  // Open slots logic for Hourly Model
  const maxISO = addDays(WINDOW_DAYS - 1);
  const openSlots = useMemo(() => {
    if (isSubscriptionModel || !locDoc?.slots) return [];
    const today = todayISO();
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
    return locDoc.slots.filter((s) => {
      if (s.isBooked || (s.bookedCount || 0) >= s.capacity) return false;
      if (s.date < today || s.date > maxISO) return false;
      if (s.date === today) {
        const [h, m] = s.startTime.split(':').map(Number);
        if (h * 60 + m <= nowMins) return false;
      }
      if (game && String(s.sportId) !== String(game._id)) return false;
      if (turf && s.courtId && String(s.courtId) !== String(turf._id)) return false;
      return true;
    });
  }, [isSubscriptionModel, locDoc, game, turf, maxISO]);

  const openDates = useMemo(() => [...new Set(openSlots.map((s) => s.date))].sort(), [openSlots]);
  const daySlots = useMemo(() => {
    const list = openSlots.filter((s) => s.date === date);
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return list;
  }, [openSlots, date]);

  const selectedSlots = useMemo(() => {
    const map = new Map(daySlots.map((s) => [String(s._id), s]));
    return slotIds.map((id) => map.get(String(id))).filter(Boolean);
  }, [slotIds, daySlots]);

  const pricePerSlot = (game?.pricePerHour || locDoc?.sports?.[0]?.pricePerHour || 0);
  const hourlyTotal = selectedSlots.reduce((sum, s) => sum + Math.round(pricePerSlot * slotHours(s)), 0);

  // Total and Payable amounts
  const total = isSubscriptionModel ? subscriptionPrice : hourlyTotal;
  const payable = isSubscriptionModel
    ? subscriptionPrice
    : payMode === 'full'
    ? total
    : Math.min(TOKEN_AMOUNT, total);

  // Slot continuity helper
  const continuous = (list) => {
    const sorted = [...list].sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].startTime !== sorted[i - 1].endTime) return false;
    }
    return true;
  };

  const toggleSlot = (s) => {
    setSlotIds((prev) =>
      prev.map(String).includes(String(s._id))
        ? prev.filter((id) => String(id) !== String(s._id))
        : [...prev, s._id]
    );
  };

  // Step guards
  const canNext = () => {
    if (currentKey === 'game') return !!gameId;
    if (currentKey === 'date') return !!date;
    if (currentKey === 'slots') return selectedSlots.length >= 1 && continuous(selectedSlots);
    if (currentKey === 'hour') return !!selectedHour;
    if (currentKey === 'request') return requestStatus === 'advance_pending';
    return true;
  };

  const nextHint = () => {
    if (currentKey === 'game') return 'Please select a sport/game.';
    if (currentKey === 'date') return 'Please select a booking date.';
    if (currentKey === 'slots' && selectedSlots.length < 1) return 'Please select at least one time slot.';
    if (currentKey === 'slots') return 'Please select continuous time slots.';
    if (currentKey === 'hour') return 'Please select your preferred daily session hour.';
    if (currentKey === 'request') {
      if (!requestStatus) return 'Please send the booking request to the venue owner first.';
      if (requestStatus === 'pending_approval') return 'Waiting for venue owner confirmation...';
      if (requestStatus === 'cancelled') return 'Booking request was declined. Please pick another session hour.';
    }
    return '';
  };

  // Razorpay loader
  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (document.getElementById('razorpay-script')) return resolve(true);
      const sc = document.createElement('script');
      sc.id = 'razorpay-script';
      sc.src = 'https://checkout.razorpay.com/v1/checkout.js';
      sc.onload = () => resolve(true);
      sc.onerror = () => resolve(false);
      document.body.appendChild(sc);
    });

  // ── Membership Purchase / Activation ──
  const handleMembership = async (targetPlan) => {
    if (user?.role !== 'player') return showMessage?.('Only players can buy membership', 'error');
    if (isSubscriptionModel && !selectedHour) {
      return showMessage?.('Please select your preferred daily session hour first.', 'error');
    }
    setMemLoading(true);
    try {
      if (!(await loadRazorpay())) return showMessage?.('Razorpay failed to load', 'error');
      const plan = targetPlan || currentPlan;
      const { data } = await API.post(`/xl/${locDoc._id}/membership/order`, {
        planName: plan.name,
        preferredHour: selectedHour || '',
      });
      new window.Razorpay({
        key: data.keyId,
        amount: data.amount * 100,
        currency: data.currency,
        name: 'PLAYNSPORTS',
        description: `${arenaName} Membership ${plan.name} — ₹${plan.price}`,
        order_id: data.orderId,
        handler: async (r) => {
          try {
            await API.post(`/xl/${locDoc._id}/membership/verify`, {
              razorpayOrderId: r.razorpay_order_id,
              razorpayPaymentId: r.razorpay_payment_id,
              razorpaySignature: r.razorpay_signature,
              planName: plan.name,
              preferredHour: selectedHour || '',
            });
            showMessage?.(`Membership activated — welcome to ${arenaName} ✅`);
            dataStore.invalidate('dashboard:player:subscriptions');
            dataStore.invalidate('dashboard:player:payments');
            dataStore.invalidate('dashboard:player:bookings');
            const { data: info } = await API.get(`/xl/${locDoc._id}/info`);
            setXlInfo(info);
            setSuccess({
              message: `Membership Activated! Welcome to ${arenaName}`,
              bookings: [
                {
                  date: 'Monthly Pass (30 Days)',
                  startTime: selectedHour?.split('—')?.[0]?.trim() || 'Daily',
                  endTime: selectedHour?.split('—')?.[1]?.trim() || 'Session',
                  ticketId: `MEM-${Date.now().toString().slice(-6)}`,
                },
              ],
              paid: plan.price,
              remaining: 0,
            });
            onBooked?.();
          } catch {
            showMessage?.('Membership verification failed ❌', 'error');
          } finally {
            setMemLoading(false);
          }
        },
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        theme: { color: '#fbbf24' },
        modal: { ondismiss: () => setMemLoading(false) },
      }).open();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Membership order failed', 'error');
      setMemLoading(false);
    }
  };

  // ── Booking Request to Venue Owner ──
  const handleSendBookingRequest = async () => {
    if (isSubscriptionModel) {
      if (!selectedHour) return showMessage?.('Please select your preferred daily session hour.', 'error');
    } else {
      if (selectedSlots.length < 1) return showMessage?.('Please select at least one time slot.', 'error');
      if (!continuous(selectedSlots)) return showMessage?.('Please select continuous time slots.', 'error');
    }
    if (user?.role !== 'player') return showMessage?.('Only players can book', 'error');

    setRequestSubmitting(true);
    try {
      const gid = locDoc._id;
      const payload = isSubscriptionModel
        ? {
            isSubscription: true,
            planName: currentPlan.name,
            preferredHour: selectedHour,
            slotIds: slotIds.length > 0 ? slotIds : [],
            payMode: 'full',
          }
        : { slotIds, payMode };

      const { data } = await API.post(`/xl/${gid}/booking-request`, payload);
      setRequestStatus(data.status || 'pending_approval');
      setRequestDetails(
        data.requestDetails || {
          userName: user?.name,
          game: isSubscriptionModel
            ? `${game?.name || 'Gym'} (${currentPlan?.label || 'Membership'})`
            : game?.name,
          date: isSubscriptionModel ? 'Monthly Pass' : date,
          startTime: isSubscriptionModel ? selectedHour?.split('—')[0]?.trim() : selectedSlots[0]?.startTime,
          endTime: isSubscriptionModel ? selectedHour?.split('—')[1]?.trim() : selectedSlots[selectedSlots.length - 1]?.endTime,
          venueName: locDoc?.name,
          total,
          payable,
        }
      );
      showMessage?.(data.message || 'Booking request sent to venue owner! ⏳ Awaiting confirmation.');
      if (data.status === 'advance_pending') {
        showMessage?.('🎉 Venue owner has already accepted! You can proceed to payment.');
      }
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to send booking request', 'error');
    } finally {
      setRequestSubmitting(false);
    }
  };

  // Check request status from venue owner
  const checkRequestStatus = async (silent = false) => {
    if (!locDoc?._id) return;
    if (!isSubscriptionModel && slotIds.length === 0) return;
    if (!silent) setCheckingStatus(true);
    try {
      const url = isSubscriptionModel
        ? `/xl/${locDoc._id}/my-request-status?isSubscription=true`
        : `/xl/${locDoc._id}/my-request-status?slotIds=${slotIds.join(',')}`;
      const { data } = await API.get(url);
      if (data.hasRequest) {
        if (data.status !== requestStatus) {
          setRequestStatus(data.status);
          if (data.status === 'advance_pending') {
            showMessage?.('🎉 Venue owner approved your request! Proceeding to payment...');
          } else if (data.status === 'cancelled') {
            showMessage?.('Venue owner was unable to accept this request. Please pick another session hour.', 'error');
          }
        }
      }
    } catch {
      // background poll errors ignored
    } finally {
      if (!silent) setCheckingStatus(false);
    }
  };

  // Polling for owner approval when in Request step
  useEffect(() => {
    if (currentKey !== 'request' || requestStatus !== 'pending_approval' || !locDoc?._id) return;
    const interval = setInterval(() => {
      checkRequestStatus(true);
    }, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, requestStatus, locDoc?._id]);

  // Check if request already submitted when entering Request step
  useEffect(() => {
    if (currentKey === 'request' && locDoc?._id && !requestStatus) {
      checkRequestStatus(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey]);

  // ── Hourly Turf Booking Payment ──
  const handlePay = async () => {
    if (selectedSlots.length < 1) return showMessage?.('Please select at least one time slot.', 'error');
    if (!continuous(selectedSlots)) return showMessage?.('Please select continuous time slots.', 'error');
    if (user?.role !== 'player') return showMessage?.('Only players can book', 'error');
    if (bookingRequestsEnabled && requestStatus && requestStatus !== 'advance_pending') {
      return showMessage?.('Venue owner must approve your booking request before payment.', 'error');
    }

    setPayLoading(true);
    try {
      if (!(await loadRazorpay())) return showMessage?.('Razorpay failed to load. Check internet.', 'error');
      const gid = locDoc._id;
      const { data } = await API.post(`/xl/${gid}/arena-order`, { slotIds, payMode });
      new window.Razorpay({
        key: data.keyId,
        amount: data.amount * 100,
        currency: data.currency,
        name: 'PLAYNSPORTS',
        description: `${arenaName} — ${game?.name} · ${selectedSlots.length} slot(s)`,
        order_id: data.orderId,
        handler: async (r) => {
          try {
            const { data: done } = await API.post(`/xl/${gid}/arena-verify`, {
              razorpayOrderId: r.razorpay_order_id,
              razorpayPaymentId: r.razorpay_payment_id,
              razorpaySignature: r.razorpay_signature,
              slotIds,
              payMode,
            });
            setSuccess(done);
            setSlotIds([]);
            setRequestStatus(null);
            setRequestDetails(null);
            onBooked?.();
          } catch (err) {
            showMessage?.(err.response?.data?.message || 'Payment verification failed ❌', 'error');
          } finally {
            setPayLoading(false);
          }
        },
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        theme: { color: '#4ade80' },
        modal: { ondismiss: () => setPayLoading(false) },
      }).open();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to create order', 'error');
      setPayLoading(false);
    }
  };

  const stepState = (n) => (step > n ? 'done' : step === n ? 'active' : 'todo');

  // Summary Card / Invoice — dynamically updates on slot and hour selection
  const summary = (
    <div className="glass-card lg:sticky lg:top-4">
      <p className="font-bebas text-2xl tracking-wide mb-3">Your Booking</p>
      {isSubscriptionModel ? (
        <>
          {[
            ['Ground', locDoc?.name || ground?.name || 'Not selected'],
            ['Plan', currentPlan?.label || '1 Month Membership'],
            ['Session Slot', selectedHour || 'Not selected'],
            ['Daily Access', '1 Hour Session / Day'],
            ['Validity', `${currentPlan?.validityDays || 30} Days Pass`],
            ...(bookingRequestsEnabled && (currentKey === 'request' || currentKey === 'payment')
              ? [
                  [
                    'Owner Approval',
                    requestStatus === 'advance_pending'
                      ? 'Approved ✅'
                      : requestStatus === 'cancelled'
                      ? 'Declined ❌'
                      : requestStatus === 'pending_approval'
                      ? 'Waiting ⏳'
                      : 'Not Requested',
                  ],
                ]
              : []),
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between gap-2 text-sm py-1 border-b border-black/5 dark:border-white/5 last:border-0"
            >
              <span className="text-gray-500">{k}</span>
              <span className="font-semibold text-right capitalize">{v}</span>
            </div>
          ))}
          <div className="flex justify-between items-center mt-3">
            <span className="text-gray-500 text-sm">Total Amount</span>
            <span className="font-bebas text-3xl text-green-400">₹{subscriptionPrice}</span>
          </div>
        </>
      ) : (
        <>
          {[
            ['Ground', locDoc?.name || ground?.name || 'Not selected'],
            ...(turf ? [['Turf Type', turf.name]] : []),
            ['Game', game ? `${sportEmoji(game.name)} ${game.name}` : 'Not selected'],
            ['Date', date ? fmtDate(date) : 'Not selected'],
            ['Time Slots', selectedSlots.length ? selectedSlots.map((s) => `${s.startTime}–${s.endTime}`).join(', ') : '—'],
            ...(bookingRequestsEnabled && (currentKey === 'request' || currentKey === 'payment')
              ? [
                  [
                    'Owner Approval',
                    requestStatus === 'advance_pending'
                      ? 'Approved ✅'
                      : requestStatus === 'cancelled'
                      ? 'Declined ❌'
                      : requestStatus === 'pending_approval'
                      ? 'Waiting ⏳'
                      : 'Not Requested',
                  ],
                ]
              : []),
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between gap-2 text-sm py-1 border-b border-black/5 dark:border-white/5 last:border-0"
            >
              <span className="text-gray-500">{k}</span>
              <span className="font-semibold text-right capitalize">{v}</span>
            </div>
          ))}
          <div className="flex justify-between items-center mt-3">
            <span className="text-gray-500 text-sm">Total Amount</span>
            <span className="font-bebas text-3xl text-green-400">₹{total}</span>
          </div>
        </>
      )}

      {/* Primary Action Button inside Invoice */}
      <button
        onClick={() => {
          if (currentKey === 'request') {
            if (!requestStatus) handleSendBookingRequest();
            else if (requestStatus === 'pending_approval') checkRequestStatus(false);
            else if (requestStatus === 'advance_pending') setStep(step + 1);
            else if (requestStatus === 'cancelled') {
              setRequestStatus(null);
              setStep(step - 1);
            }
          } else if (currentKey === 'payment') {
            if (isSubscriptionModel) handleMembership(currentPlan);
            else handlePay();
          } else {
            if (canNext()) setStep(step + 1);
            else showMessage?.(nextHint(), 'error');
          }
        }}
        disabled={
          currentKey === 'payment'
            ? isSubscriptionModel
              ? memLoading
              : payLoading || total <= 0
            : currentKey === 'request'
            ? requestSubmitting
            : false
        }
        className="w-full mt-3 bg-green-400 hover:bg-green-300 disabled:opacity-40 text-black font-bold py-3 rounded-xl transition-colors cursor-pointer"
      >
        {currentKey === 'game' && 'Next: Select Slot →'}
        {currentKey === 'date' && 'Next: Select Time Slots →'}
        {currentKey === 'slots' &&
          (bookingRequestsEnabled ? 'Proceed to Request →' : 'Proceed to Payment →')}
        {currentKey === 'hour' &&
          (selectedHour
            ? bookingRequestsEnabled
              ? 'Proceed to Request →'
              : 'Proceed to Payment →'
            : 'Select an Hour Slot')}
        {currentKey === 'request' &&
          (!requestStatus
            ? requestSubmitting
              ? 'Sending Request…'
              : 'Send Booking Request'
            : requestStatus === 'pending_approval'
            ? 'Waiting for Owner ⏳'
            : requestStatus === 'advance_pending'
            ? 'Proceed to Payment →'
            : 'Select Different Slot')}
        {currentKey === 'payment' &&
          (isSubscriptionModel
            ? memLoading
              ? 'Processing…'
              : `Pay & Join ₹${subscriptionPrice}`
            : payLoading
            ? 'Processing…'
            : `Pay Now ₹${payable}`)}
      </button>

      <div className="mt-3">
        <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">Included</p>
        {INCLUDED.map((a) => (
          <p key={a} className="text-xs text-gray-500">
            ✓ {a}
          </p>
        ))}
      </div>
    </div>
  );

  // Success Screen
  if (success) {
    return (
      <div className="glass-card text-center py-10">
        <span className="text-5xl">🎉</span>
        <h3 className="font-bebas text-3xl tracking-wide mt-3">{success.message}</h3>
        <p className="text-sm text-gray-500 mt-1">
          Booking Date · {success.bookings?.[0]?.date} ·{' '}
          {success.bookings?.map((b) => `${b.startTime}–${b.endTime}`).join(', ')}
        </p>
        <p className="text-sm mt-2">
          Ticket:{' '}
          <span className="font-mono font-bold">
            {success.bookings?.map((b) => b.ticketId).join(', ')}
          </span>
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Paid ₹{success.paid}
          {success.remaining > 0 ? ` · pay ₹${success.remaining} at the venue` : ''}
        </p>
        {success.earned?.fitcoin > 0 && (
          <p className="mt-3 inline-block text-sm font-bold text-yellow-500 bg-yellow-400/10 border border-yellow-400/25 rounded-xl px-4 py-2">
            🪙 +{Number(success.earned.fitcoin).toLocaleString('en-IN')} Fitcoin earned!
          </p>
        )}
        <p className="text-sm text-gray-500 mt-3">
          Your booking is confirmed. Visit {arenaName} at your scheduled time! 🏟️
        </p>
        <button
          onClick={() => {
            setSuccess(null);
            setStep(1);
          }}
          className="mt-5 bg-green-400 hover:bg-green-300 text-black text-sm font-bold px-6 py-2.5 rounded-xl cursor-pointer"
        >
          Book Another Slot
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Membership Top Strip — shows current membership status or quick plan switch */}
      {xlInfo?.subscriptionEnabled !== false && (
        <div
          className="rounded-2xl p-5 border flex flex-wrap items-center justify-between gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(251,191,36,0.03))',
            borderColor: 'rgba(251,191,36,0.25)',
          }}
        >
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-yellow-500 font-bold">
              {arenaName} Membership
            </p>
            <div className="text-gray-900 dark:text-white font-bold text-lg mt-0.5 flex flex-wrap items-center gap-2">
              {xlInfo?.myMembership ? (
                <>
                  Member · {xlInfo.myMembership.planName}{' '}
                  <span className="text-green-400 text-sm">
                    until {new Date(xlInfo.myMembership.expiresAt).toLocaleDateString('en-IN')}
                  </span>
                </>
              ) : (
                <>
                  <span>{(selectedPlan || xlInfo?.plans?.[0])?.label || '1 Month Membership'} ·</span>
                  <span className="text-yellow-500">₹{subscriptionPrice.toLocaleString('en-IN')}</span>
                  <span className="text-sm text-gray-500 font-normal">
                    /
                    {(selectedPlan || xlInfo?.plans?.[0])?.months &&
                    (selectedPlan || xlInfo?.plans?.[0]).months > 1
                      ? `${(selectedPlan || xlInfo?.plans?.[0]).months} months`
                      : 'month'}
                  </span>
                </>
              )}
            </div>

            {/* Plan selection pills if venue owner configured multiple tiers (1m, 3m, 6m, 1y) */}
            {!xlInfo?.myMembership && Array.isArray(xlInfo?.plans) && xlInfo.plans.length > 1 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {xlInfo.plans.map((p) => {
                  const isSelected = (selectedPlan?.name || xlInfo.plans[0].name) === p.name;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setSelectedPlan(p)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-yellow-400 text-black border-yellow-400 shadow-sm'
                          : 'bg-black/20 text-gray-400 border-white/10 hover:text-white'
                      }`}
                    >
                      {p.label || p.name}: ₹{p.price.toLocaleString('en-IN')}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => handleMembership(selectedPlan || xlInfo?.plans?.[0])}
            disabled={memLoading}
            className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black text-sm font-bold px-5 py-2.5 rounded-xl cursor-pointer"
          >
            {memLoading ? '…' : xlInfo?.myMembership ? '🔁 Renew' : '⭐ Become a Member'}
          </button>
        </div>
      )}

      {/* Membership Venue Banner for subscription models */}
      {isSubscriptionModel && (
        <div className="p-3.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-xs text-amber-300 flex items-center gap-2">
          <span>💳</span>
          <span>
            <strong>Membership Venue:</strong> This venue offers play exclusively through membership subscriptions.
            Select your preferred daily session hour below to join!
          </span>
        </div>
      )}

      {/* Stepper with mathematically equal gaps between all stages */}
      <div className="w-full py-4 px-1 sm:px-2">
        <div className="flex items-center w-full">
          {stepLabels.map((label, i) => {
            const n = i + 1;
            const st = stepState(n);
            const isLast = i === stepLabels.length - 1;
            return (
              <div key={label} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
                {/* Stage Node */}
                <div className="flex flex-col items-center relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (step > n) setStep(n);
                    }}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                      st === 'done'
                        ? 'bg-green-400 text-black ring-4 ring-green-400/20 cursor-pointer'
                        : st === 'active'
                        ? 'bg-zinc-900 dark:bg-black text-green-400 border-2 border-green-400 ring-4 ring-green-400/20'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-gray-400 border border-black/10 dark:border-white/10'
                    }`}
                  >
                    {st === 'done' ? '✓' : n}
                  </button>
                  <span
                    className={`text-[9px] sm:text-xs uppercase tracking-wider font-bold mt-2 text-center whitespace-nowrap transition-colors ${
                      step === n
                        ? 'text-green-400 font-extrabold'
                        : step > n
                        ? 'text-gray-900 dark:text-gray-200'
                        : 'text-gray-400'
                    }`}
                  >
                    {label}
                  </span>
                </div>

                {/* Symmetrical connecting bar between stages */}
                {!isLast && (
                  <div className="flex-1 mx-2 sm:mx-4 h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden self-center -mt-6">
                    <div
                      className={`h-full transition-all duration-300 ${
                        step > n ? 'bg-green-400 w-full' : 'w-0'
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* ── Step: Game (when venue offers multiple sports) ── */}
          {currentKey === 'game' && (
            <div className="glass-card animate-cardIn">
              <h3 className="font-bebas text-2xl tracking-wide">Select Sport / Game</h3>
              <p className="text-sm text-gray-500 mb-4">Which game will you be playing at {arenaName}?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {games.map((s) => {
                  const sel = String(gameId) === String(s._id);
                  const open = (locDoc?.slots || []).filter(
                    (x) =>
                      String(x.sportId) === String(s._id) &&
                      !x.isBooked &&
                      (x.bookedCount || 0) < x.capacity &&
                      x.date >= todayISO()
                  ).length;
                  return (
                    <button
                      key={s._id}
                      onClick={() => setGameId(s._id)}
                      className={`rounded-2xl p-5 text-left border transition-all cursor-pointer ${
                        sel
                          ? 'border-green-400/60 bg-green-400/8'
                          : 'border-black/10 dark:border-white/10 hover:border-green-400/40'
                      }`}
                    >
                      <span className="text-4xl">{sportEmoji(s.name)}</span>
                      <p className="font-bold capitalize mt-2 text-lg">{s.name}</p>
                      {!isSubscriptionModel && (
                        <p className="mt-1">
                          <span className="font-bebas text-2xl text-green-400">₹{s.pricePerHour}</span>
                          <span className="text-xs text-gray-500"> per slot</span>
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {isSubscriptionModel ? 'Available under membership' : `${open}+ Open Slots`}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Turf / Court selection if venue has multiple courts */}
              {turfs.length > 1 && (
                <div className="mt-4 pt-3 border-t border-black/10 dark:border-white/10">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Select Court / Turf</p>
                  <div className="flex flex-wrap gap-2">
                    {turfs.map((t) => (
                      <button
                        key={t._id}
                        onClick={() => setTurfId(t._id)}
                        className={`tab-btn cursor-pointer ${
                          String(turfId) === String(t._id) ? 'tab-active' : 'tab-inactive'
                        }`}
                      >
                        🏟️ {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step: Hour Slot (Subscription Model — NO DATE SELECTION) ── */}
          {currentKey === 'hour' && (
            <div className="glass-card animate-cardIn">
              <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <h3 className="font-bebas text-2xl tracking-wide">Select Daily Session Hour</h3>
                <span className="text-xs uppercase px-2.5 py-1 rounded-full bg-yellow-400/10 text-yellow-500 border border-yellow-400/30 font-bold">
                  {currentPlan?.label || 'Monthly Subscription'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-1">
                Choose your preferred 1-hour daily slot for sessions at {arenaName}.
              </p>
              <p className="text-xs text-gray-400 mb-4">
                Your monthly membership pass grants you daily access to your chosen session hour.
              </p>

              {/* Plan selection pills if venue owner configured multiple tiers */}
              {Array.isArray(xlInfo?.plans) && xlInfo.plans.length > 1 && (
                <div className="mb-4 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Membership Duration & Plan
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {xlInfo.plans.map((p) => {
                      const isSel = (selectedPlan?.name || xlInfo.plans[0].name) === p.name;
                      return (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => setSelectedPlan(p)}
                          className={`text-xs px-3 py-2 rounded-xl border font-bold transition-all cursor-pointer ${
                            isSel
                              ? 'bg-yellow-400 text-black border-yellow-400 shadow-md scale-102'
                              : 'bg-black/20 text-gray-400 border-white/10 hover:text-white'
                          }`}
                        >
                          {p.label || p.name} · ₹{p.price.toLocaleString('en-IN')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Daily Hour Slots Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {availableHourSlots.map((hs) => {
                  const isSel = selectedHour === hs.label;
                  return (
                    <button
                      key={hs.label}
                      type="button"
                      onClick={() => {
                        setSelectedHour(hs.label);
                        if (hs.slotDoc) {
                          setSlotIds([hs.slotDoc._id]);
                        }
                      }}
                      className={`slot-card text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSel
                          ? 'border-green-400/80 bg-green-400/15 ring-2 ring-green-400/30'
                          : 'border-black/10 dark:border-white/10 hover:border-green-400/40 bg-black/5 dark:bg-white/[0.02]'
                      }`}
                    >
                      <p className="font-semibold text-sm">🕐 {hs.label}</p>
                      <p className={`text-xs font-bold mt-1 ${isSel ? 'text-green-400' : 'text-gray-400'}`}>
                        {isSel ? '✓ Selected' : 'Daily Slot'}
                      </p>
                    </button>
                  );
                })}
              </div>

              {selectedHour && (
                <div className="mt-4 p-3 rounded-xl bg-green-400/10 border border-green-400/30 flex items-center justify-between">
                  <span className="text-xs text-green-400 font-semibold">
                    ✓ Preferred Daily Slot: <strong>{selectedHour}</strong>
                  </span>
                  <span className="font-bebas text-xl text-green-400">
                    ₹{subscriptionPrice}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Step: Date (Hourly Model ONLY) ── */}
          {currentKey === 'date' && (
            <div className="glass-card animate-cardIn">
              <h3 className="font-bebas text-2xl tracking-wide">Select Booking Date</h3>
              <p className="text-sm text-gray-500 mb-4">Pick your preferred playing date at {arenaName}</p>
              <div className="flex gap-2 mb-4">
                {[
                  { l: 'Today', d: addDays(0) },
                  { l: 'Tomorrow', d: addDays(1) },
                  { l: 'Day After', d: addDays(2) },
                ].map((q) => {
                  const has = openDates.includes(q.d);
                  return (
                    <button
                      key={q.l}
                      disabled={!has}
                      onClick={() => setDate(q.d)}
                      className={`flex-1 rounded-xl px-3 py-2.5 border text-sm font-bold transition-all disabled:opacity-35 cursor-pointer ${
                        date === q.d
                          ? 'border-green-400/60 bg-green-400/10 text-green-400'
                          : 'border-black/10 dark:border-white/10'
                      }`}
                    >
                      {q.l}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Or pick an upcoming date</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(i)).map((d) => {
                  const has = openDates.includes(d);
                  const sel = date === d;
                  return (
                    <button
                      key={d}
                      disabled={!has}
                      onClick={() => setDate(d)}
                      className={`flex-shrink-0 rounded-xl px-3 py-2 border text-center transition-all disabled:opacity-30 cursor-pointer ${
                        sel
                          ? 'border-green-400/60 bg-green-400/10'
                          : 'border-black/10 dark:border-white/10'
                      }`}
                    >
                      <p className={`text-[11px] font-bold ${sel ? 'text-green-400' : 'text-gray-500'}`}>
                        {dayLabel(d)}
                      </p>
                      <p className="text-sm font-semibold">{new Date(d + 'T00:00:00').getDate()}</p>
                    </button>
                  );
                })}
              </div>
              {date && (
                <p className="text-xs text-green-400 font-bold mt-3">
                  Booking Date · {fmtDate(date)} Selected
                </p>
              )}
            </div>
          )}

          {/* ── Step: Time Slots (Hourly Model ONLY) ── */}
          {currentKey === 'slots' && (
            <div className="glass-card animate-cardIn">
              <h3 className="font-bebas text-2xl tracking-wide">Select Time Slots</h3>
              <p className="text-sm text-gray-500 mb-1">
                {date ? fmtDate(date) : ''}
                {turf ? ` · 🏟️ ${turf.name}` : ''}
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Tap to select — book several continuous hours in one reservation
              </p>
              {daySlots.length === 0 ? (
                <p className="text-gray-500 text-sm">No open slots on this date — please go back and pick another day.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {daySlots.map((s) => {
                    const sel = slotIds.map(String).includes(String(s._id));
                    return (
                      <button
                        key={s._id}
                        onClick={() => toggleSlot(s)}
                        className={`slot-card text-left cursor-pointer ${sel ? 'slot-selected' : 'slot-available'}`}
                      >
                        <p className="font-semibold text-sm">🕐 {s.startTime} — {s.endTime}</p>
                        <p className="text-green-400 text-xs font-bold mt-0.5">
                          ₹{pricePerSlot} · {sel ? '✓ Selected' : 'Tap to add'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedSlots.length > 0 && !continuous(selectedSlots) && (
                <p className="text-xs text-red-400 font-bold mt-3">Please select continuous time slots.</p>
              )}
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-black/10 dark:border-white/10">
                <span className="text-sm text-gray-500">Total Amount</span>
                <span className="font-bebas text-3xl text-green-400">₹{hourlyTotal}</span>
              </div>
            </div>
          )}

          {/* ── Step: Send Booking Request (if bookingRequestsEnabled) ── */}
          {currentKey === 'request' && (
            <div className="glass-card animate-cardIn">
              <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <h3 className="font-bebas text-2xl tracking-wide">Booking Request Confirmation</h3>
                <span className="text-xs uppercase px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-400/20 font-bold">
                  Venue Approval Required
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Submit your booking request to the venue owner. Once confirmed, payment unlocks automatically!
              </p>

              {/* Booking Request Details Card */}
              <div className="rounded-2xl border border-black/10 dark:border-white/10 p-4 bg-black/[0.02] dark:bg-white/[0.02] mb-4">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3">
                  Booking Request Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                    <span className="text-xs text-gray-500 block">👤 User Name</span>
                    <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">{user?.name || 'Player'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                    <span className="text-xs text-gray-500 block">🏆 Game / Plan Opted</span>
                    <span className="font-bold text-gray-900 dark:text-white capitalize mt-0.5 block">
                      {isSubscriptionModel
                        ? `${game?.name || 'Gym'} (${currentPlan?.label || 'Membership'})`
                        : game?.name || 'Standard Turf'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                    <span className="text-xs text-gray-500 block">📅 Date Opted</span>
                    <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">
                      {isSubscriptionModel ? 'Monthly Pass (30 Days)' : date ? fmtDate(date) : '—'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                    <span className="text-xs text-gray-500 block">🕐 Time Slot Opted</span>
                    <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">
                      {isSubscriptionModel
                        ? selectedHour || '—'
                        : selectedSlots.map((s) => `${s.startTime}–${s.endTime}`).join(', ') || '—'}
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 flex justify-between items-center text-xs text-gray-500 flex-wrap gap-2">
                  <span>
                    🏟️ Venue: <strong className="text-gray-900 dark:text-white">{arenaName}</strong>
                    {turf && !isSubscriptionModel ? ` · ${turf.name}` : ''}
                  </span>
                  <span>
                    Total: <strong className="text-green-400 font-bebas text-lg">₹{total}</strong>
                  </span>
                </div>
              </div>

              {/* Status-Driven Content */}
              {!requestStatus && (
                <div className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-4 text-center">
                  <span className="text-3xl block mb-2">📨</span>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                    Send Booking Request to Venue Owner
                  </h4>
                  <p className="text-xs text-gray-500 mb-4 max-w-md mx-auto">
                    The venue owner will review your session request. Once approved, the payment step unlocks automatically!
                  </p>
                  <button
                    onClick={handleSendBookingRequest}
                    disabled={requestSubmitting}
                    className="w-full sm:w-auto px-6 py-3 bg-green-400 hover:bg-green-300 disabled:opacity-50 text-black font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    {requestSubmitting ? 'Sending Request…' : '📨 Send Booking Request to Venue Owner'}
                  </button>
                </div>
              )}

              {requestStatus === 'pending_approval' && (
                <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/5 p-5 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-400/20 text-yellow-400 text-2xl mb-3 animate-pulse">
                    ⏳
                  </div>
                  <h4 className="font-bold text-base text-gray-900 dark:text-white mb-1">
                    Booking Request Sent — Awaiting Venue Owner Approval
                  </h4>
                  <p className="text-xs text-gray-500 mb-3 max-w-md mx-auto">
                    The venue owner has received your request for {arenaName}.
                  </p>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-yellow-400 bg-yellow-400/10 px-3 py-1.5 rounded-full border border-yellow-400/20 mb-4">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                    Auto-checking for approval every 4s
                  </div>
                  <div>
                    <button
                      onClick={() => checkRequestStatus(false)}
                      disabled={checkingStatus}
                      className="text-xs font-semibold px-4 py-2 rounded-lg border border-black/10 dark:border-white/10 hover:border-yellow-400/40 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                    >
                      {checkingStatus ? 'Checking…' : '🔄 Check Status Now'}
                    </button>
                  </div>
                </div>
              )}

              {requestStatus === 'advance_pending' && (
                <div className="rounded-xl border border-green-400/30 bg-green-400/10 p-5 text-center animate-cardIn">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-400/20 text-green-400 text-2xl mb-3">
                    🎉
                  </div>
                  <h4 className="font-bold text-base text-green-400 mb-1">
                    Booking Request Accepted by Venue Owner!
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-4 max-w-md mx-auto">
                    Your request has been approved. You can now proceed to finalize your payment.
                  </p>
                  <button
                    onClick={() => setStep(step + 1)}
                    className="w-full sm:w-auto px-6 py-3 bg-green-400 hover:bg-green-300 text-black font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Proceed to Payment 💳 →
                  </button>
                </div>
              )}

              {requestStatus === 'cancelled' && (
                <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-5 text-center animate-cardIn">
                  <span className="text-3xl block mb-2">❌</span>
                  <h4 className="font-bold text-base text-red-400 mb-1">
                    Booking Request Declined
                  </h4>
                  <p className="text-xs text-gray-500 mb-4 max-w-md mx-auto">
                    The venue owner was unable to accept this booking request. Please select a different session time.
                  </p>
                  <button
                    onClick={() => {
                      setRequestStatus(null);
                      setStep(step - 1);
                    }}
                    className="px-5 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    ‹ Back to Select Slot
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Step: Payment & Confirmation ── */}
          {currentKey === 'payment' && (
            <div className="glass-card animate-cardIn">
              <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <h3 className="font-bebas text-2xl tracking-wide">Payment & Confirmation</h3>
                <span className="text-xs uppercase px-2.5 py-1 rounded-full bg-green-400/10 text-green-400 border border-green-400/20 font-bold">
                  {bookingRequestsEnabled
                    ? 'Request Approved ✓'
                    : isSubscriptionModel
                    ? 'Membership Pass ✓'
                    : 'Direct Booking ✓'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                {isSubscriptionModel
                  ? 'Review your membership details and activate your pass'
                  : 'Review your details and choose your payment option'}
              </p>

              {isSubscriptionModel ? (
                <>
                  {[
                    ['Ground Location', `${arenaName} — ${locDoc?.address || ''}`],
                    ['Membership Plan', currentPlan?.label || '1 Month Membership'],
                    ['Daily Session Hour', selectedHour || '—'],
                    ['Access Type', 'Daily 1-Hour Member Session'],
                    ['Validity', `${currentPlan?.validityDays || 30} Days Pass`],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="flex justify-between gap-3 text-sm py-1.5 border-b border-black/5 dark:border-white/5"
                    >
                      <span className="text-gray-500 flex-shrink-0">{k}</span>
                      <span className="font-semibold text-right capitalize">{v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-sm font-bold">Total Membership Fee</span>
                    <span className="font-bebas text-3xl text-green-400">₹{subscriptionPrice}</span>
                  </div>
                </>
              ) : (
                <>
                  {[
                    ['Ground Location', `${arenaName} — ${locDoc?.address || ''}`],
                    ...(turf ? [['Turf Type', turf.name]] : []),
                    ['Sport', game ? `${game.name}` : '—'],
                    ['Booking Date', date ? fmtDate(date) : '—'],
                    ['Time Slots', selectedSlots.map((s) => `${s.startTime}–${s.endTime}`).join(', ') || '—'],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="flex justify-between gap-3 text-sm py-1.5 border-b border-black/5 dark:border-white/5"
                    >
                      <span className="text-gray-500 flex-shrink-0">{k}</span>
                      <span className="font-semibold text-right capitalize">{v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-sm">Total Amount</span>
                    <span className="font-bebas text-3xl text-green-400">₹{total}</span>
                  </div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mt-4 mb-2">Payment Option</p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setPayMode('full')}
                      className={`rounded-xl p-3 text-left border text-sm cursor-pointer ${
                        payMode === 'full' ? 'border-green-400/60 bg-green-400/8' : 'border-black/10 dark:border-white/10'
                      }`}
                    >
                      <p className="font-bold">Full Amount {payMode === 'full' && '✓'}</p>
                      <p className="text-xs text-gray-500">Pay complete amount now — nothing due at the venue</p>
                    </button>
                    <button
                      onClick={() => setPayMode('token')}
                      className={`rounded-xl p-3 text-left border text-sm cursor-pointer ${
                        payMode === 'token' ? 'border-green-400/60 bg-green-400/8' : 'border-black/10 dark:border-white/10'
                      }`}
                    >
                      <p className="font-bold">Token Amount — ₹{Math.min(TOKEN_AMOUNT, total)} now {payMode === 'token' && '✓'}</p>
                      <p className="text-xs text-gray-500">
                        Pay ₹{Math.min(TOKEN_AMOUNT, total)} now to confirm slot
                        {total - Math.min(TOKEN_AMOUNT, total) > 0
                          ? `, ₹${total - Math.min(TOKEN_AMOUNT, total)} at the venue`
                          : ''}
                      </p>
                    </button>
                  </div>
                  <div className="flex justify-between items-center mt-3 text-sm font-bold">
                    <span>Payable Now</span>
                    <span className="font-bebas text-3xl text-green-400">₹{payable}</span>
                  </div>
                </>
              )}

              <p className="text-[11px] text-gray-500 mt-2">🔒 Secure encrypted payment powered by Razorpay</p>
              <div className="mt-3 rounded-xl border border-black/10 dark:border-white/10 p-3">
                {ARENA_RULES.map((r, i) => (
                  <p key={i} className="text-xs text-gray-500 mt-1">
                    • {r}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex-1 border border-black/10 dark:border-white/10 rounded-xl py-3 text-sm font-bold hover:border-green-400/40 cursor-pointer"
              >
                ‹ Back
              </button>
            )}

            {currentKey !== 'payment' && currentKey !== 'request' && (
              <button
                type="button"
                onClick={() => (canNext() ? setStep(step + 1) : showMessage?.(nextHint(), 'error'))}
                className="flex-1 bg-green-400 hover:bg-green-300 text-black font-bold py-3 rounded-xl cursor-pointer"
              >
                {step === stepKeys.length - 1
                  ? bookingRequestsEnabled
                    ? 'Proceed to Request →'
                    : 'Proceed to Payment →'
                  : 'Next Step →'}
              </button>
            )}

            {currentKey === 'request' && (
              <>
                {!requestStatus && (
                  <button
                    type="button"
                    onClick={handleSendBookingRequest}
                    disabled={requestSubmitting}
                    className="flex-1 bg-green-400 hover:bg-green-300 disabled:opacity-50 text-black font-bold py-3 rounded-xl shadow-md cursor-pointer"
                  >
                    {requestSubmitting ? 'Sending Request…' : 'Send Booking Request'}
                  </button>
                )}
                {requestStatus === 'pending_approval' && (
                  <button
                    type="button"
                    onClick={() => checkRequestStatus(false)}
                    disabled={checkingStatus}
                    className="flex-1 bg-yellow-400/20 text-yellow-400 border border-yellow-400/40 hover:bg-yellow-400/30 font-bold py-3 rounded-xl cursor-pointer"
                  >
                    {checkingStatus ? 'Checking…' : '⏳ Waiting for Owner (Check Status)'}
                  </button>
                )}
                {requestStatus === 'advance_pending' && (
                  <button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    className="flex-1 bg-green-400 hover:bg-green-300 text-black font-bold py-3 rounded-xl shadow-md cursor-pointer"
                  >
                    Proceed to Payment 💳 →
                  </button>
                )}
                {requestStatus === 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => {
                      setRequestStatus(null);
                      setStep(step - 1);
                    }}
                    className="flex-1 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 font-bold py-3 rounded-xl cursor-pointer"
                  >
                    Pick Different Hour / Slot
                  </button>
                )}
              </>
            )}

            {currentKey === 'payment' && (
              <button
                type="button"
                onClick={() => {
                  if (isSubscriptionModel) handleMembership(currentPlan);
                  else handlePay();
                }}
                disabled={isSubscriptionModel ? memLoading : payLoading || total <= 0}
                className="flex-1 bg-green-400 hover:bg-green-300 disabled:opacity-50 text-black font-bold py-3 rounded-xl shadow-md cursor-pointer"
              >
                {isSubscriptionModel
                  ? memLoading
                    ? 'Processing…'
                    : `Confirm & Join · ₹${subscriptionPrice}`
                  : payLoading
                  ? 'Processing…'
                  : `Confirm & Pay ₹${payable}`}
              </button>
            )}
          </div>
        </div>

        {/* Right column: Invoice Summary */}
        <div>{summary}</div>
      </div>
    </div>
  );
};

export { XlArenaBookingPanel as ArenaBookingPanel };
export default XlArenaBookingPanel;
