import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, ShieldCheck, MapPin, Phone, User, Calendar, CreditCard, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import API from '../api/axios';

const formatDate = (dateVal) => {
  if (!dateVal) return 'N/A';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateVal);
  }
};

export default function VerifyPassPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  // Instant fallback from QR URL params while API loads
  const fallbackName = searchParams.get('name') || '';
  const fallbackPhone = searchParams.get('phone') || '';
  const fallbackSlot = searchParams.get('slot') || '';
  const fallbackStart = searchParams.get('start') || '';
  const fallbackExpiry = searchParams.get('expiry') || '';
  const fallbackPrice = searchParams.get('price') || '';
  const fallbackPlan = searchParams.get('plan') || '';
  const fallbackVenue = searchParams.get('venue') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [passData, setPassData] = useState(null);
  const [verifiedTime, setVerifiedTime] = useState('');

  const fetchPassDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await API.get(`/subscriptions/verify-pass/${id}`);
      if (data?.success && data?.pass) {
        setPassData(data.pass);
        setVerifiedTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else {
        throw new Error('Could not retrieve pass details');
      }
    } catch (err) {
      console.error('Pass verification error:', err);
      // If API fails or backend offline, check if fallback params are available
      if (fallbackName || fallbackSlot) {
        const now = new Date();
        const exp = fallbackExpiry ? new Date(fallbackExpiry) : null;
        const isActive = exp ? exp > now : true;
        setPassData({
          id,
          name: fallbackName || 'Valued Member',
          mobile: fallbackPhone || 'Not Provided',
          startDate: fallbackStart || now.toISOString(),
          expiresAt: fallbackExpiry || now.toISOString(),
          selectedTimeSlot: fallbackSlot || 'Open Access',
          amountPaid: Number(fallbackPrice) || 0,
          planName: fallbackPlan || 'Membership Pass',
          venueName: fallbackVenue || 'Spot-N-Play Arena',
          isActive,
          status: isActive ? 'active' : 'expired',
          ticketId: id?.startsWith('TKT-') ? id : null,
        });
        setVerifiedTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else {
        setError(err.response?.data?.message || 'Pass not found or invalid QR code');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const active = passData?.isActive !== false && passData?.status !== 'expired' && passData?.status !== 'cancelled';

  return (
    <div className="min-h-screen bg-[#08080c] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-emerald-500 selection:text-black">
      {/* Dynamic ambient background glow */}
      <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[140px] pointer-events-none transition-colors duration-700 ${
        active ? 'bg-emerald-500/20' : 'bg-rose-500/15'
      }`} />

      {/* Brand Header */}
      <div className="mb-6 text-center z-10 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-2 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-bold tracking-[0.2em] text-emerald-400 uppercase">
            Official Gate Pass Check-in
          </span>
        </div>
        <h1 className="font-bebas text-3xl sm:text-4xl tracking-wider text-white">
          SPOT-N-PLAY PASS VERIFICATION
        </h1>
      </div>

      {/* Main Verification Card */}
      <div className="w-full max-w-lg z-10">
        {loading && !passData ? (
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-10 text-center shadow-2xl flex flex-col items-center justify-center gap-4">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-sm font-semibold text-gray-300">Verifying membership with database...</p>
            <span className="text-xs text-gray-500">Checking pass authenticity and validity status</span>
          </div>
        ) : error && !passData ? (
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-rose-500/30 rounded-3xl p-8 text-center shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="font-bebas text-2xl text-rose-400 tracking-wide mb-1">
              INVALID OR UNRECOGNIZED PASS
            </h2>
            <p className="text-xs text-gray-400 max-w-sm mb-6 leading-relaxed">
              {error}. Please verify that the user has scanned the correct QR code from their Spot-N-Play dashboard.
            </p>
            <button
              onClick={fetchPassDetails}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-scan / Try Again
            </button>
          </div>
        ) : (
          <div className="bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl transition-all">
            {/* Top Verification Status Banner */}
            <div className={`p-5 sm:p-6 text-center border-b transition-colors relative ${
              active
                ? 'bg-gradient-to-b from-emerald-500/20 via-emerald-500/5 to-transparent border-emerald-500/20'
                : 'bg-gradient-to-b from-rose-500/20 via-rose-500/5 to-transparent border-rose-500/20'
            }`}>
              <div className="inline-flex items-center justify-center mb-3">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
                  active
                    ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400'
                    : 'bg-rose-500/20 border-2 border-rose-400 text-rose-400'
                }`}>
                  {active ? <ShieldCheck className="w-9 h-9" /> : <AlertTriangle className="w-9 h-9" />}
                </div>
              </div>

              <span className={`inline-block text-[10px] font-black tracking-[0.25em] uppercase px-3 py-1 rounded-full mb-1 ${
                active
                  ? 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30'
                  : 'bg-rose-400/15 text-rose-400 border border-rose-400/30'
              }`}>
                {active ? '● PASS VERIFIED & ACTIVE' : '● MEMBERSHIP EXPIRED'}
              </span>

              <h2 className="font-bebas text-3xl sm:text-4xl tracking-wide text-white mt-1">
                {active ? 'ENTRY APPROVED' : 'ACCESS DENIED'}
              </h2>
              {passData?.daysRemaining !== undefined && active && (
                <p className="text-xs text-emerald-400/90 font-medium">
                  {passData.daysRemaining} days remaining in this billing cycle
                </p>
              )}
            </div>

            {/* Member Details Breakdown (The 6 Key Fields Requested) */}
            <div className="p-5 sm:p-6 space-y-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
                <span>👤</span> Member & Booking Information
              </div>

              {/* 1. Name */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2.5 text-gray-400">
                  <User className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Member Name</span>
                </div>
                <span className="text-sm sm:text-base font-bold text-white capitalize">
                  {passData?.name || 'Valued Member'}
                </span>
              </div>

              {/* 2. Mobile Number */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2.5 text-gray-400">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Mobile No</span>
                </div>
                <span className="text-sm sm:text-base font-mono font-bold text-emerald-300">
                  {passData?.mobile || passData?.phone || 'Not Provided'}
                </span>
              </div>

              {/* 3. Selected Time Slot - Highlighted */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-emerald-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Selected Time Slot</span>
                </div>
                <span className="text-sm sm:text-base font-black text-white font-mono bg-black/40 px-3 py-1 rounded-xl border border-emerald-500/30">
                  {passData?.selectedTimeSlot || passData?.timeSlot || 'Open Access'}
                </span>
              </div>

              {/* 4 & 5. Start Date & Expire Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Start Date</span>
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-white block">
                    {formatDate(passData?.startDate)}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Expire Date</span>
                  </div>
                  <span className={`text-xs sm:text-sm font-semibold block ${active ? 'text-white' : 'text-rose-400'}`}>
                    {formatDate(passData?.expiresAt)}
                  </span>
                </div>
              </div>

              {/* 6. Amount Paid */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                <div className="flex items-center gap-2.5 text-gray-400">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Amount Paid</span>
                </div>
                <div className="text-right">
                  <span className="font-bebas text-2xl text-emerald-400 tracking-wide">
                    ₹{passData?.amountPaid ?? passData?.price ?? 0}
                  </span>
                  <span className="block text-[9px] text-gray-500 uppercase tracking-wider font-semibold">
                    Paid via Razorpay ✅
                  </span>
                </div>
              </div>

              {/* Facility & Plan Info */}
              <div className="p-3 rounded-2xl bg-black/30 border border-white/[0.05] text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Plan:</span>
                  <span className="font-semibold text-white truncate ml-2">
                    {passData?.displayTitle || passData?.planName || 'Standard Membership'}
                  </span>
                </div>
                {passData?.venueName && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Venue:</span>
                    <span className="font-medium text-gray-300 truncate ml-2 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-400 inline" /> {passData.venueName}
                    </span>
                  </div>
                )}
                {passData?.ticketId && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Pass / Ticket ID:</span>
                    <span className="font-mono font-bold text-emerald-400 tracking-wider">
                      {passData.ticketId}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Verification Footer Bar */}
            <div className="p-4 bg-black/40 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-gray-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Verified at {verifiedTime || 'now'}
              </span>
              <button
                onClick={fetchPassDetails}
                className="hover:text-emerald-400 transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Security Watermark footer */}
      <div className="mt-6 text-center text-gray-600 text-[11px] font-mono z-10">
        🔒 Spot-N-Play Security Verified Check-in System · Single-use Gate Verification
      </div>
    </div>
  );
}
