import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Calendar, Clock, Users, UserPlus, CheckCircle, AlertCircle, ChevronUp, ChevronDown,
  RotateCcw, Sparkles, Send, Shield, Zap, ArrowRight, Check, Receipt, Tag, Info
} from 'lucide-react';
import API from '../api/axios';

// Standard 1-hour slots from 9:00 AM to 7:30 PM
const POOL_MODEL_SLOTS = [
  { id: 'slot-1', startTime: '09:00', endTime: '10:00', label: '09:00 AM - 10:00 AM', tag: 'Morning Shift' },
  { id: 'slot-2', startTime: '10:00', endTime: '11:00', label: '10:00 AM - 11:00 AM', tag: 'Morning Shift' },
  { id: 'slot-3', startTime: '11:00', endTime: '12:00', label: '11:00 AM - 12:00 PM', tag: 'Morning Shift' },
  { id: 'slot-4', startTime: '12:00', endTime: '13:00', label: '12:00 PM - 01:00 PM', tag: 'Noon Shift' },
  { id: 'slot-5', startTime: '13:30', endTime: '14:30', label: '01:30 PM - 02:30 PM', tag: 'Afternoon Shift' },
  { id: 'slot-6', startTime: '14:30', endTime: '15:30', label: '02:30 PM - 03:30 PM', tag: 'Afternoon Shift' },
  { id: 'slot-7', startTime: '15:30', endTime: '16:30', label: '03:30 PM - 04:30 PM', tag: 'Afternoon Shift' },
  { id: 'slot-8', startTime: '16:30', endTime: '17:30', label: '04:30 PM - 05:30 PM', tag: 'Evening Shift' },
  { id: 'slot-9', startTime: '17:30', endTime: '18:30', label: '05:30 PM - 06:30 PM', tag: 'Evening Shift' },
  { id: 'slot-10', startTime: '18:30', endTime: '19:30', label: '06:30 PM - 07:30 PM', tag: 'Prime Evening' },
];

