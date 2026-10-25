import { useState, useEffect, useMemo } from 'react';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { dataStore } from '../utils/dataStore';
import { buildInviteText } from '../components/InviteShareButtons';
import { useSocket } from '../context/SocketContext';
import FindPlayersModal from '../components/FindPlayersModal';
import LiveRequestCard from '../components/LiveRequestCard';
import MyChallenges from '../components/challenge/MyChallenges';
import PoolQr from '../components/PoolQr';
import QRCode from 'react-qr-code';
import { Clock, QrCode, ExternalLink } from 'lucide-react';
import SearchableSportSelect from '../components/SearchableSportSelect';
import DashboardStatCard from '../components/DashboardStatCard';
import GroupsSection from '../components/GroupsSection';

const PlayerDashboard = () => {
  const { user } = useAuth();
  const { socket, activeRequests } = useSocket();
  const [availability, setAvailability] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [bookingFilter, setBookingFilter] = useState('all');
  const [txFilter, setTxFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [showFindPlayers, setShowFindPlayers] = useState(false);
  const [joiningRequestId, setJoiningRequestId] = useState(null);
  const [form, setForm] = useState({
    sport: 'cricket',
    skillLevel: 'beginner',
    bio: '',
  });
  const [poolQrMap, setPoolQrMap] = useState({});
  // Rewards strip: wallet + rank + mates at a glance (deep-links included).
  const [rewards, setRewards] = useState(null);
  const [subscriptionsData, setSubscriptionsData] = useState({
    totalCount: 0,
    activeCount: 0,
    pastCount: 0,
    activeSubscriptions: [],
    pastSubscriptions: [],
    subscriptions: [],
  });

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [w, lb, m] = await Promise.all([
          API.get('/users/fit/wallet').catch(() => ({ data: null })),
          API.get('/leaderboard?range=all').catch(() => ({ data: null })),
          API.get('/mates').catch(() => ({ data: null })),
        ]);
        if (!live) return;
        setRewards({
          fitcoin: w.data?.fitcoin || 0,
          fitPoints: w.data?.fitPoints || 0,
          referralCode: w.data?.referralCode || '',
          inviteLink: '',
          rank: lb.data?.me?.rank ?? null,
          mates: (m.data?.mates || []).length,
          matesPending: (m.data?.incoming || []).length,
        });
        // Invite link lives on the invite endpoint — one extra cheap call.
        API.get('/users/fit/invite').then(({ data }) => {
          if (!live) return;
          setRewards((prev) => prev ? { ...prev, referralCode: data.referralCode || prev.referralCode, inviteLink: data.inviteLink || '' } : prev);
        }).catch(() => {});
      } catch { /* rewards strip stays hidden on failure */ }
    })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
      .font-bebas { font-family: 'Bebas Neue', cursive !important; }

      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(24px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes shimmer {
        from { background-position: -200% center; }
        to { background-position: 200% center; }
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes cardIn {
        from { opacity: 0; transform: translateY(16px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes ping {
        0% { transform: scale(1); opacity: 1; }
        100% { transform: scale(2); opacity: 0; }
      }

      .animate-fadeUp-1 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.05s forwards; opacity: 0; }
      .animate-fadeUp-2 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.15s forwards; opacity: 0; }
      .animate-fadeUp-3 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.25s forwards; opacity: 0; }
      .animate-fadeUp-4 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.35s forwards; opacity: 0; }
      .animate-cardIn { animation: cardIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
      .animate-slideIn { animation: slideIn 0.3s ease forwards; }
      .animate-spin { animation: spin 1s linear infinite; }
      .animate-ping { animation: ping 1.5s ease-out infinite; }

      .shimmer-text {
        background: linear-gradient(90deg, var(--shimmer-color));
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: shimmer 3s linear infinite;
      }

      .grid-dots {
        background-image: radial-gradient(circle, var(--glass-05, rgba(255,255,255,0.05)) 1px, transparent 1px);
        background-size: 28px 28px;
      }

      .glass-card {
        background: var(--glass-02, rgba(255,255,255,0.02));
        border: 1px solid var(--glass-06, rgba(255,255,255,0.06));
        border-radius: 24px;
        padding: 24px;
      }

      .stat-card {
        background: var(--glass-02, rgba(255,255,255,0.02));
        border: 1px solid var(--glass-06, rgba(255,255,255,0.06));
        border-radius: 20px;
        padding: 20px;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      .stat-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 2px;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .stat-card:hover::before { opacity: 1; }
      .stat-card:hover { border-color: rgba(74,222,128,0.15); transform: translateY(-3px); }
      .stat-green::before { background: linear-gradient(90deg, transparent, #4ade80, transparent); }
      .stat-blue::before { background: linear-gradient(90deg, transparent, #60a5fa, transparent); }
      .stat-orange::before { background: linear-gradient(90deg, transparent, #fb923c, transparent); }
      .stat-purple::before { background: linear-gradient(90deg, transparent, #a78bfa, transparent); }

      .tab-btn {
        padding: 10px 20px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.3s ease;
        font-family: 'DM Sans', sans-serif;
        white-space: nowrap;
      }
      .tab-active {
        background: rgba(74,222,128,0.12);
        color: #4ade80;
        border: 1px solid rgba(74,222,128,0.2);
      }
      .tab-inactive {
        background: transparent;
        color: var(--text-muted);
        border: 1px solid transparent;
      }
      .tab-inactive:hover { color: var(--text-muted); }

      .input-field {
        width: 100%;
        background: var(--glass-05);
        border: 1px solid var(--glass-08, rgba(255,255,255,0.08));
        border-radius: 12px;
        padding: 12px 14px;
        color: var(--text-main);
        font-size: 14px;
        outline: none;
        transition: all 0.3s ease;
        font-family: 'DM Sans', sans-serif;
      }
      .input-field:focus {
        border-color: rgba(74,222,128,0.4);
        background: var(--glass-05, rgba(255,255,255,0.05));
        box-shadow: 0 0 0 3px rgba(74,222,128,0.06);
      }
      .input-field::placeholder { color: var(--text-muted); opacity: 0.5; }
      .input-field option { background: var(--bg-surface); }

      .label {
        font-size: 11px;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: 6px;
        display: block;
      }

      .btn-primary {
        background: linear-gradient(135deg, #4ade80, #22c55e);
        color: black;
        font-weight: 700;
        border-radius: 12px;
        padding: 12px 24px;
        font-size: 14px;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        font-family: 'DM Sans', sans-serif;
      }
      .btn-primary::before {
        content: '';
        position: absolute;
        top: 0; left: -100%;
        width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
        transition: left 0.4s ease;
      }
      .btn-primary:hover::before { left: 100%; }
      .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(74,222,128,0.3); }
      .btn-primary:disabled { opacity: 0.5; transform: none; }

      .btn-danger {
        background: rgba(239,68,68,0.08);
        border: 1px solid rgba(239,68,68,0.15);
        color: rgba(239,68,68,0.7);
        font-weight: 600;
        border-radius: 12px;
        padding: 10px 20px;
        font-size: 13px;
        transition: all 0.2s ease;
        font-family: 'DM Sans', sans-serif;
      }
      .btn-danger:hover { background: rgba(239,68,68,0.15); color: #ef4444; }

      .booking-card {
        background: var(--glass-02, rgba(255,255,255,0.02));
        border: 1px solid var(--glass-06, rgba(255,255,255,0.06));
        border-radius: 16px;
        padding: 16px;
        transition: all 0.3s ease;
      }
      .booking-card:hover { border-color: rgba(74,222,128,0.15); }

      .payment-card {
        background: var(--glass-02, rgba(255,255,255,0.02));
        border: 1px solid var(--glass-06, rgba(255,255,255,0.06));
        border-radius: 16px;
        padding: 16px;
        transition: all 0.3s ease;
      }
      .payment-card:hover { border-color: rgba(74,222,128,0.15); }

      .price-breakdown {
        background: rgba(74,222,128,0.04);
        border: 1px solid rgba(74,222,128,0.1);
        border-radius: 12px;
        padding: 12px;
      }

      .status-badge {
        font-size: 11px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 100px;
      }

      .live-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(74,222,128,0.1);
        border: 1px solid rgba(74,222,128,0.2);
        color: #4ade80;
        font-size: 12px;
        font-weight: 600;
        padding: 5px 12px;
        border-radius: 100px;
      }

      .availability-active {
        background: rgba(74,222,128,0.04);
        border: 1px solid rgba(74,222,128,0.15);
        border-radius: 16px;
        padding: 16px;
      }

      .progress-ring {
        transform: rotate(-90deg);
        transform-origin: center;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    fetchSubscriptions();
    const avail = dataStore.get('dashboard:player:availability');
    const book = dataStore.get('dashboard:player:bookings');
    const pay = dataStore.get('dashboard:player:payments');
    const subs = dataStore.get('dashboard:player:subscriptions');
    if (subs.status === 'ready' && subs.data && subs.data.success) {
      setSubscriptionsData(subs.data);
    }
    if (avail.status === 'ready' && book.status === 'ready' && pay.status === 'ready') {
      setAvailability(avail.data);
      setBookings(book.data || []);
      setPayments(pay.data || []);
      if (avail.data) {
        setForm({
          sport: avail.data.sport || 'cricket',
          skillLevel: avail.data.skillLevel || 'beginner',
          bio: avail.data.bio || '',
        });
      }
    }
    fetchAll();
  }, []);

  const fetchPoolQrs = async () => {
    try {
      const { data } = await API.get('/pools/my/qrs');
      const m = {};
      data.forEach((r) => { m[r._id] = r; });
      setPoolQrMap(m);
    } catch { setPoolQrMap({}); }
  };

  const fetchSubscriptions = async () => {
    try {
      const { data } = await API.get('/subscriptions/my');
      if (data && data.success) {
        setSubscriptionsData(data);
        dataStore.set('dashboard:player:subscriptions', data);
      }
    } catch {
      setSubscriptionsData((prev) => (prev?.totalCount > 0 ? prev : {
        totalCount: 0,
        activeCount: 0,
        pastCount: 0,
        activeSubscriptions: [],
        pastSubscriptions: [],
        subscriptions: [],
      }));
    }
  };

  const fetchAll = async () => {
    try {
      const [availRes, bookRes, payRes, subsRes] = await Promise.all([
        API.get('/players/me').catch(() => ({ data: null })),
        API.get('/bookings/my').catch(() => ({ data: [] })),
        API.get('/payments/my').catch(() => ({ data: [] })),
        API.get('/subscriptions/my').catch(() => ({ data: null })),
      ]);
      setAvailability(availRes.data);
      setBookings(bookRes.data);
      setPayments(payRes.data);
      if (subsRes.data && subsRes.data.success) {
        setSubscriptionsData(subsRes.data);
        dataStore.set('dashboard:player:subscriptions', subsRes.data);
      }
      dataStore.set('dashboard:player:availability', availRes.data);
      dataStore.set('dashboard:player:bookings', bookRes.data);
      dataStore.set('dashboard:player:payments', payRes.data);
      fetchPoolQrs();
      if (availRes.data) {
        setForm({
          sport: availRes.data.sport || 'cricket',
          skillLevel: availRes.data.skillLevel || 'beginner',
          bio: availRes.data.bio || '',
        });
      }
    } catch {}
  };

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  useEffect(() => {
    if (!socket) return;
    const handler = (b) => {
      setBookings((prev) => prev.map((x) => String(x._id) === String(b._id) ? { ...x, ...b } : x));
      if (b.checkedIn) showMessage(`Checked in for ${b.poolName || 'pool'} — ${b.date} ${b.startTime} ✅`);
      fetchPoolQrs();
    };
    socket.on('pool:booking-updated', handler);
    return () => socket.off('pool:booking-updated', handler);
  }, [socket]);

  const handleJoinRequest = async (id) => {
    setJoiningRequestId(id);
    try {
      await API.post(`/looking/${id}/join`);
      showMessage("You're in! 🎉");
    } catch (err) {
      showMessage(err?.response?.data?.message || 'Could not join', 'error');
    } finally {
      setJoiningRequestId(null);
    }
  };

  const handleCancelRequest = async (id) => {
    try {
      await API.post(`/looking/${id}/cancel`);
      showMessage('Request cancelled');
    } catch {
      showMessage('Could not cancel', 'error');
    }
  };

  const handleGoLive = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej)
      ).then(async (pos) => {
        await API.post('/players/availability', {
          ...form,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        showMessage('You are now LIVE on the map! 🟢');
        fetchAll();
      });
    } catch {
      showMessage('Failed to go live', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoOffline = async () => {
    try {
      await API.patch('/players/offline');
      showMessage('You are now offline');
      setAvailability(null);
    } catch {
      showMessage('Failed', 'error');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setLoading(true);
    try {
      await API.patch(`/bookings/${bookingId}/cancel`);
      showMessage('Booking cancelled successfully');
      fetchAll();
    } catch {
      showMessage('Cancellation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      advance_pending: { label: 'Advance Pending', color: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' },
      advance_paid: { label: 'Advance Paid ✅', color: 'bg-blue-400/10 text-blue-400 border border-blue-400/20' },
      completed: { label: 'Completed 🎉', color: 'bg-green-400/10 text-green-400 border border-green-400/20' },
      paid: { label: 'Paid ✅', color: 'bg-green-400/10 text-green-400 border border-green-400/20' },
      active: { label: 'Active ✅', color: 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20' },
      expired: { label: 'Expired ⌛', color: 'bg-gray-400/10 text-gray-500 dark:text-gray-400 border border-gray-400/20' },
      refunded: { label: 'Refunded 🔄', color: 'bg-gray-400/10 text-gray-500 dark:text-gray-400 border border-gray-400/20' },
      cancelled: { label: 'Cancelled ✕', color: 'bg-red-400/10 text-red-400 border border-red-400/20' },
      pending_approval: { label: 'Pending Approval ⏳', color: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' },
    };
    return map[status] || { label: status, color: 'bg-black/10 dark:bg-white/10 text-gray-900 dark:text-white border border-black/10 dark:border-white/10' };
  };

  const getSportEmoji = (sport) => {
    const map = { football: '⚽', cricket: '🏏', basketball: '🏀', tennis: '🎾', badminton: '🏸', volleyball: '🏐', boxing: '🥊', hockey: '🏑', kabaddi: '🤼', Kabbadi: '🤼', 'kho kho': '🏃', pickleball: '🏓', 'table tennis': '🏓', squash: '🎾', handball: '🤾', futsal: '⚽', rugby: '🏉', athletics: '🏃', wrestling: '🤼', weightlifting: '🏋️', yoga: '🧘', skating: '⛸️', chess: '♟️', carrom: '🎯', archery: '🏹', shooting: '🎯', cycling: '🚴', 'box cricket': '🏏', 'box football': '⚽', esports: '🎮' };
    return map[sport] || map[sport?.toLowerCase?.()] || '🏆';
  };

  const completedBookings = useMemo(() => {
    return bookings.filter((b) => b.status === 'completed').length;
  }, [bookings]);

  const pendingPayments = useMemo(() => {
    const fromPayments = payments.filter(
      (p) => (p.status === 'advance_paid' || (Number(p.remainingAmount) > 0 && p.finalPayment?.status !== 'paid')) &&
             !['cancelled', 'refunded'].includes(p.status)
    ).length;

    const fromBookings = bookings.filter(
      (b) => (b.status === 'advance_paid' || (Number(b.remainingPrice) > 0 && b.status !== 'completed')) &&
             !['cancelled', 'refunded'].includes(b.status) &&
             !payments.some((p) => String(p.booking?._id || p.booking) === String(b._id))
    ).length;

    return fromPayments + fromBookings;
  }, [payments, bookings]);

  const totalSpent = useMemo(() => {
    let sum = 0;
    // 1. From payments
    payments.forEach((p) => {
      if (['cancelled', 'refunded'].includes(p.status)) return;
      const adv = p.advancePayment?.status === 'paid' ? (Number(p.advanceAmount) || 0) : 0;
      const fin = p.finalPayment?.status === 'paid' ? (Number(p.remainingAmount) || 0) : 0;
      sum += (adv + fin);
    });

    // 2. From bookings without a linked payment
    bookings.forEach((b) => {
      const hasPayment = payments.some((p) => String(p.booking?._id || p.booking) === String(b._id));
      if (!hasPayment) {
        if (b.status === 'completed') sum += (Number(b.totalPrice) || 0);
        else if (b.status === 'advance_paid') sum += (Number(b.advancePrice) || 0);
      }
    });

    // 3. From standalone subscriptions & memberships (XL Arena, Direct Subscriptions)
    (subscriptionsData.subscriptions || []).forEach((sub) => {
      if (sub.subscriptionSource === 'pool_membership') return;
      sum += (Number(sub.amountPaid || sub.price) || 0);
    });

    return sum;
  }, [payments, bookings, subscriptionsData.subscriptions]);

  const filteredBookings = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    if (bookingFilter === 'upcoming') {
      return bookings.filter((b) => b.date >= today && !['completed', 'cancelled', 'refunded'].includes(b.status));
    }
    if (bookingFilter === 'completed') {
      return bookings.filter((b) => b.status === 'completed');
    }
    return bookings;
  }, [bookings, bookingFilter]);

  const upcomingCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return bookings.filter((b) => b.date >= today && !['completed', 'cancelled', 'refunded'].includes(b.status)).length;
  }, [bookings]);

  const allTransactions = useMemo(() => {
    const list = [];

    // 1. Booking payments
    payments.forEach((p) => {
      const isAdvPaid = p.advancePayment?.status === 'paid';
      const isFinPaid = p.finalPayment?.status === 'paid';
      const paidSoFar = (isAdvPaid ? (Number(p.advanceAmount) || 0) : 0) + (isFinPaid ? (Number(p.remainingAmount) || 0) : 0);

      list.push({
        id: p._id,
        type: p.booking?.poolId ? 'Pool Session' : 'Turf Booking',
        title: p.ground?.name || 'Venue Booking',
        venueAddress: p.ground?.address || '',
        date: p.advancePayment?.paidAt || p.createdAt || p.booking?.date,
        bookingDate: p.booking?.date,
        timeSlot: p.booking?.startTime && p.booking?.endTime ? `${p.booking.startTime} - ${p.booking.endTime}` : (p.booking?.startTime || null),
        totalAmount: Number(p.totalAmount) || 0,
        advanceAmount: Number(p.advanceAmount) || 0,
        remainingAmount: Number(p.remainingAmount) || 0,
        amountPaid: paidSoFar > 0 ? paidSoFar : (Number(p.advanceAmount) || 0),
        status: p.status,
        advanceStatus: p.advancePayment?.status || 'paid',
        finalStatus: p.finalPayment?.status || 'not_due',
        razorpayPaymentId: p.finalPayment?.razorpayPaymentId || p.advancePayment?.razorpayPaymentId || '',
        razorpayOrderId: p.finalPayment?.razorpayOrderId || p.advancePayment?.razorpayOrderId || '',
        groundId: p.ground?._id,
        ticketId: p.booking?.ticketId,
        isMembership: false,
      });
    });

    // 2. Unlinked bookings
    bookings.forEach((b) => {
      const exists = list.some((item) => String(item.id) === String(b.payment?._id || b.payment) || (b.ticketId && String(item.ticketId) === String(b.ticketId)));
      if (!exists) {
        const isPaid = b.status === 'completed';
        const paid = isPaid ? Number(b.totalPrice) : b.status === 'advance_paid' ? Number(b.advancePrice) : 0;
        list.push({
          id: b._id,
          type: b.poolId ? 'Pool Booking' : 'Turf Booking',
          title: b.ground?.name || 'Venue Booking',
          venueAddress: b.ground?.address || '',
          date: b.createdAt || b.date,
          bookingDate: b.date,
          timeSlot: b.startTime && b.endTime ? `${b.startTime} - ${b.endTime}` : (b.startTime || null),
          totalAmount: Number(b.totalPrice) || 0,
          advanceAmount: Number(b.advancePrice) || 0,
          remainingAmount: Number(b.remainingPrice) || 0,
          amountPaid: paid,
          status: b.status,
          advanceStatus: 'paid',
          finalStatus: b.remainingPrice > 0 ? 'pending' : 'not_due',
          razorpayPaymentId: b.payment?.razorpayPaymentId || '',
          razorpayOrderId: b.payment?.razorpayOrderId || '',
          groundId: b.ground?._id,
          ticketId: b.ticketId,
          isMembership: !!b.membershipPlanName,
        });
      }
    });

    // 3. Subscriptions & Memberships
    (subscriptionsData.subscriptions || []).forEach((sub) => {
      if (sub.subscriptionSource === 'pool_membership') return;
      list.push({
        id: sub.id,
        type: sub.category === 'arena_membership' ? 'Arena Membership' : 'Subscription Plan',
        title: sub.displayTitle || sub.planName,
        venueAddress: sub.ground?.address || '',
        date: sub.startDate || sub.createdAt,
        bookingDate: null,
        timeSlot: sub.timeSlot || 'Open Access',
        totalAmount: Number(sub.price) || 0,
        advanceAmount: Number(sub.price) || 0,
        remainingAmount: 0,
        amountPaid: Number(sub.amountPaid || sub.price) || 0,
        status: sub.payment?.paymentStatus || 'completed',
        advanceStatus: 'paid',
        finalStatus: 'not_due',
        razorpayPaymentId: sub.payment?.razorpayPaymentId || '',
        razorpayOrderId: sub.payment?.razorpayOrderId || '',
        groundId: sub.ground?._id,
        ticketId: sub.ticketId,
        isMembership: true,
      });
    });

    list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    return list;
  }, [payments, bookings, subscriptionsData.subscriptions]);

  const filteredTransactions = useMemo(() => {
    if (txFilter === 'bookings') return allTransactions.filter((t) => !t.isMembership);
    if (txFilter === 'memberships') return allTransactions.filter((t) => t.isMembership);
    return allTransactions;
  }, [allTransactions, txFilter]);

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="fixed inset-0 grid-dots pointer-events-none opacity-30" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[1px] bg-gradient-to-r from-transparent via-green-400/20 to-transparent pointer-events-none" />

      <Navbar />

      {message && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slideIn px-5 py-3 rounded-2xl text-sm font-medium flex items-center gap-2 shadow-2xl whitespace-nowrap ${
          messageType === 'success'
            ? 'bg-green-400/15 border border-green-400/25 text-green-400'
            : 'bg-red-400/15 border border-red-400/25 text-red-400'
        }`}>
          {messageType === 'success' ? '✅' : '⚠️'} {message}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="animate-fadeUp-1 flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <p className="text-green-400 text-xs uppercase tracking-[0.3em] mb-1">Player</p>
            <h1 className="font-bebas text-5xl tracking-wide shimmer-text">
              {user?.name?.split(' ')[0]}'S DASHBOARD
            </h1>
            <p className="text-gray-600 text-sm mt-1">Welcome back — ready to play? ⚽</p>
          </div>
          <div className="flex items-center gap-3">
            {availability ? (
              <span className="live-badge">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                </span>
                LIVE on Map
              </span>
            ) : (
              <span className="text-xs bg-black/4 dark:bg-white/4 border border-black/8 dark:border-white/8 text-gray-500 px-3 py-2 rounded-full">
                ⚫ Offline On Map
              </span>
            )}
            <Link to="/profile" className="w-10 h-10 rounded-full overflow-hidden border border-black/10 dark:border-white/10 hover:border-green-400/30 transition-colors flex-shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-green-400/10 flex items-center justify-center text-green-400 font-bold text-sm">
                  {user?.name?.charAt(0)}
                </div>
              )}
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="animate-fadeUp-2 grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <DashboardStatCard
            icon="calendar"
            label="Total Bookings"
            value={bookings.length}
            subtitle="All-time confirmed"
            color="green"
            onClick={() => setActiveTab('bookings')}
          />
          <DashboardStatCard
            icon="completed"
            label="Completed"
            value={completedBookings}
            subtitle="Sessions played"
            color="blue"
            onClick={() => { setActiveTab('bookings'); setBookingFilter('completed'); }}
          />
          <DashboardStatCard
            icon="wallet"
            label="Pending Payments"
            value={pendingPayments}
            subtitle={pendingPayments > 0 ? "Requires action" : "All dues settled"}
            color="orange"
            onClick={() => { setActiveTab('payments'); setTxFilter('all'); }}
          />
          <DashboardStatCard
            icon="money"
            label="Total Spent"
            value={`₹${totalSpent.toLocaleString('en-IN')}`}
            subtitle="Turfs, pools & passes"
            color="purple"
            onClick={() => { setActiveTab('payments'); setTxFilter('all'); }}
          />
        </div>

        {/* My Subscriptions & Memberships Box */}
        <div className="animate-fadeUp-2 mb-8 rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-6 relative overflow-hidden">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">👑</span>
                <span className="text-xs uppercase tracking-[0.2em] font-bold text-emerald-400">
                  Passes & Memberships
                </span>
              </div>
              <h2 className="font-bebas text-3xl tracking-wide text-gray-900 dark:text-white">
                MY SUBSCRIPTIONS
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                All facility memberships, arena passes, and pool plans purchased on your account.
              </p>
            </div>

            {/* Total purchased counters badge */}
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/10 border border-emerald-500/25 px-4 py-2 rounded-2xl text-center">
                <span className="block font-bebas text-2xl text-emerald-400 leading-none">
                  {subscriptionsData.totalCount}
                </span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                  Total Purchased
                </span>
              </div>
              <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-4 py-2 rounded-2xl text-center">
                <span className="block font-bebas text-2xl text-yellow-400 leading-none">
                  {subscriptionsData.activeCount}
                </span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                  Active Now
                </span>
              </div>
            </div>
          </div>

          {/* Membership Cards Grid */}
          {subscriptionsData.subscriptions && subscriptionsData.subscriptions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subscriptionsData.subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className={`rounded-2xl p-4 transition-all duration-300 border flex flex-col justify-between ${
                    sub.isActive
                      ? 'bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-400/50 hover:shadow-lg hover:shadow-emerald-500/5'
                      : 'bg-black/2 dark:bg-white/2 border-black/8 dark:border-white/8 opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-xl">
                        {sub.category === 'pool_membership' ? '🏊' : '🏟️'}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full ${
                          sub.isActive
                            ? 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30'
                            : 'bg-gray-400/10 text-gray-400 border border-gray-400/20'
                        }`}
                      >
                        {sub.isActive ? `Active · ${sub.daysRemaining}d left` : 'Expired'}
                      </span>
                    </div>

                    <h4 className="font-bebas text-xl text-gray-900 dark:text-white tracking-wide truncate">
                      {sub.displayTitle || sub.planName}
                    </h4>

                    {sub.ground && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
                        📍 {sub.ground.name}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mb-2 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 w-fit">
                      <Clock size={13} />
                      <span>Slot: {sub.timeSlot || 'Open Access'}</span>
                    </div>

                    <div className="text-[11px] text-gray-600 dark:text-gray-400 flex flex-col gap-1 my-2.5">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Plan:</span>
                        <span className="font-semibold text-gray-900 dark:text-white capitalize truncate ml-2">
                          {sub.planName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Valid Until:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {new Date(sub.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {sub.ticketId && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Pass / Ticket ID:</span>
                          <span className="font-mono font-bold text-gray-900 dark:text-white">
                            {sub.ticketId}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Gate-Pass QR Code under time slot for vendor scan */}
                    <div className="my-3 p-2.5 bg-white/5 rounded-xl border border-black/10 dark:border-white/10 flex items-center gap-3">
                      <div className="bg-white p-1.5 rounded-lg flex-shrink-0 shadow-sm">
                        <QRCode value={`${window.location.origin}/verify-pass/${sub.id}`} size={64} level="M" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                          <QrCode size={13} className="text-emerald-400" /> Gate Check-In QR
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Vendor scans to see name, phone, dates, slot & paid amount.
                        </p>
                        <Link
                          to={`/verify-pass/${sub.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1 mt-1"
                        >
                          Open Gate Pass <ExternalLink size={10} />
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs mt-1">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">Amount Paid</span>
                      <span className="font-bold text-gray-900 dark:text-white text-sm">
                        ₹{sub.price}
                      </span>
                    </div>
                    {sub.ground?._id && (
                      <Link
                        to={`/grounds/${sub.ground._id}`}
                        className="text-emerald-400 hover:text-emerald-300 font-medium text-xs transition-colors flex items-center gap-1"
                      >
                        View Venue →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-black/2 dark:bg-white/2 border border-black/5 dark:border-white/5 rounded-2xl p-6 text-center">
              <span className="text-3xl block mb-2">⭐</span>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                No memberships purchased yet
              </p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-3">
                Join an arena membership or pool pass to enjoy recurring access and exclusive member perks.
              </p>
              <Link
                to="/venues"
                className="inline-block bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
              >
                Explore Venues & Passes →
              </Link>
            </div>
          )}
        </div>

        {/* Rewards strip — Fitcoin, Fit Points, rank, mates, invite */}
        {rewards && (
          <div className="animate-fadeUp-2 mb-8 rounded-3xl border border-yellow-400/20 bg-gradient-to-r from-yellow-400/10 via-transparent to-green-400/5 p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to="/wallet" className="flex items-center gap-3 group">
                <span className="text-2xl">🪙</span>
                <span>
                  <span className="block font-bebas text-2xl text-yellow-500 leading-none">{Number(rewards.fitcoin).toLocaleString('en-IN')}</span>
                  <span className="text-[11px] text-gray-500 uppercase tracking-wider group-hover:text-yellow-500">Fitcoin · Wallet →</span>
                </span>
              </Link>
              <Link to="/leaderboard" className="flex items-center gap-3 group">
                <span className="text-2xl">⚡</span>
                <span>
                  <span className="block font-bebas text-2xl text-green-400 leading-none">{Number(rewards.fitPoints).toLocaleString('en-IN')}</span>
                  <span className="text-[11px] text-gray-500 uppercase tracking-wider group-hover:text-green-400">Fit Points{rewards.rank ? ` · Rank #${rewards.rank}` : ''} →</span>
                </span>
              </Link>
              <Link to="/mates" className="flex items-center gap-3 group">
                <span className="text-2xl">🤝</span>
                <span>
                  <span className="block font-bebas text-2xl leading-none">{rewards.mates}{rewards.matesPending > 0 ? <span className="text-green-400 text-lg"> +{rewards.matesPending}</span> : ''}</span>
                  <span className="text-[11px] text-gray-500 uppercase tracking-wider group-hover:text-green-400">Mates{rewards.matesPending > 0 ? ' · requests!' : ''} →</span>
                </span>
              </Link>
              <button
                onClick={() => {
                  const text = buildInviteText({ code: rewards.referralCode || '', link: rewards.inviteLink || '', inviterName: user?.name });
                  if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => showMessage('Invite link copied — share it on WhatsApp 🎁')).catch(() => showMessage(`Your code: ${rewards.referralCode}`, 'success'));
                  else showMessage(`Your code: ${rewards.referralCode}`, 'success');
                }}
                className="flex items-center gap-3 text-left group"
              >
                <span className="text-2xl">🎁</span>
                <span>
                  <span className="block font-mono font-bold text-sm tracking-widest">{rewards.referralCode || '···'}</span>
                  <span className="text-[11px] text-gray-500 uppercase tracking-wider group-hover:text-yellow-500">Invite code · tap to copy →</span>
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Find Players CTA */}
        <div className="animate-fadeUp-2 mb-8 rounded-3xl border border-green-400/20 bg-gradient-to-r from-green-400/10 via-green-400/5 to-transparent p-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white">🏸 Ready to Play?</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Start a game in under a minute — nearby players get notified instantly.</p>
          </div>
          <button
            onClick={() => setShowFindPlayers(true)}
            className="bg-gradient-to-r from-green-400 to-green-600 text-black font-bold text-sm rounded-xl px-6 py-3 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-400/30 flex-shrink-0"
          >
            Find Players
          </button>
        </div>

        {activeRequests.length > 0 && (
          <div className="animate-fadeUp-2 mb-8">
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-[0.2em] mb-3">🔥 Active Requests Near You</p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {activeRequests.slice(0, 8).map((req) => (
                <div key={req._id} className="w-72 flex-shrink-0">
                  <LiveRequestCard
                    request={req}
                    onJoin={handleJoinRequest}
                    onCancel={handleCancelRequest}
                    joining={joiningRequestId === req._id}
                    compact
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {showFindPlayers && (
          <FindPlayersModal
            onClose={() => setShowFindPlayers(false)}
            onCreated={() => showMessage('Your request is live! 🏸')}
          />
        )}

        {/* Tabs */}
        <div className="animate-fadeUp-3">
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {[
              { id: 'overview', label: '📍 Availability' },
              { id: 'challenges', label: '⚔️ Challenges' },
              { id: 'bookings', label: `📅 Bookings (${bookings.length})` },
              { id: 'payments', label: `💳 Payments & Transactions (${allTransactions.length})` },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`tab-btn ${activeTab === tab.id ? 'tab-active' : 'tab-inactive'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* AVAILABILITY TAB */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-5">
              {availability && (
                <div className="availability-active animate-cardIn">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-400/10 border border-green-400/20 rounded-xl flex items-center justify-center text-xl">
                        {getSportEmoji(availability.sport)}
                      </div>
                      <div>
                        <p className="text-gray-900 dark:text-white font-semibold capitalize">{availability.sport} · {availability.skillLevel}</p>
                        {availability.bio && <p className="text-gray-500 text-xs">{availability.bio}</p>}
                      </div>
                    </div>
                    <button onClick={handleGoOffline} className="btn-danger">
                      Go Offline
                    </button>
                  </div>
                </div>
              )}

              <div className="glass-card animate-cardIn">
                <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white mb-5">
                  {availability ? 'UPDATE AVAILABILITY' : 'GO LIVE ON MAP'}
                </h2>
                <form onSubmit={handleGoLive} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Sport</label>
                      <SearchableSportSelect data-tour="dash-sport" value={form.sport} onChange={s => setForm({ ...form, sport: s })} includeAll={false} placeholder="Search sports" />
                    </div>
                    <div>
                      <label className="label">Skill Level</label>
                      <select data-tour="dash-skill" value={form.skillLevel} onChange={(e) => setForm({ ...form, skillLevel: e.target.value })} className="input-field">
                        <option value="beginner">🟡 Beginner</option>
                        <option value="intermediate">🔵 Intermediate</option>
                        <option value="advanced">🟢 Advanced</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label">Bio (optional)</label>
                    <input
                      type="text"
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      placeholder="e.g. Looking for a weekend cricket match!"
                      className="input-field"
                    />
                  </div>
                  <button data-tour="dash-golive" type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2">
                    {loading ? (
                      <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> Getting Location...</>
                    ) : availability ? '📍 Update My Location' : '🟢 Go Live on Map'}
                  </button>
                </form>
              </div>

              {/* SPORTS GROUPS SECTION */}
              <div className="mt-4 animate-cardIn">
                <GroupsSection />
              </div>

              {/* <div className="glass-card animate-cardIn">
                <h3 className="font-bebas text-xl tracking-wide text-gray-900 dark:text-white mb-4">QUICK LINKS</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { to: '/map', icon: '🗺️', label: 'Open Live Map', sub: 'Find players nearby' },
                    { to: '/groups', icon: '👥', label: 'My Groups', sub: 'Manage sport groups' },
                    { to: '/profile', icon: '👤', label: 'My Profile', sub: 'Update avatar & info' },
                  ].map((link, i) => (
                    <Link key={i} to={link.to} className="bg-black/2 dark:bg-white/2 border border-black/6 dark:border-white/6 rounded-2xl p-4 hover:border-green-400/2 hover:bg-green-400/3 transition-all duration-300 group">
                      <div className="text-2xl mb-2">{link.icon}</div>
                      <p className="text-gray-900 dark:text-white text-sm font-semibold group-hover:text-green-400 transition-colors">{link.label}</p>
                      <p className="text-gray-600 text-xs mt-0.5">{link.sub}</p>
                    </Link>
                  ))}
                </div>
              </div> */}
            </div>
          )}

          {/* CHALLENGES TAB */}
          {activeTab === 'challenges' && (
            <div className="animate-cardIn">
              <MyChallenges showMessage={(m) => showMessage(m)} />
            </div>
          )}

          {/* BOOKINGS TAB */}
          {activeTab === 'bookings' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {[
                  { id: 'all', label: `All History (${bookings.length})` },
                  { id: 'upcoming', label: `Upcoming (${upcomingCount})` },
                  { id: 'completed', label: `Completed (${completedBookings})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setBookingFilter(f.id)}
                    className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all ${
                      bookingFilter === f.id
                        ? 'bg-green-400 text-black font-semibold shadow-sm'
                        : 'bg-black/5 dark:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white border border-black/5 dark:border-white/5'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {filteredBookings.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3 text-center">
                  <span className="text-5xl">📅</span>
                  <p className="text-gray-500">
                    {bookingFilter === 'all' ? 'No bookings found in history' : `No ${bookingFilter} bookings found`}
                  </p>
                  <Link to="/map" className="btn-primary text-sm px-6 py-2.5">Find a Ground 🗺️</Link>
                </div>
              ) : filteredBookings.map((booking, i) => {
                const badge = getStatusBadge(booking.status);
                const isPast = booking.date < new Date().toISOString().split('T')[0];
                const canCancel = !isPast && !['completed', 'cancelled', 'refunded'].includes(booking.status);

                return (
                  <div key={booking._id} className="booking-card animate-cardIn" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-gray-900 dark:text-white font-semibold">
                            {booking.ground?.name || 'Ground'}
                          </p>
                          {booking.poolName && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full align-middle ${booking.slotCategory === 'girls_only' ? 'bg-pink-500/15 text-pink-400 border border-pink-500/30' : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'}`}>
                              🏊 {booking.poolName}{booking.slotCategory === 'girls_only' ? ' · Girls Only' : ''}
                            </span>
                          )}
                          {booking.membershipPlanName && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              👑 {booking.membershipPlanName}
                            </span>
                          )}
                          {isPast && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-gray-500 border border-black/10 dark:border-white/10">
                              Past Booking
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 text-xs mt-0.5">📍 {booking.ground?.address || 'Spot-N-Play Partner Venue'}</p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">📅 {booking.date} · 🕐 {booking.startTime} — {booking.endTime}</p>
                        {booking.ticketId && <p className="text-gray-500 text-xs mt-1">Ticket #{booking.ticketId} {booking.partySize > 1 ? `· ${booking.partySize} people` : ''}</p>}
                        {booking.poolId && booking.status === 'completed' && (
                          <div className="mt-3">
                            {booking.checkedIn ? (
                              <p className="text-green-400 text-xs font-semibold">✅ Checked in {booking.checkedInAt ? `at ${new Date(booking.checkedInAt).toLocaleTimeString()}` : ''} — one scan only</p>
                            ) : (
                              <PoolQr payload={poolQrMap[booking._id]?.qrPayload} ticketId={booking.ticketId} checkedIn={!!booking.checkedIn} isExpired={!!poolQrMap[booking._id]?.isExpired} />
                            )}
                          </div>
                        )}
                      </div>
                      <span className={`status-badge ${badge.color}`}>{badge.label}</span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5 dark:border-white/5 flex-wrap gap-3">
                      <div className="flex gap-4">
                        <div>
                          <p className="text-gray-500 text-xs">Total</p>
                          <p className="text-gray-900 dark:text-white font-semibold text-sm">₹{Number(booking.totalPrice || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Advance</p>
                          <p className="text-green-400 font-semibold text-sm">₹{Number(booking.advancePrice || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Remaining</p>
                          <p className={`font-semibold text-sm ${booking.remainingPrice > 0 ? 'text-orange-400' : 'text-gray-400'}`}>
                            ₹{Number(booking.remainingPrice || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {canCancel && (
                          booking.ground?.venueType === 'pool' ? (
                            <span className="text-gray-500 text-[11px] whitespace-nowrap" title="Pool bookings are only cancelled by support in case of a payment issue">
                              Contact admin to cancel
                            </span>
                          ) : (
                            <button onClick={() => handleCancelBooking(booking._id)} className="text-red-400 text-xs hover:text-red-300 transition-colors bg-red-400/10 px-3 py-1 rounded-full whitespace-nowrap">
                              ✕ Cancel
                            </button>
                          )
                        )}
                        {booking.ground?._id && (
                          <Link to={`/grounds/${booking.ground._id}`} className="text-green-400 text-xs hover:text-green-300 transition-colors">
                            View Ground →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PAYMENTS TAB */}
          {activeTab === 'payments' && (
            <div className="flex flex-col gap-4">
              {pendingPayments > 0 && (
                <div className="animate-slideIn bg-orange-400/10 border border-orange-400/20 rounded-2xl px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="text-orange-400 font-semibold text-sm">Final Payment Pending</p>
                      <p className="text-gray-500 text-xs">You have {pendingPayments} booking(s) with remaining amount due</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction Filters */}
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {[
                  { id: 'all', label: `All Transactions (${allTransactions.length})` },
                  { id: 'bookings', label: `Bookings (${allTransactions.filter((t) => !t.isMembership).length})` },
                  { id: 'memberships', label: `Memberships & Passes (${allTransactions.filter((t) => t.isMembership).length})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setTxFilter(f.id)}
                    className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all ${
                      txFilter === f.id
                        ? 'bg-green-400 text-black font-semibold shadow-sm'
                        : 'bg-black/5 dark:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white border border-black/5 dark:border-white/5'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3 text-center">
                  <span className="text-5xl">💳</span>
                  <p className="text-gray-500">
                    {txFilter === 'all' ? 'No payment or transaction history yet' : `No ${txFilter} transactions found`}
                  </p>
                  <Link to="/map" className="btn-primary text-sm px-6 py-2.5">Book a Ground or Pass 🏟️</Link>
                </div>
              ) : filteredTransactions.map((tx, i) => {
                const badge = getStatusBadge(tx.status);
                const isPaid = ['completed', 'paid', 'active'].includes(tx.status);
                const isPartial = tx.status === 'advance_paid' || (tx.remainingAmount > 0 && tx.advanceAmount > 0);

                return (
                  <div key={tx.id || i} className="payment-card animate-cardIn" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            tx.isMembership
                              ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                              : tx.type.toLowerCase().includes('pool')
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              : 'bg-green-500/15 text-green-400 border border-green-500/30'
                          }`}>
                            {tx.type}
                          </span>
                          {tx.ticketId && (
                            <span className="text-[11px] text-gray-400 font-mono">
                              #{tx.ticketId}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-900 dark:text-white font-semibold text-base">
                          {tx.title}
                        </p>
                        {tx.venueAddress && (
                          <p className="text-gray-500 text-xs mt-0.5">📍 {tx.venueAddress}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5 flex-wrap">
                          {tx.bookingDate && (
                            <span>📅 Play Date: <strong className="text-gray-700 dark:text-gray-300">{tx.bookingDate}</strong></span>
                          )}
                          {tx.timeSlot && (
                            <span>🕐 Slot: <strong className="text-gray-700 dark:text-gray-300">{tx.timeSlot}</strong></span>
                          )}
                          {tx.date && (
                            <span>💳 Date: {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          )}
                        </div>
                        {tx.razorpayPaymentId && (
                          <p className="text-[11px] text-gray-500 font-mono mt-1">
                            Payment Ref: {tx.razorpayPaymentId}
                          </p>
                        )}
                      </div>
                      <span className={`status-badge ${badge.color}`}>{badge.label}</span>
                    </div>

                    <div className="price-breakdown mb-3">
                      <div className="grid grid-cols-3 gap-2 text-center sm:text-left">
                        <div>
                          <span className="text-gray-500 text-xs block">Total Value</span>
                          <span className="text-gray-900 dark:text-white font-semibold text-sm">
                            ₹{Number(tx.totalAmount || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs block">Amount Paid</span>
                          <span className="text-green-400 font-bold text-sm">
                            ₹{Number(tx.amountPaid || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs block">Remaining Due</span>
                          <span className={`font-semibold text-sm ${tx.remainingAmount > 0 && isPartial ? 'text-orange-400' : 'text-gray-400'}`}>
                            {tx.remainingAmount > 0 && isPartial
                              ? `⏳ ₹${Number(tx.remainingAmount).toLocaleString('en-IN')}`
                              : '₹0'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
                      <div>
                        {tx.status === 'advance_paid' && tx.remainingAmount > 0 && (
                          <p className="text-orange-400 font-medium">
                            ⚠️ Balance ₹{Number(tx.remainingAmount).toLocaleString('en-IN')} payable before or at venue arrival
                          </p>
                        )}
                        {tx.status === 'refunded' && (
                          <p className="text-gray-500">
                            🔄 Payment refunded back to source
                          </p>
                        )}
                        {isPaid && (
                          <p className="text-green-400 font-medium flex items-center gap-1">
                            <span>✅</span> Payment confirmed & recorded
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {tx.status === 'advance_paid' && tx.remainingAmount > 0 && tx.groundId && (
                          <Link
                            to={`/grounds/${tx.groundId}`}
                            className="bg-orange-400/10 border border-orange-400/25 text-orange-400 font-semibold px-3 py-1.5 rounded-xl hover:bg-orange-400/20 transition-colors"
                          >
                            💳 Pay Remaining ₹{Number(tx.remainingAmount).toLocaleString('en-IN')} →
                          </Link>
                        )}
                        {tx.groundId && (
                          <Link
                            to={`/grounds/${tx.groundId}`}
                            className="text-green-400 hover:text-green-300 transition-colors font-medium"
                          >
                            View Venue →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerDashboard;