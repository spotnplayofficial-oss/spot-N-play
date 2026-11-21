import { useState, useEffect } from 'react';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import InviteShareButtons from '../components/InviteShareButtons';
import { useAuth } from '../context/AuthContext';

// Wallet — Fitcoin balance, Fit Points score, Buy Fitcoin with real money,
// and the Invite & Earn panel.
// 1 unit of currency = 1 Fitcoin (₹1 = 1 FC).
// Referrals and membership purchases award Fit Points only (0 Fitcoin).
// Fit Points drive the Leaderboard score and are redeemable for coupons.
const FIT_RULES = [
  ['1 Fitcoin = 1 Rupee', 'Fitcoin is your money. Use it to book sports grounds, venues, and events (1 FC = ₹1).'],
  ['Book sports grounds', '1 Fitcoin earned per ₹1 you pay on advance or final bookings (pool or arena).'],
  ['Friend joins with your code', 'They get 20 Fit Points on signup (Fit Points only, not Fitcoin).'],
  ["Friend's first booking", 'You get 100 Fit Points when your invited friend makes their first booking (Fit Points only).'],
  ['Buy any membership', 'Purchasing or renewing any membership awards Fit Points only (not Fitcoin).'],
  ['Fit Points value', 'Fit Points count as your score on the campus Leaderboard and are redeemable for coupons.'],
];

const PRESET_AMOUNTS = [
  { value: 500, emoji: '😄' },
  { value: 1000, emoji: '🤗' },
  { value: 2000, emoji: '🤩' },
  { value: 5000, emoji: '😍' },
];