const pad = (n) => String(n).padStart(2, '0');
const t2m = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const m2t = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const fmt12h = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${pad(h12)}:${pad(m)} ${ampm}`;
};

export default function SocialBadmintonBooking({
  ground,
  user,
  mySocialBookings = [],
  onBookingSuccess,
  showMessage,
}) {
  // ── 2-Day Calendar Options (Today and Tomorrow only) ──
  const { todayStr, tomorrowStr, dayOptions } = useMemo(() => {
    const now = new Date();
    const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const t1 = new Date(t0);
    t1.setDate(t1.getDate() + 1);

    const fmtDate = (d) => {
      const y = d.getFullYear();
      const m = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      return `${y}-${m}-${day}`;
    };

    const d0Str = fmtDate(t0);
    const d1Str = fmtDate(t1);

    return {
      todayStr: d0Str,
      tomorrowStr: d1Str,
      dayOptions: [
        {
          date: d0Str,
          label: 'Today',
          dayName: t0.toLocaleDateString('en-US', { weekday: 'short' }),
          monthDay: t0.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        },
        {
          date: d1Str,
          label: 'Tomorrow',
          dayName: t1.toLocaleDateString('en-US', { weekday: 'short' }),
          monthDay: t1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        },
      ],
    };
  }, []);

  // Multi-day selection (min 1, max 2: Today and/or Tomorrow)
  const [selectedDates, setSelectedDates] = useState([todayStr]);

  // Tab: 'available' ("Select slot") or 'dial' ("custom booking")
  const [slotType, setSlotType] = useState('available');

  // Type 1: Selected Pool Slot
  const [selectedPoolSlot, setSelectedPoolSlot] = useState(null);

  // Type 2: Custom Booking State (Hours 9 AM to 7 PM, unrestricted minutes 00-59)
  const [dialHour, setDialHour] = useState(9); // 9-12 (AM) or 12, 1-7 (PM)
  const [dialMinute, setDialMinute] = useState(0); // 0 to 59
  const [dialAmPm, setDialAmPm] = useState('AM'); // 'AM' or 'PM'

  // Player count: 1 to 4
  const [partySize, setPartySize] = useState(1);

  // Team Up data & interaction
  const [teamUpBookings, setTeamUpBookings] = useState([]);
  const [teamUpLoading, setTeamUpLoading] = useState(false);
  const [teamUpNote, setTeamUpNote] = useState({});
  const [sendingTeamUpId, setSendingTeamUpId] = useState(null);

  // Send Team Up Request for a specific booked slot
  const [teamUpModalOpen, setTeamUpModalOpen] = useState(false);
  const [teamUpTargetSlot, setTeamUpTargetSlot] = useState(null);
  const [customTeamUpNote, setCustomTeamUpNote] = useState('');
  const [sendingCustomTeamUp, setSendingCustomTeamUp] = useState(false);

  // Received Team Up Requests (for the booked user)
  const [receivedTeamUpRequests, setReceivedTeamUpRequests] = useState([]);
  const [loadingReceivedRequests, setLoadingReceivedRequests] = useState(false);
  const [respondingRequestId, setRespondingRequestId] = useState(null);

  // Action Loading
  const [submitting, setSubmitting] = useState(false);
  const [extendingId, setExtendingId] = useState(null);

  // Clock ticker for live countdowns
  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeMs(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Dynamic displayed slots (derive softly from ground.slots if present, else default POOL_MODEL_SLOTS)
  const displayedSlots = useMemo(() => {
    if (ground?.slots && ground.slots.length > 0) {
      const map = new Map();
      ground.slots.forEach((s, idx) => {
        if (!s.startTime || !s.endTime) return;
        const key = `${s.startTime}-${s.endTime}`;
        if (!map.has(key)) {
          const startH = parseInt(s.startTime.split(':')[0], 10);
          let tag = 'General Slot';
          if (startH < 12) tag = 'Morning Shift';
          else if (startH < 14) tag = 'Noon Shift';
          else if (startH < 18) tag = 'Afternoon Shift';
          else tag = 'Evening Shift';

          map.set(key, {
            id: s._id ? String(s._id) : `slot-${idx + 1}`,
            startTime: s.startTime,
            endTime: s.endTime,
            label: `${fmt12h(s.startTime)} - ${fmt12h(s.endTime)}`,
            tag,
          });
        }
      });
      const extracted = Array.from(map.values()).sort((a, b) => t2m(a.startTime) - t2m(b.startTime));
      if (extracted.length > 0) return extracted;
    }
    return POOL_MODEL_SLOTS;
  }, [ground?.slots]);

  // Dynamically derive operating window boundaries from venue slots if configured
  const operatingWindow = useMemo(() => {
    if (ground?.slots && ground.slots.length > 0) {
      const starts = ground.slots.map((s) => t2m(s.startTime)).filter((m) => m > 0);
      const ends = ground.slots.map((s) => t2m(s.endTime)).filter((m) => m > 0);
      if (starts.length > 0 && ends.length > 0) {
        const minM = Math.min(...starts);
        const maxM = Math.max(...ends) - 60;
        if (maxM >= minM) {
          return {
            minMins: minM,
            maxMins: maxM,
            earliestLabel: fmt12h(m2t(minM)),
            latestLabel: fmt12h(m2t(maxM)),
          };
        }
      }
    }
    return {
      minMins: 9 * 60,
      maxMins: 19 * 60,
      earliestLabel: '09:00 AM',
      latestLabel: '07:00 PM',
    };
  }, [ground?.slots]);

  // Dynamically derive effective base fee (Custom price preference vs Standard ground rate vs Social free)
  const effectiveBaseFee = useMemo(() => {
    if (ground?.pricingPreference === 'custom' && ground?.customPricePerHour > 0) {
      return Number(ground.customPricePerHour);
    }
    return Number(ground?.pricePerHour || (ground?.sports?.[0]?.pricePerHour || 0));
  }, [ground]);

  // Compute dialed 24h start & end times (dynamic operating window, exactly 1-hour session)
  const { dialStart24, dialEnd24, dialDurationValid, dialError } = useMemo(() => {
    let h24 = dialHour % 12;
    if (dialAmPm === 'PM') h24 += 12;

    const startMins = h24 * 60 + dialMinute;
    const endMins = startMins + 60; // 1-hour session

    let err = null;
    if (startMins < operatingWindow.minMins) {
      err = `Earliest start time is ${operatingWindow.earliestLabel}`;
    } else if (startMins > operatingWindow.maxMins) {
      err = `Latest start time is ${operatingWindow.latestLabel}`;
    }

    return {
      dialStart24: m2t(startMins),
      dialEnd24: m2t(endMins),
      dialDurationValid: !err,
      dialError: err,
    };
  }, [dialHour, dialMinute, dialAmPm, operatingWindow]);

  // Toggle date in 2-day selection
  const toggleDate = (dStr) => {
    if (selectedDates.includes(dStr)) {
      if (selectedDates.length === 1) {
        showMessage?.('You must select at least 1 day (minimum 1, maximum 2).', 'error');
        return;
      }
      setSelectedDates(selectedDates.filter((d) => d !== dStr));
    } else {
      setSelectedDates([...selectedDates, dStr]);
    }
  };

  // Determine active start and end time based on slotType
  const activeTimeWindow = useMemo(() => {
    if (slotType === 'available') {
      if (!selectedPoolSlot) return null;
      return {
        startTime: selectedPoolSlot.startTime,
        endTime: selectedPoolSlot.endTime,
      };
    } else {
      if (!dialDurationValid) return null;
      return {
        startTime: dialStart24,
        endTime: dialEnd24,
      };
    }
  }, [slotType, selectedPoolSlot, dialDurationValid, dialStart24, dialEnd24]);

  // Check if a time slot is booked on a date
  const isTimeBookedOnDate = useCallback(
    (dStr, sTime, eTime) => {
      if (!ground?.slots) return false;
      const startM = t2m(sTime);
      const endM = t2m(eTime);
      return ground.slots.some((s) => {
        if (s.date !== dStr || !s.isBooked) return false;
        const bStart = t2m(s.startTime);
        const bEnd = t2m(s.endTime);
        return startM < bEnd && endM > bStart;
      });
    },
    [ground]
  );

  // Check if user has a consecutive booking conflict on date
  const hasConsecutiveConflict = useCallback(
    (dStr, sTime) => {
      const startM = t2m(sTime);
      return mySocialBookings.some((b) => {
        if (b.date !== dStr || b.status === 'cancelled') return false;
        const bStart = t2m(b.startTime);
        return Math.abs(startM - bStart) <= 60;
      });
    },
    [mySocialBookings]
  );

  // Fetch Team Up bookings when partySize === 1
  const fetchTeamUps = useCallback(async () => {
    if (!ground?._id) return;
    setTeamUpLoading(true);
    try {
      const primaryDate = selectedDates[0] || todayStr;
      const { data } = await API.get(`/bookings/grounds/${ground._id}/team-ups?date=${primaryDate}`);
      setTeamUpBookings(Array.isArray(data) ? data : []);
    } catch {
      setTeamUpBookings([]);
    } finally {
      setTeamUpLoading(false);
    }
  }, [ground?._id, selectedDates, todayStr]);

  // Fetch received team up requests for the current user for this venue
  const fetchReceivedTeamUpRequests = useCallback(async () => {
    if (!user || user.role !== 'player' || !ground?._id) return;
    try {
      setLoadingReceivedRequests(true);
      const { data } = await API.get(`/bookings/grounds/${ground._id}/my-team-up-requests`);
      setReceivedTeamUpRequests(Array.isArray(data) ? data : []);
    } catch {
      setReceivedTeamUpRequests([]);
    } finally {
      setLoadingReceivedRequests(false);
    }
  }, [ground?._id, user]);

  useEffect(() => {
    fetchReceivedTeamUpRequests();
  }, [fetchReceivedTeamUpRequests]);

  // Handle responding (accept / decline) to a received team up request
  const handleRespondTeamUp = async (requestId, action) => {
    try {
      setRespondingRequestId(requestId);
      const { data } = await API.patch(`/bookings/team-up-requests/${requestId}/respond`, { action });
      showMessage?.(data.message || `Request ${action}ed!`, 'success');
      fetchReceivedTeamUpRequests();
      if (onBookingSuccess) onBookingSuccess();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to respond to team up request', 'error');
    } finally {
      setRespondingRequestId(null);
    }
  };

  const handleOpenTeamUpModalForSlot = (slotInfo) => {
    if (!user) {
      showMessage?.('Please log in as a Player to send a team up request.', 'error');
      return;
    }
    setTeamUpTargetSlot({
      startTime: slotInfo.startTime,
      endTime: slotInfo.endTime,
      date: slotInfo.date || selectedDates[0] || todayStr,
      tag: slotInfo.tag || '',
    });
    setCustomTeamUpNote('');
    setTeamUpModalOpen(true);
  };

  const handleSubmitCustomTeamUp = async () => {
    if (!teamUpTargetSlot) return;
    setSendingCustomTeamUp(true);
    try {
      const { data } = await API.post(`/bookings/grounds/${ground._id}/team-up-request`, {
        date: teamUpTargetSlot.date,
        startTime: teamUpTargetSlot.startTime,
        endTime: teamUpTargetSlot.endTime,
        note: customTeamUpNote,
      });
      showMessage?.(data.message || 'Team up request sent successfully! 🤝 The booked player has been notified.', 'success');
      setTeamUpModalOpen(false);
      setTeamUpTargetSlot(null);
      fetchTeamUps();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to send team up request', 'error');
    } finally {
      setSendingCustomTeamUp(false);
    }
  };

  useEffect(() => {
    if (partySize === 1) {
      fetchTeamUps();
    }
  }, [partySize, selectedDates, fetchTeamUps]);

  // Send Team Up Request
  const handleSendTeamUpRequest = async (bookingId) => {
    try {
      setSendingTeamUpId(bookingId);
      const note = teamUpNote[bookingId] || '';
      await API.post(`/bookings/grounds/${ground._id}/team-up-request`, {
        bookingId,
        note,
      });
      showMessage?.('Team up request sent successfully! 🤝', 'success');
      setTeamUpNote((prev) => ({ ...prev, [bookingId]: '' }));
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to send team up request', 'error');
    } finally {
      setSendingTeamUpId(null);
    }
  };

  // Helper: check if currently active slot is booked
  const isCurrentSlotBooked = useMemo(() => {
    if (!activeTimeWindow || selectedDates.length === 0) return false;
    return selectedDates.some((d) => isTimeBookedOnDate(d, activeTimeWindow.startTime, activeTimeWindow.endTime));
  }, [activeTimeWindow, selectedDates, isTimeBookedOnDate]);

  // Submit Booking
  const handleBook = async () => {
    if (!activeTimeWindow) {
      showMessage?.('Please choose a valid time slot.', 'error');
      return;
    }
    if (selectedDates.length === 0) {
      showMessage?.('Please select at least 1 day.', 'error');
      return;
    }

    // Check availability across all selected dates
    for (const d of selectedDates) {
      if (isTimeBookedOnDate(d, activeTimeWindow.startTime, activeTimeWindow.endTime)) {
        showMessage?.(`Slot ${activeTimeWindow.startTime} - ${activeTimeWindow.endTime} is already booked on ${d}!`, 'error');
        return;
      }
      if (hasConsecutiveConflict(d, activeTimeWindow.startTime)) {
        showMessage?.(`Cannot book consecutive slots on ${d}. Please leave at least a 1-hour gap.`, 'error');
        return;
      }
    }

    try {
      setSubmitting(true);
      await API.post(`/bookings/grounds/${ground._id}/book-social`, {
        dates: selectedDates,
        startTime: activeTimeWindow.startTime,
        endTime: activeTimeWindow.endTime,
        partySize,
      });
      showMessage?.(`Booking confirmed for ${selectedDates.length} day(s)! 🎉`, 'success');
      setSelectedPoolSlot(null);
      if (onBookingSuccess) onBookingSuccess();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to book slot', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Extend booking by 1 hour
  const handleExtend = async (bookingId) => {
    try {
      setExtendingId(bookingId);
      const { data } = await API.post(`/bookings/${bookingId}/extend`);
      showMessage?.(data.message || 'Booking extended by 1 hour! ✅', 'success');
      if (onBookingSuccess) onBookingSuccess();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to extend booking', 'error');
    } finally {
      setExtendingId(null);
    }
  };

  // ── FlipClock Hour Steppers (Soft-coded to dynamic operating window) ──
  const incrementHour = useCallback(() => {
    let h24 = dialHour % 12;
    if (dialAmPm === 'PM') h24 += 12;

    const minH = Math.floor(operatingWindow.minMins / 60);
    const maxH = Math.floor(operatingWindow.maxMins / 60);

    if (h24 >= maxH) {
      // Loop back to earliest hour
      const resetH = minH % 12 === 0 ? 12 : (minH > 12 ? minH - 12 : minH);
      setDialHour(resetH);
      setDialAmPm(minH >= 12 ? 'PM' : 'AM');
      return;
    }

    h24 += 1;
    if (h24 >= 12) {
      setDialAmPm('PM');
      setDialHour(h24 === 12 ? 12 : h24 - 12);
    } else {
      setDialAmPm('AM');
      setDialHour(h24);
    }
  }, [dialHour, dialAmPm, operatingWindow]);

  const decrementHour = useCallback(() => {
    let h24 = dialHour % 12;
    if (dialAmPm === 'PM') h24 += 12;

    const minH = Math.floor(operatingWindow.minMins / 60);
    const maxH = Math.floor(operatingWindow.maxMins / 60);

    if (h24 <= minH) {
      // Loop back to latest hour
      const resetH = maxH % 12 === 0 ? 12 : (maxH > 12 ? maxH - 12 : maxH);
      setDialHour(resetH);
      setDialAmPm(maxH >= 12 ? 'PM' : 'AM');
      return;
    }

    h24 -= 1;
    if (h24 >= 12) {
      setDialAmPm('PM');
      setDialHour(h24 === 12 ? 12 : h24 - 12);
    } else {
      setDialAmPm('AM');
      setDialHour(h24);
    }
  }, [dialHour, dialAmPm, operatingWindow]);

  // ── FlipClock Minute Steppers (Unrestricted 00 to 59) ──
  const incrementMinute = useCallback((step = 1) => {
    setDialMinute((prev) => (prev + step) % 60);
  }, []);

  const decrementMinute = useCallback((step = 1) => {
    setDialMinute((prev) => (prev - step + 60) % 60);
  }, []);

  const toggleAmPm = () => {
    if (dialAmPm === 'AM') {
      setDialAmPm('PM');
      if (dialHour < 1 || dialHour > 7) {
        setDialHour(12);
      }
    } else {
      setDialAmPm('AM');
      if (dialHour < 9 || dialHour > 11) {
        setDialHour(9);
      }
    }
  };

  return (
    <div className="social-badminton-booking flex flex-col gap-6 text-gray-900 dark:text-gray-100">
      {/* ── HEADER BANNER ── */}
      <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 border border-emerald-500/20 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> {ground?.sport ? `${ground.sport} Court Booking` : 'Court Booking'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                1-Hour Sessions ({operatingWindow.earliestLabel} – {operatingWindow.latestLabel})
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {ground.name}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end text-xs">
              <span className="text-gray-500 font-medium">Session Rate</span>
              <span className={`text-lg font-bold ${ground?.pricingPreference === 'custom' && ground?.customPricePerHour > 0 ? 'text-amber-400' : 'text-emerald-500'}`}>
                {ground?.pricingPreference === 'custom' && ground?.customPricePerHour > 0
                  ? `⚡ ₹${ground.customPricePerHour}/hr`
                  : effectiveBaseFee > 0 && !ground?.isSocial
                    ? `₹${effectiveBaseFee}/hr`
                    : 'Free / Social'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT GRID: LEFT (BOOKING OPTIONS) & RIGHT (INVOICE BILL) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── LEFT COLUMN (COLS 1 & 2): SELECTIONS ── */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* ── 2-DAY CALENDAR SELECTOR ── */}
          <div className="bg-black/5 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Select Booking Days (Min 1, Max 2 Days)
                </span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                Window closes 11:59 PM tomorrow
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dayOptions.map((opt) => {
                const isSelected = selectedDates.includes(opt.date);
                return (
                  <button
                    key={opt.date}
                    type="button"
                    onClick={() => toggleDate(opt.date)}
                    className={`relative flex items-center justify-between p-4 rounded-xl border text-left transition-all ${isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10 text-emerald-400'
                        : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-emerald-500/40'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-bold text-xs ${isSelected ? 'bg-emerald-500 text-black' : 'bg-black/10 dark:bg-white/10 text-gray-500'
                          }`}
                      >
                        <span>{opt.dayName}</span>
                        <span className="text-[10px] opacity-80">{opt.monthDay.split(' ')[1]}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900 dark:text-white">{opt.label}</span>
                          <span className="text-xs text-gray-500 font-medium">({opt.monthDay})</span>
                        </div>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                          {opt.date === todayStr ? 'Book for today’s open slots' : 'Advance book for tomorrow'}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${isSelected
                          ? 'bg-emerald-500 border-emerald-500 text-black'
                          : 'border-gray-400/40 bg-transparent'
                        }`}
                    >
                      {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── TIME SLOT TYPE SWITCHER ── */}
          <div className="flex flex-col gap-4">
            <div className="flex p-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl">
              <button
                type="button"
                onClick={() => setSlotType('available')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${slotType === 'available'
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <Clock className="w-4 h-4" />
                Select slot
              </button>
              <button
                type="button"
                onClick={() => setSlotType('dial')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${slotType === 'dial'
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <Zap className="w-4 h-4" />
                custom booking
              </button>
            </div>

            {/* ── TYPE 1: SELECT SLOT (PREDEFINED) ── */}
            {slotType === 'available' && (
              <div className="bg-black/5 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase font-bold tracking-wider text-gray-500">
                      Standard Slots ({displayedSlots.length > 0 ? `${fmt12h(displayedSlots[0].startTime)} — ${fmt12h(displayedSlots[displayedSlots.length - 1].endTime)}` : 'Operating Hours'})
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Predefined shifts matching the {ground?.sport ? `${ground.sport} ` : ''}court slot model.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5 text-emerald-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Available
                    </span>
                    <span className="flex items-center gap-1.5 text-red-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Booked
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {displayedSlots.map((s) => {
                    const bookedAny = selectedDates.some((d) => isTimeBookedOnDate(d, s.startTime, s.endTime));
                    const consecAny = selectedDates.some((d) => hasConsecutiveConflict(d, s.startTime));
                    const isSelected = selectedPoolSlot?.id === s.id;

                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedPoolSlot(s)}
                        className={`relative p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${consecAny
                            ? 'opacity-40 cursor-not-allowed bg-amber-500/5 border-amber-500/20 text-amber-400'
                            : bookedAny
                              ? isSelected
                                ? 'bg-red-500/15 border-red-500/60 ring-2 ring-red-500/30 text-white'
                                : 'bg-red-500/5 border-red-500/20 text-gray-300 hover:border-red-500/40'
                              : isSelected
                                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-500/20'
                                : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-gray-800 dark:text-gray-200 hover:border-emerald-500/40 hover:bg-emerald-500/5'
                          }`}
                      >
                        <span className="text-[10px] uppercase font-semibold text-gray-500 mb-1">{s.tag}</span>
                        <span className="text-xs font-bold">{fmt12h(s.startTime)}</span>
                        <span className="text-[10px] text-gray-500">to {fmt12h(s.endTime)}</span>

                        {bookedAny ? (
                          <div className="mt-2 flex flex-col items-center gap-1 w-full">
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                              Booked
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTeamUpModalForSlot({
                                  startTime: s.startTime,
                                  endTime: s.endTime,
                                  tag: s.tag,
                                  date: selectedDates[0],
                                });
                              }}
                              className="mt-0.5 text-[9px] uppercase font-black px-2 py-1 rounded-md bg-amber-400 hover:bg-amber-300 text-black transition-all shadow-sm flex items-center gap-1 tracking-wider"
                            >
                              <span>🤝 Team Up</span>
                            </button>
                          </div>
                        ) : consecAny ? (
                          <span className="mt-2 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                            1h Gap
                          </span>
                        ) : (
                          <span
                            className={`mt-2 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-emerald-500 text-black' : 'bg-emerald-500/20 text-emerald-400'
                              }`}
                          >
                            {isSelected ? 'Selected' : 'Open'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── TYPE 2: CUSTOM BOOKING (SPLIT NUMBER FLIP CLOCK WITH STEPPER ARROWS ▲/▼) ── */}
            {slotType === 'dial' && (
              <div className="bg-black/5 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 rounded-2xl p-6 flex flex-col items-center">
                {/* ── 3D FLIP CLOCK WITH ARROWS BESIDE NUMBERS ── */}
                <div className="clock-wrapper">
                  <div className="flip-clock-housing">
                    {/* HOURS GROUP: CARD + STEPPER ARROWS (▲/▼) BESIDE IT */}
                    <div className="dial-group">
                      <div className="dial-column">
                        <FlipCard value={pad(dialHour)} ampm={dialAmPm} />
                        <span className="column-label mt-2">HOUR</span>
                      </div>
                      <StepperArrows
                        onIncrement={incrementHour}
                        onDecrement={decrementHour}
                      />
                    </div>

                    {/* MECHANICAL TIME SEPARATOR */}
                    <div className="separator">
                      <div className="separator-dot"></div>
                      <div className="separator-dot"></div>
                    </div>

                    {/* MINUTES GROUP: CARD + STEPPER ARROWS (▲/▼) BESIDE IT (00 - 59) */}
                    <div className="dial-group">
                      <div className="dial-column">
                        <FlipCard value={pad(dialMinute)} />
                        <span className="column-label mt-2">MIN</span>
                      </div>
                      <StepperArrows
                        onIncrement={() => incrementMinute(1)}
                        onDecrement={() => decrementMinute(1)}
                      />
                    </div>

                    {/* AM / PM SELECTOR SWITCH */}
                    <div className="ampm-switch-panel">
                      <button
                        type="button"
                        onClick={() => {
                          if (dialAmPm !== 'AM') toggleAmPm();
                        }}
                        className={`ampm-btn ${dialAmPm === 'AM' ? 'active' : ''}`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (dialAmPm !== 'PM') toggleAmPm();
                        }}
                        className={`ampm-btn ${dialAmPm === 'PM' ? 'active' : ''}`}
                      >
                        PM
                      </button>
                      <span className="column-label mt-1">PERIOD</span>
                    </div>

                    {/* RIGHT SIDE VENT / DECORATIVE MECHANICAL PANEL */}
                    <div className="side-panel">
                      <div className="side-lines">
                        {Array.from({ length: 11 }).map((_, index) => (
                          <div className="side-line" key={index}></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conflict Notice & Send Team Up Request Button if booked */}
                {selectedDates.some((d) => isTimeBookedOnDate(d, dialStart24, dialEnd24)) && (
                  <div className="w-full max-w-md mt-4 p-4 rounded-xl bg-gradient-to-r from-red-500/10 via-amber-500/10 to-yellow-500/10 border border-amber-500/30 text-xs text-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg animate-fadeIn">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">🤝</span>
                      <div>
                        <strong className="block text-white text-xs">Slot Already Booked!</strong>
                        <span className="text-[11px] text-gray-300">
                          {fmt12h(dialStart24)} — {fmt12h(dialEnd24)} is taken on your selected date. You can request to team up!
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenTeamUpModalForSlot({
                          startTime: dialStart24,
                          endTime: dialEnd24,
                          date: selectedDates[0],
                          tag: 'Custom Dial Slot',
                        })
                      }
                      className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider whitespace-nowrap shadow-md transition-all flex items-center gap-1.5"
                    >
                      <span>🤝 Send team up request</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── PLAYER SELECTOR & TEAM UP SECTION ── */}
          <div className="bg-black/5 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Number of Players (1 to 4)
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {partySize === 1 ? 'Solo Player · Team Up Active 🤝' : `${partySize} Players on Court`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { n: 1, label: '1 Player', sub: 'Solo / Needs Team' },
                { n: 2, label: '2 Players', sub: '1v1 Singles Match' },
                { n: 3, label: '3 Players', sub: 'Looking for 4th' },
                { n: 4, label: '4 Players', sub: '2v2 Full Doubles' },
              ].map((item) => (
                <button
                  key={item.n}
                  type="button"
                  onClick={() => setPartySize(item.n)}
                  className={`p-3.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${partySize === item.n
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10'
                      : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-emerald-500/30'
                    }`}
                >
                  <span className="text-sm font-bold">{item.label}</span>
                  <span className="text-[10px] text-gray-500 mt-0.5">{item.sub}</span>
                </button>
              ))}
            </div>

            {/* ── TEAM UP 🤝 (Visible when partySize === 1) ── */}
            {partySize === 1 && (
              <div className="mt-5 p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-cyan-500/10 border border-indigo-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🤝</span>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                        Team Up Matchmaking
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Odd-numbered bookings looking for a partner on {selectedDates[0] || 'today'}. Send a request to join forces!
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={fetchTeamUps}
                    className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <RotateCcw className="w-3 h-3" /> Refresh
                  </button>
                </div>

                {teamUpLoading ? (
                  <div className="p-4 text-center text-xs text-gray-500">Scanning for partners...</div>
                ) : teamUpBookings.length === 0 ? (
                  <div className="p-4 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-center text-gray-500">
                    No odd-numbered matches found right now. You can book your solo slot and other players will be able to team up with you!
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {teamUpBookings.map((b) => {
                      const size = b.partySize || 1;
                      const isSingle = size === 1;
                      return (
                        <div
                          key={b._id}
                          className="p-3 rounded-lg bg-black/10 dark:bg-white/[0.04] border border-black/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs text-white">
                              {b.player?.name?.[0]?.toUpperCase() || 'P'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-gray-900 dark:text-white capitalize">
                                  {b.player?.name || (ground?.sport ? `${ground.sport} Player` : 'Player')}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                  {isSingle ? 'Needs 1 Partner (1/4)' : 'Needs 4th (3/4)'}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                📅 {b.date} &nbsp;·&nbsp; ⏰ {fmt12h(b.startTime)} — {fmt12h(b.endTime)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Optional note"
                              value={teamUpNote[b._id] || ''}
                              onChange={(e) =>
                                setTeamUpNote((prev) => ({ ...prev, [b._id]: e.target.value }))
                              }
                              className="text-xs bg-black/10 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400 text-gray-900 dark:text-white"
                            />
                            <button
                              type="button"
                              disabled={sendingTeamUpId === b._id}
                              onClick={() => handleSendTeamUpRequest(b._id)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                            >
                              <Send className="w-3 h-3" />
                              {sendingTeamUpId === b._id ? 'Sending...' : 'Team Up'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RECEIVED TEAM UP REQUESTS (FOR THE BOOKED USER) ── */}
          {receivedTeamUpRequests.length > 0 && (
            <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/5 to-emerald-500/10 border border-amber-500/30 rounded-2xl p-5 shadow-xl animate-fadeIn">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🤝</span>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-amber-300">
                      Received Team Up Requests ({receivedTeamUpRequests.filter(r => r.status === 'pending').length} Pending)
                    </h3>
                    <p className="text-xs text-gray-400">
                      Players who want to team up with you for your booked slots at {ground.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchReceivedTeamUpRequests}
                  className="text-xs text-amber-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {receivedTeamUpRequests.map((reqItem) => {
                  const isPending = reqItem.status === 'pending';
                  const isAccepted = reqItem.status === 'accepted';
                  const isDeclined = reqItem.status === 'declined';

                  return (
                    <div
                      key={reqItem._id}
                      className="p-4 rounded-xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-400/40 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-black flex items-center justify-center font-black text-sm flex-shrink-0 shadow-md">
                          {reqItem.requester?.name?.[0]?.toUpperCase() || 'P'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-white">
                              {reqItem.requester?.name || 'A player'}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isPending
                                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30 animate-pulse'
                                  : isAccepted
                                    ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                                    : 'bg-red-400/20 text-red-300 border border-red-400/30'
                                }`}
                            >
                              {reqItem.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300 mt-0.5">
                            📅 {reqItem.date} &nbsp;·&nbsp; ⏰ {fmt12h(reqItem.startTime)} — {fmt12h(reqItem.endTime)}
                          </p>
                          {reqItem.note && (
                            <p className="text-xs text-amber-200/90 italic mt-1 bg-amber-400/10 px-2.5 py-1 rounded border border-amber-400/15 inline-block">
                              "{reqItem.note}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              disabled={respondingRequestId === reqItem._id}
                              onClick={() => handleRespondTeamUp(reqItem._id, 'accept')}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                            >
                              {respondingRequestId === reqItem._id ? '...' : '✅ Accept'}
                            </button>
                            <button
                              type="button"
                              disabled={respondingRequestId === reqItem._id}
                              onClick={() => handleRespondTeamUp(reqItem._id, 'decline')}
                              className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 font-semibold text-xs transition-all disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {isAccepted && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-emerald-400 font-semibold">Matched! 🤝</span>
                            {reqItem.requester?.phone && (
                              <a
                                href={`https://wa.me/${reqItem.requester.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                              >
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>
                        )}
                        {isDeclined && (
                          <span className="text-xs text-gray-500">Declined</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── MY VENUE BOOKINGS & 1-HR COOLDOWN EXTENSION ── */}
          {mySocialBookings.length > 0 && (
            <div className="bg-black/5 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase font-bold tracking-wider text-gray-500">
                  My Venue Bookings & Extension
                </span>
                <span className="text-[11px] text-gray-500">
                  1-Hour Cooldown from booking creation required to extend (+1 hr)
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {mySocialBookings.map((b) => {
                  const isPending = b.status === 'pending_approval';
                  const isConfirmed = b.status === 'completed';

                  const createdAtMs = new Date(b.createdAt).getTime();
                  const elapsedMs = currentTimeMs - createdAtMs;
                  const cooldownMs = 60 * 60 * 1000;
                  const isCooldownActive = elapsedMs < cooldownMs;
                  const remainingMins = Math.max(1, Math.ceil((cooldownMs - elapsedMs) / (60 * 1000)));

                  const endMins = t2m(b.endTime);
                  const isMaxTimeReached = endMins + 60 > 20 * 60;

                  return (
                    <div
                      key={b._id}
                      className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900 dark:text-white">📅 {b.date}</span>
                          <span className="text-xs text-emerald-400 font-semibold">
                            ⏰ {fmt12h(b.startTime)} — {fmt12h(b.endTime)}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isPending
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : isConfirmed
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}
                          >
                            {isPending ? '⏳ Pending' : isConfirmed ? '✅ Confirmed' : '❌ Cancelled'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">
                          Party Size: {b.partySize || 1} Player(s) · Booked on{' '}
                          {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {b.isExtended ? (
                          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" /> Extended (+1 hr)
                          </span>
                        ) : isMaxTimeReached ? (
                          <span className="text-xs text-gray-500">Max venue hour (8:00 PM) reached</span>
                        ) : isCooldownActive ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled
                              className="px-3 py-1.5 rounded-lg bg-black/10 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-400 text-xs font-medium cursor-not-allowed flex items-center gap-1.5"
                            >
                              <Clock className="w-3.5 h-3.5" /> Cooldown ({remainingMins}m left)
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={extendingId === b._id}
                            onClick={() => handleExtend(b._id)}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/10 transition-all"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            {extendingId === b._id ? 'Extending...' : 'Extend Booking (+1 hr)'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN (COL 3): MINI BOX INVOICE BILL & CONFIRM BOOKING ── */}
        <div className="lg:col-span-1">
          <div className="invoice-box sticky top-24 bg-gradient-to-b from-[#161616] via-[#111111] to-[#0a0a0a] border border-[#2c2c2c] rounded-2xl p-5 shadow-2xl shadow-black/80 text-gray-200">
            {/* Invoice Top Ribbon */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm">
                  🧾
                </div>
                <div>
                  <h3 className="text-xs font-black tracking-wider uppercase text-white font-mono">
                    BOOKING INVOICE
                  </h3>
                  <p className="text-[10px] text-gray-400 uppercase truncate max-w-[190px]">
                    {ground?.name || 'SPORTS VENUE'}
                  </p>
                </div>
              </div>
              <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                OFFICIAL RECEIPT
              </span>
            </div>

            {/* Invoice Metadata */}
            <div className="py-3 text-[11px] font-mono flex items-center justify-between text-gray-400 border-b border-dashed border-white/10">
              <span>REF: #SNP-{Date.now().toString().slice(-6)}</span>
              <span>DATE: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>

            {/* Line Items List */}
            <div className="py-3 flex flex-col gap-2.5 text-xs">
              <div className="flex items-start justify-between">
                <span className="text-gray-400 text-[11px]">Booking Mode</span>
                <span className="font-semibold text-white capitalize text-right">
                  {slotType === 'available' ? 'Select slot' : 'custom booking'}
                </span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-gray-400 text-[11px]">Selected Days</span>
                <div className="text-right">
                  <span className="font-bold text-emerald-400 block text-xs">
                    {selectedDates.length} Day(s)
                  </span>
                  <span className="text-[10px] text-gray-400 block">
                    {selectedDates.join(', ')}
                  </span>
                </div>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-gray-400 text-[11px]">Reserved Timing</span>
                <div className="text-right">
                  {activeTimeWindow ? (
                    <>
                      <span className="font-bold text-white block text-xs">
                        {fmt12h(activeTimeWindow.startTime)} — {fmt12h(activeTimeWindow.endTime)}
                      </span>
                      <span className="text-[10px] text-emerald-400 block">1 Hour Session</span>
                    </>
                  ) : (
                    <span className="text-amber-400 text-xs italic">Select time slot</span>
                  )}
                </div>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-gray-400 text-[11px]">Court Players</span>
                <span className="font-semibold text-white">{partySize} Player(s)</span>
              </div>

              {ground?.pricingPreference === 'custom' && ground?.customPricePerHour > 0 ? (
                <>
                  <div className="flex items-start justify-between">
                    <span className="text-gray-400 text-[11px]">Pricing Mode</span>
                    <span className="text-amber-400 font-bold text-xs">⚡ Custom Rate Active</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-gray-400 text-[11px]">Court Base Fee</span>
                    <span className="text-white font-semibold">₹{effectiveBaseFee.toFixed(2)} / day</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-gray-400 text-[11px]">Days Booked</span>
                    <span className="text-emerald-400 font-semibold">{selectedDates.length} Day(s)</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <span className="text-gray-400 text-[11px]">Court Base Fee</span>
                    <span className="text-gray-400 line-through">
                      {effectiveBaseFee > 0 ? `₹${effectiveBaseFee.toFixed(2)}` : '₹0.00'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-gray-400 text-[11px]">Social Subsidy</span>
                    <span className="text-emerald-400 font-semibold">
                      {effectiveBaseFee > 0 ? `- ₹${effectiveBaseFee.toFixed(2)}` : '100% Covered'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Dashed Total Separator */}
            <div className="border-t border-dashed border-white/20 my-2 pt-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                  Total Amount Due
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {ground?.pricingPreference === 'custom' && ground?.customPricePerHour > 0
                    ? 'PAY AT VENUE'
                    : '100% COMMUNITY COMPLIMENTARY'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  ₹{ground?.pricingPreference === 'custom' && ground?.customPricePerHour > 0
                    ? (effectiveBaseFee * selectedDates.length).toFixed(2)
                    : '0.00'}
                </span>
              </div>
            </div>

            {/* Tear Notches Decoration */}
            <div className="relative py-2 my-1">
              <div className="border-t border-dashed border-white/10"></div>
            </div>

            {/* Terms bullet notes */}
            <div className="text-[10px] text-gray-400 flex flex-col gap-1 mb-4 bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
              <span>• {ground?.pricingPreference === 'custom' && ground?.customPricePerHour > 0 ? 'Booking confirmed at venue rate' : 'Free booking — reviewed & confirmed by venue management'}</span>
              <span>• Strict 1-hour session duration per booking day</span>
              <span>• 1-hour extension cooldown applies following approval</span>
            </div>

            {/* ── CONFIRM BOOKING / SEND TEAM UP REQUEST BUTTON (INSIDE INVOICE BILL) ── */}
            {user?.role === 'player' ? (
              isCurrentSlotBooked ? (
                <div className="flex flex-col gap-2">
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                    💡 This time slot is already reserved by another player. You can send a team up request to play together!
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenTeamUpModalForSlot(activeTimeWindow)}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-400/25 transition-all transform active:scale-[0.98]"
                  >
                    <span>🤝 Send team up request</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={submitting || !activeTimeWindow || selectedDates.length === 0}
                  onClick={handleBook}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all transform active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Reserving Slot...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 font-mono">
                      Confirm Booking <ArrowRight className="w-4 h-4 stroke-[3]" />
                    </span>
                  )}
                </button>
              )
            ) : (
              <div className="text-xs text-amber-400 font-semibold p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                Please log in as a Player to confirm booking or send team up requests.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SEND TEAM UP REQUEST MODAL ── */}
      {teamUpModalOpen && teamUpTargetSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141414] border border-[#2b2b2b] rounded-2xl max-w-md w-full p-6 shadow-2xl text-gray-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold text-base">
                  🤝
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Send Team Up Request</h3>
                  <p className="text-xs text-gray-400">Request to join player in this booked time slot</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTeamUpModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Venue:</span>
                  <span className="font-bold text-white">{ground.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Date:</span>
                  <span className="font-bold text-emerald-400">{teamUpTargetSlot.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Booked Slot:</span>
                  <span className="font-bold text-amber-300">
                    {fmt12h(teamUpTargetSlot.startTime)} — {fmt12h(teamUpTargetSlot.endTime)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1.5">
                  Message / Note to Player (Optional)
                </label>
                <textarea
                  rows={3}
                  value={customTeamUpNote}
                  onChange={(e) => setCustomTeamUpNote(e.target.value)}
                  placeholder={`e.g. Hey! I'd like to join you for ${ground?.sport || 'sports'}. Let's team up!`}
                  className="w-full bg-black/40 border border-white/15 focus:border-amber-400 rounded-xl p-3 text-white text-xs outline-none resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                💡 The user who booked this slot will receive an instant notification and can accept your request to team up!
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setTeamUpModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={sendingCustomTeamUp}
                  onClick={handleSubmitCustomTeamUp}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingCustomTeamUp ? 'Sending...' : 'Send team up request'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STYLES: SPLIT FLAP NUMBER 50/50, 3D FLIP ANIMATIONS & ROTARY DIAL ── */}
      <style>{`
        .clock-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 8px 0;
          width: 100%;
        }

        .flip-clock-housing {
          position: relative;
          width: 100%;
          max-width: 660px;
          min-height: 220px;
          padding: 22px 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          border-radius: 22px;
          background: radial-gradient(circle at 50% 20%, #171717 0%, #0d0d0d 60%, #050505 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow:
            inset 0 1px 1px rgba(255,255,255,.12),
            inset 0 -8px 20px rgba(0,0,0,.9),
            0 16px 36px rgba(0,0,0,.8),
            0 0 0 1px #1c1c1c;
        }

        .dial-column {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .column-label {
          font-size: 9px;
          letter-spacing: 0.14em;
          font-weight: 800;
          color: #666;
          text-transform: uppercase;
          font-family: monospace;
        }

        /* ── SPLIT FLAP CARD (50/50 PRECISE SPLIT NUMBER) ── */
        .flip-card-unit {
          perspective: 600px;
        }

        .flip-card-inner {
          position: relative;
          width: 114px;
          height: 154px;
          border-radius: 8px;
          background: #090909;
          box-shadow:
            0 6px 14px rgba(0,0,0,.9),
            inset 0 1px 2px rgba(255,255,255,.08),
            inset 0 -4px 6px rgba(0,0,0,.9);
        }

        /* Top 50% half card */
        .card-half {
          position: absolute;
          left: 0;
          right: 0;
          height: 77px;
          overflow: hidden;
          box-sizing: border-box;
        }

        .top-half {
          top: 0;
          border-radius: 8px 8px 0 0;
          background: linear-gradient(180deg, #2b2b2b 0%, #202020 60%, #161616 100%);
          border-top: 1px solid rgba(255,255,255,0.12);
          border-left: 1px solid #000;
          border-right: 1px solid #000;
          box-shadow: inset 0 2px 4px rgba(255,255,255,0.05);
        }

        /* Bottom 50% half card */
        .bottom-half {
          bottom: 0;
          border-radius: 0 0 8px 8px;
          background: linear-gradient(180deg, #121212 0%, #1a1a1a 40%, #242424 100%);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          border-left: 1px solid #000;
          border-right: 1px solid #000;
          box-shadow: inset 0 -2px 4px rgba(0,0,0,0.8);
        }

        /* Number Container: 154px full height, exactly sliced */
        .top-half .number-wrapper {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 154px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bottom-half .number-wrapper {
          position: absolute;
          top: -77px; /* shifts up by 50% to render lower half */
          left: 0;
          width: 100%;
          height: 154px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .split-glyph {
          font-size: 82px;
          line-height: 154px;
          font-weight: 800;
          font-family: Arial, Helvetica, sans-serif;
          color: #eeeeee;
          letter-spacing: -5px;
          text-shadow:
            0 2px 3px rgba(255,255,255,.25),
            0 4px 6px rgba(0,0,0,.9);
          transform: scaleX(0.92);
        }

        .ampm-badge {
          position: absolute;
          top: 6px;
          right: 7px;
          color: #4ade80;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1px;
          text-shadow: 0 1px 2px #000;
          font-family: monospace;
          z-index: 10;
        }

        /* ── 3D FLAP FLIP ANIMATION ── */
        .animated-flip-flap {
          transform-origin: bottom;
          animation: flapFoldDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          z-index: 25;
          backface-visibility: hidden;
        }

        @keyframes flapFoldDown {
          0% {
            transform: perspective(400px) rotateX(0deg);
          }
          100% {
            transform: perspective(400px) rotateX(-90deg);
          }
        }

        .animated-unfold-flap {
          transform-origin: top;
          animation: flapUnfoldDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.12s forwards;
          z-index: 26;
          backface-visibility: hidden;
          transform: perspective(400px) rotateX(90deg);
        }

        @keyframes flapUnfoldDown {
          0% {
            transform: perspective(400px) rotateX(90deg);
          }
          100% {
            transform: perspective(400px) rotateX(0deg);
          }
        }

        .flap-shadow {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.4);
          pointer-events: none;
        }

        .flap-highlight {
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0.04);
          pointer-events: none;
        }

        /* Center Horizontal Physical Divider Bar */
        .center-divider-groove {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 3px;
          transform: translateY(-50%);
          z-index: 20;
          background: linear-gradient(180deg, #050505, #555, #050505);
          box-shadow: 0 1px 2px rgba(255,255,255,.15), 0 -1px 2px rgba(0,0,0,.95);
        }

        /* Side Axles */
        .side-axle {
          position: absolute;
          top: 50%;
          width: 12px;
          height: 36px;
          transform: translateY(-50%);
          z-index: 30;
          border-radius: 3px;
          background: repeating-linear-gradient(
            180deg,
            #111 0px,
            #111 3px,
            #777 4px,
            #222 6px,
            #111 8px
          );
          border: 1px solid #050505;
          box-shadow: 0 1px 3px #000, inset 0 0 2px rgba(255,255,255,.3);
        }
        .axle-left { left: -6px; }
        .axle-right { right: -6px; }

        /* Separator Dots */
        .separator {
          width: 10px;
          height: 120px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 28px;
        }

        .separator-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 8px rgba(74, 222, 128, 0.4), inset 0 1px 2px rgba(255,255,255,.3);
        }

        /* AM/PM Switch */
        .ampm-switch-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
        }

        .ampm-btn {
          padding: 6px 10px;
          font-size: 10px;
          font-weight: 800;
          font-family: monospace;
          border-radius: 6px;
          border: 1px solid #333;
          background: #141414;
          color: #777;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ampm-btn.active {
          background: #4ade80;
          color: #000;
          border-color: #4ade80;
          box-shadow: 0 0 10px rgba(74,222,128,0.35);
        }

        /* Side Vent Panel */
        .side-panel {
          width: 18px;
          height: 140px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(90deg, #050505, #141414, #050505);
          border: 1px solid rgba(255,255,255,0.05);
          box-shadow: inset 0 0 6px rgba(0,0,0,.8);
        }

        .side-lines {
          width: 10px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .side-line {
          height: 3px;
          border-radius: 1.5px;
          background: #252525;
          box-shadow: 0 1px 1px #000;
        }

        /* ── STEPPER ARROWS BESIDE NUMBERS (▲ / ▼) ── */
        .dial-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .stepper-arrow-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          user-select: none;
          background: rgba(255, 255, 255, 0.02);
          padding: 8px 6px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: inset 0 1px 2px rgba(255,255,255,0.03), 0 4px 12px rgba(0,0,0,0.5);
        }

        .stepper-arrow-btn {
          width: 32px;
          height: 36px;
          border-radius: 8px;
          background: linear-gradient(180deg, #242424 0%, #151515 100%);
          border: 1px solid #383838;
          color: #d1d5db;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 2px 5px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.12);
        }
        .stepper-arrow-btn:hover {
          background: linear-gradient(180deg, #2e2e2e 0%, #1c1c1c 100%);
          color: #4ade80;
          border-color: #4ade80;
          box-shadow: 0 0 10px rgba(74, 222, 128, 0.35), inset 0 1px 2px rgba(255,255,255,0.2);
          transform: translateY(-1px);
        }
        .stepper-arrow-btn:active {
          transform: translateY(1px) scale(0.94);
          background: #111;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.8);
        }

        @media (max-width: 640px) {
          .flip-clock-housing {
            transform: scale(0.85);
            transform-origin: center;
          }
          .side-panel { display: none; }
        }

        @media (max-width: 480px) {
          .flip-clock-housing {
            transform: scale(0.70);
          }
        }
      `}</style>
    </div>
  );
}

// Subcomponent: Individual 50/50 Split Flap Card with 3D Flip Action
function FlipCard({ value, ampm }) {
  const [prevValue, setPrevValue] = useState(value);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (value !== prevValue) {
      setIsFlipping(true);
      const timer = setTimeout(() => {
        setPrevValue(value);
        setIsFlipping(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [value, prevValue]);

  return (
    <div className="flip-card-unit">
      <div className="flip-card-inner">
        {/* UPPER HALF CARD (Contains TOP 50% of the number) */}
        <div className="card-half top-half static-top">
          <div className="number-wrapper">
            <span className="split-glyph">{value}</span>
          </div>
          {ampm && <span className="ampm-badge">{ampm}</span>}
        </div>

        {/* LOWER HALF CARD (Contains BOTTOM 50% of the number) */}
        <div className="card-half bottom-half static-bottom">
          <div className="number-wrapper">
            <span className="split-glyph">{isFlipping ? prevValue : value}</span>
          </div>
        </div>

        {/* ── 3D FLIPPING LEAF (FOLDS DOWN FROM TOP) ── */}
        {isFlipping && (
          <div className="card-half top-half animated-flip-flap">
            <div className="number-wrapper">
              <span className="split-glyph">{prevValue}</span>
            </div>
            {ampm && <span className="ampm-badge">{ampm}</span>}
            <div className="flap-shadow"></div>
          </div>
        )}

        {/* ── 3D UNFOLDING LEAF (UNFOLDS ONTO BOTTOM) ── */}
        {isFlipping && (
          <div className="card-half bottom-half animated-unfold-flap">
            <div className="number-wrapper">
              <span className="split-glyph">{value}</span>
            </div>
            <div className="flap-highlight"></div>
          </div>
        )}

        {/* Center horizontal physical divider groove */}
        <div className="center-divider-groove"></div>

        {/* Side metal axles */}
        <div className="side-axle axle-left"></div>
        <div className="side-axle axle-right"></div>
      </div>
    </div>
  );
}

// Subcomponent: Stepper Arrows (▲/▼) beside numbers to change time
function StepperArrows({ onIncrement, onDecrement }) {
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      onIncrement();
    } else {
      onDecrement();
    }
  };

  return (
    <div className="stepper-arrow-column" onWheel={handleWheel}>
      {/* Up Arrow (▲) */}
      <button
        type="button"
        onClick={onIncrement}
        className="stepper-arrow-btn"
        title="Increase (▲)"
        aria-label="Increase"
      >
        ▲
      </button>

      {/* Down Arrow (▼) */}
      <button
        type="button"
        onClick={onDecrement}
        className="stepper-arrow-btn"
        title="Decrease (▼)"
        aria-label="Decrease"
      >
        ▼
      </button>
    </div>
  );
}