const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN');

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) return resolve(true);
    if (document.getElementById('razorpay-checkout-script')) return resolve(true);
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const WalletPage = () => {
  const [tab, setTab] = useState('overview');
  const [wallet, setWallet] = useState(null);
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [applying, setApplying] = useState(false);

  // Buy Fitcoin state
  const [selectedAmount, setSelectedAmount] = useState(1000);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const { user } = useAuth();

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  useEffect(() => {
    (async () => {
      try {
        const [w, i] = await Promise.all([
          API.get('/users/fit/wallet'),
          API.get('/users/fit/invite'),
        ]);
        setWallet(w.data);
        setInvite(i.data);
      } catch (err) {
        flash(err.response?.data?.message || 'Could not load wallet');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(`${label} copied ✅`);
    } catch {
      flash('Copy failed — long-press to copy manually');
    }
  };

  const applyCode = async (e) => {
    e.preventDefault();
    setApplying(true);
    try {
      const { data } = await API.post('/users/fit/apply-referral', { code: codeInput });
      flash(data.message);
      setCodeInput('');
      const w = await API.get('/users/fit/wallet');
      setWallet(w.data);
    } catch (err) {
      flash(err.response?.data?.message || 'Could not apply code');
    } finally {
      setApplying(false);
    }
  };

  const handleBuyFitcoin = async () => {
    const amountToBuy = isCustom ? Math.round(Number(customAmount)) : Math.round(Number(selectedAmount));
    if (!amountToBuy || amountToBuy <= 0) {
      flash('Please select or enter a valid amount');
      return;
    }

    setPurchasing(true);
    try {
      const { data } = await API.post('/users/fit/create-order', { amount: amountToBuy });

      // Dev / Test mode fallback
      if (data.isTest) {
        const verifyRes = await API.post('/users/fit/verify-payment', {
          razorpayOrderId: data.orderId,
          razorpayPaymentId: `test_pay_${Date.now()}`,
          razorpaySignature: 'test_signature',
          amount: data.amount,
        });
        flash(verifyRes.data.message || `Successfully purchased ${data.amount} Fitcoins! 🪙`);
        const w = await API.get('/users/fit/wallet');
        setWallet(w.data);
        setPurchasing(false);
        return;
      }

      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        flash('Payment gateway failed to load. Please try again.');
        setPurchasing(false);
        return;
      }

      const options = {
        key: data.keyId,
        amount: Math.round(data.amount * 100),
        currency: data.currency || 'INR',
        name: 'spotNplay',
        description: `Buy ${data.fitcoins || data.amount} Fitcoin (1 ₹ = 1 FC)`,
        order_id: data.orderId,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: '#00c968' },
        handler: async (response) => {
          try {
            const verifyRes = await API.post('/users/fit/verify-payment', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              amount: data.amount,
            });
            flash(verifyRes.data.message || `Successfully purchased ${data.amount} Fitcoins! 🪙`);
            const w = await API.get('/users/fit/wallet');
            setWallet(w.data);
          } catch (err) {
            flash(err.response?.data?.message || 'Payment verification failed');
          } finally {
            setPurchasing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPurchasing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to initiate purchase');
      setPurchasing(false);
    }
  };

  const effectiveAmount = isCustom ? (Number(customAmount) || 0) : selectedAmount;

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <Navbar />
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-green-400/15 border border-green-400/25 text-green-400 text-sm font-medium shadow-2xl animate-slideIn">
          {toast}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="font-bebas text-4xl md:text-5xl tracking-wide shimmer-text">Your Wallet</h1>
        <p className="text-gray-500 mt-1">1 Fitcoin = 1 Rupee · Fit Points are your score & coupon redeemable points.</p>

        {/* Balance cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="rounded-2xl p-5 border" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.14), rgba(251,191,36,0.03))', borderColor: 'rgba(251,191,36,0.3)' }}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.25em] text-yellow-500 font-bold">Fitcoin</p>
              <span className="text-[11px] font-bold text-yellow-500 bg-yellow-500/15 border border-yellow-500/30 px-2 py-0.5 rounded-full">1 FC = ₹1</span>
            </div>
            <p className="font-bebas text-5xl mt-1">{loading ? '—' : fmtNum(wallet?.fitcoin)}</p>
            <p className="text-xs text-gray-500 mt-1">1 Fitcoin = ₹1 · Balance ₹{loading ? '—' : fmtNum(wallet?.fitcoin)}</p>
          </div>

          <div className="rounded-2xl p-5 border" style={{ background: 'linear-gradient(135deg, rgba(74,222,128,0.14), rgba(74,222,128,0.03))', borderColor: 'rgba(74,222,128,0.3)' }}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.25em] text-green-400 font-bold">Fit Points</p>
              <span className="text-[11px] font-bold text-green-400 bg-green-400/15 border border-green-400/30 px-2 py-0.5 rounded-full">Score & Coupons</span>
            </div>
            <p className="font-bebas text-5xl mt-1">{loading ? '—' : fmtNum(wallet?.fitPoints)}</p>
            <p className="text-xs text-gray-500 mt-1">Leaderboard score & coupon redeemable points</p>
          </div>

          <div className="glass-card">
            <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-bold">Rank</p>
            <p className="font-bebas text-4xl mt-1">🏆</p>
            <p className="text-xs text-gray-500 mt-2">See where Fit Points put you against every player on campus.</p>
            <a href="/leaderboard" className="inline-block mt-2 text-green-400 text-xs font-bold hover:underline">Open Leaderboard →</a>
          </div>
        </div>

        {/* Direct Option to Buy Fitcoins with Real Money (1 ₹ = 1 FC) */}
        <div className="glass-card mt-6 p-6 rounded-2xl border border-black/10 dark:border-white/10 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-lg font-bold tracking-wide flex items-center gap-2">
                <span>🪙</span> Buy Fitcoin with Real Money
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Instant wallet recharge · <span className="text-green-500 dark:text-green-400 font-bold">1 Rupee = 1 Fitcoin</span> · Direct payment
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-500 dark:text-green-400 border border-green-500/20 w-fit">
              ⚡ Instant 1:1 Credit
            </span>
          </div>

          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold mb-3">
            Select Amount
          </p>

          {/* 4 preset value buttons matching the reference image */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRESET_AMOUNTS.map((p) => {
              const isSelected = selectedAmount === p.value && !isCustom;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(p.value);
                    setIsCustom(false);
                    setCustomAmount('');
                  }}
                  className={`flex flex-col items-center justify-center py-4 px-3 rounded-2xl transition-all duration-200 border cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#00c968] text-white border-[#00c968] shadow-lg shadow-green-500/25 scale-[1.02]'
                      : 'bg-white dark:bg-[#121212] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] text-gray-900 dark:text-white border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                  }`}
                >
                  <span className="text-2xl mb-1.5 leading-none">{p.emoji}</span>
                  <span className="text-base font-bold tracking-tight">₹ {p.value}</span>
                </button>
              );
            })}
          </div>

          {/* Custom amount input + Direct Buy button */}
          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-bold">₹</span>
              <input
                type="number"
                min="10"
                max="100000"
                value={customAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomAmount(val);
                  setIsCustom(true);
                  if (Number(val) > 0) setSelectedAmount(Number(val));
                }}
                placeholder="Or enter custom amount (e.g. 750)"
                className="w-full bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm outline-none focus:border-green-400 dark:focus:border-green-400 transition"
              />
            </div>

            <button
              type="button"
              onClick={handleBuyFitcoin}
              disabled={purchasing || !effectiveAmount || effectiveAmount <= 0}
              className="bg-[#00c968] hover:bg-[#00b35c] active:scale-[0.99] disabled:opacity-50 text-white text-sm font-bold px-6 py-3 rounded-xl shadow-lg shadow-green-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {purchasing ? (
                <span>Processing…</span>
              ) : (
                <>
                  <span>Pay ₹{fmtNum(effectiveAmount)}</span>
                  <span className="opacity-80">→</span>
                  <span>Get {fmtNum(effectiveAmount)} Fitcoin</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-8">
          {[
            { id: 'overview', label: 'How you earn' },
            { id: 'invite', label: '🎁 Invite & Earn' },
            { id: 'history', label: 'History' },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`tab-btn ${tab === t.id ? 'tab-active' : 'tab-inactive'}`}>{t.label}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="glass-card mt-4">
            <h3 className="font-bold mb-3">How you earn</h3>
            <div className="flex flex-col gap-3">
              {FIT_RULES.map(([k, v]) => (
                <div key={k} className="flex items-start gap-3 border-b border-black/5 dark:border-white/5 pb-3 last:border-0 last:pb-0">
                  <span className="text-green-400 font-bold">✓</span>
                  <div>
                    <p className="text-sm font-bold">{k}</p>
                    <p className="text-xs text-gray-500">{v}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'invite' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <div className="glass-card">
              <h3 className="font-bold mb-1">Your invite code</h3>
              <p className="text-xs text-gray-500 mb-4">
                Share it — friends get {invite?.rules?.signupBonus || 20} Fit Points on signup, you get {invite?.rules?.firstBookingBonus || 100} Fit Points when they make their first booking (Fit Points only, not Fitcoin).
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-lg font-mono font-bold tracking-widest text-green-400">
                  {invite?.referralCode || '—'}
                </code>
                <button onClick={() => copy(invite?.referralCode || '', 'Invite code')} className="bg-black/5 dark:bg-white/10 rounded-xl px-4 py-3 text-sm font-bold hover:bg-black/10 cursor-pointer">Copy</button>
              </div>
              <div className="mt-3">
                <InviteShareButtons
                  code={invite?.referralCode || ''}
                  link={invite?.inviteLink || ''}
                  inviterName={user?.name}
                  signupBonus={invite?.rules?.signupBonus || 20}
                  onShared={() => flash('Invite shared 🎁')}
                />
              </div>
              <div className="flex gap-4 mt-4 text-center">
                <div className="flex-1 bg-black/5 dark:bg-white/5 rounded-xl py-3">
                  <p className="font-bebas text-3xl">{invite?.invitedCount ?? 0}</p>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wider">Friends joined</p>
                </div>
                <div className="flex-1 bg-black/5 dark:bg-white/5 rounded-xl py-3">
                  <p className="font-bebas text-3xl">{invite?.earnedFitPoints ?? 0}</p>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wider">Fit Points earned</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="glass-card">
                <h3 className="font-bold mb-3">Have a friend's code?</h3>
                <form onSubmit={applyCode} className="flex gap-2">
                  <input
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    placeholder="XL2K9FQ"
                    className="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-400/50 font-mono tracking-widest"
                  />
                  <button type="submit" disabled={applying || !codeInput.trim()} className="bg-green-400 hover:bg-green-300 disabled:opacity-40 text-black text-sm font-bold px-5 rounded-xl cursor-pointer">
                    {applying ? '…' : 'Apply'}
                  </button>
                </form>
              </div>
              <div className="glass-card">
                <h3 className="font-bold mb-3">Friends who joined with your code</h3>
                {(invite?.invited || []).length === 0 ? (
                  <p className="text-sm text-gray-500">No one yet — share your code above 🤝</p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-64 overflow-auto">
                    {(invite?.invited || []).map((u) => (
                      <div key={u._id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-400/20 flex items-center justify-center text-sm font-bold overflow-hidden">
                          {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : (u.name || '?')[0]}
                        </div>
                        <p className="text-sm font-semibold flex-1 truncate">{u.name}</p>
                        <span className="text-xs text-gray-500">{new Date(u.joinedAt).toLocaleDateString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="glass-card mt-4">
            <h3 className="font-bold mb-3">Recent activity</h3>
            {(wallet?.history || []).length === 0 ? (
              <p className="text-sm text-gray-500">Nothing yet — buy Fitcoins or book a turf and your activity lands here.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {(wallet.history || []).map((h) => {
                  const icon =
                    h.type === 'buy_fitcoin' ? '💳' :
                    h.type === 'earn_membership' ? '🎟️' :
                    h.type === 'earn_booking' ? '🏏' :
                    h.type === 'earn_invite_booking' ? '🎁' :
                    h.type === 'earn_welcome' ? '🎉' : '🤝';
                  return (
                    <div key={h._id} className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-2 last:border-0">
                      <span className="text-lg">{icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold capitalize">{h.note || h.type.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-gray-500">{new Date(h.createdAt).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="text-right">
                        {h.fitcoin > 0 && <p className="text-sm font-bold text-yellow-500">+{fmtNum(h.fitcoin)} FC</p>}
                        {h.fitPoints > 0 && <p className="text-xs text-green-400">+{fmtNum(h.fitPoints)} FP</p>}
                        {h.fitcoin === 0 && h.fitPoints === 0 && <p className="text-xs text-gray-400">0</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletPage;
