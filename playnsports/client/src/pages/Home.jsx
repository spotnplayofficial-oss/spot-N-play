import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import API from '../api/axios';
import { dataStore } from '../utils/dataStore';

const useInView = (threshold = 0.1) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setInView(true);
    }, { threshold });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, inView];
};

const AnimatedCounter = ({ target, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const [ref, inView] = useInView();
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);
  return <span ref={ref}>{count}{suffix}</span>;
};

const FloatingCard = ({ style, children }) => (
  <div className="absolute bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl px-4 py-3 text-sm hidden lg:flex items-center gap-2 shadow-2xl" style={style}>
    {children}
  </div>
);

const Home = () => {
    const quotes = [
    "Find players near you, book premium grounds, and never miss a game again.",
    "Connect with athletes around you, reserve top-tier grounds, and play without limits.",
    "Discover nearby players, unlock premium grounds, and turn every day into game day.",
    "Build your sports network, book the best grounds, and stay in the game always.",
    "From pickup matches to serious play — find your squad and own the field.",
    "Locate players nearby, secure premium grounds, and keep your game alive.",
    "Your sports community starts here — find players, book grounds, and play on.",
    "Play smarter, connect faster, and never miss another match near you.",
    "Turn your passion into action — find players, book grounds, and dominate.",
    "Step into the game — connect locally, play globally, and never stop competing."
  ];
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [featuresRef, featuresInView] = useInView();
  const [statsRef, statsInView] = useInView();
  const heroRef = useRef(null);

  const [nearbyPlayers, setNearbyPlayers] = useState([]);
  const [nearbyGrounds, setNearbyGrounds] = useState([]);
  const [activeTab, setActiveTab] = useState('players');
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState('');
  const [playerPage, setPlayerPage] = useState(0);
  const [groundPage, setGroundPage] = useState(0);

  // ── Get in Touch (contact/complaint form) ──
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [contactError, setContactError] = useState('');

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactMessage.trim()) return;
    setContactSubmitting(true);
    setContactError('');
    try {
      await API.post('/contact', { message: contactMessage.trim() });
      setContactMessage('');
      setContactSent(true);
      setTimeout(() => setContactSent(false), 4000);
    } catch (err) {
      setContactError(err.response?.data?.message || 'Could not send your message. Please try again.');
    } finally {
      setContactSubmitting(false);
    }
  };

  const [stats, setStats] = useState({
    players: 0,
    grounds: 0,
    sports: 0
  });

  useEffect(() => {
      const cached = dataStore.get('analytics:stats');
      if (cached.status === 'ready') {
        setStats(cached.data);
        return;
      }
      const fetchStats = async () => {
        try {
          const data = await dataStore.getOrFetch('analytics:stats', () => API.get('/analytics/stats').then(r => r.data));
          setStats(data);
        } catch (err) {
          console.error(err);
        }
      };

      fetchStats();
    }, []);



  const [quote, setQuote] = useState("");

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

    useEffect(()=>{
    const randomIndex = Math.floor(Math.random() * quotes.length);
    setQuote(quotes[randomIndex]);
  },[]);

  useEffect(() => {
  if (!user) {
    setLocationLoading(false);
    return;
  }

  // Already loaded (this session or via the background prefetcher) —
  // show it instantly, no location prompt needed again.
  const playersCache = dataStore.get('players:all');
  const groundsCache = dataStore.get('grounds:all');
  if (playersCache.status === 'ready' && groundsCache.status === 'ready') {
    setNearbyPlayers(playersCache.data || []);
    setNearbyGrounds(groundsCache.data || []);
    setLocationLoading(false);
    return;
  }

  if (!navigator.geolocation) {
    setLocationError('Location not supported');
    setLocationLoading(false);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async () => {
      try {
        const [playersData, groundsData] = await Promise.all([
          dataStore.getOrFetch('players:all', () => API.get('/players/all').then(r => r.data)),
          dataStore.getOrFetch('grounds:all', () => API.get('/grounds/all').then(r => r.data)),
        ]);
        setNearbyPlayers(playersData || []);
        setNearbyGrounds(groundsData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLocationLoading(false);
      }
    },
    () => {
      setLocationError('Allow location to see nearby players');
      setLocationLoading(false);
    }
  );
}, [user]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
      * { font-family: 'DM Sans', sans-serif; }
      .font-bebas { font-family: 'Bebas Neue', cursive !important; }

      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(40px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes float1 {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        33% { transform: translateY(-15px) rotate(2deg); }
        66% { transform: translateY(-8px) rotate(-1deg); }
      }
      @keyframes float2 {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-20px) rotate(-3deg); }
      }
      @keyframes float3 {
        0%, 100% { transform: translateY(0px); }
        40% { transform: translateY(-12px); }
      }
      @keyframes scanline {
        0% { transform: translateY(-100%); }
        100% { transform: translateY(100vh); }
      }
      @keyframes glitch {
        0%, 100% { clip-path: inset(0 0 100% 0); }
        10% { clip-path: inset(10% 0 60% 0); transform: translate(-3px); }
        20% { clip-path: inset(50% 0 30% 0); transform: translate(3px); }
        30% { clip-path: inset(80% 0 5% 0); transform: translate(-2px); }
        40% { clip-path: inset(0 0 100% 0); }
      }
      @keyframes spin-slow {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes ping-slow {
        0% { transform: scale(1); opacity: 0.8; }
        100% { transform: scale(2.5); opacity: 0; }
      }
      @keyframes marquee {
        from { transform: translateX(0); }
        to { transform: translateX(-50%); }
      }
      @keyframes card-in {
        from { opacity: 0; transform: translateY(30px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes shimmer {
        from { background-position: -200% center; }
        to { background-position: 200% center; }
      }

      .animate-fadeUp { animation: fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .animate-fadeUp-1 { animation: fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards; opacity: 0; }
      .animate-fadeUp-2 { animation: fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.25s forwards; opacity: 0; }
      .animate-fadeUp-3 { animation: fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards; opacity: 0; }
      .animate-fadeUp-4 { animation: fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.55s forwards; opacity: 0; }
      .animate-fadeIn { animation: fadeIn 1.2s ease forwards; }
      .animate-float1 { animation: float1 6s ease-in-out infinite; }
      .animate-float2 { animation: float2 8s ease-in-out infinite; }
      .animate-float3 { animation: float3 5s ease-in-out infinite; }
      .animate-spin-slow { animation: spin-slow 20s linear infinite; }
      .animate-ping-slow { animation: ping-slow 2s ease-out infinite; }
      .animate-marquee { animation: marquee 20s linear infinite; }

      .card-visible { animation: card-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .card-hidden { opacity: 0; transform: translateY(30px) scale(0.95); }

      .scanline {
        position: fixed;
        top: 0; left: 0; right: 0;
        height: 2px;
        background: linear-gradient(90deg, transparent, rgba(74,222,128,0.1), transparent);
        animation: scanline 8s linear infinite;
        pointer-events: none;
        z-index: 1;
      }

      .noise {
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
      }

      .grid-dots {
        background-image: radial-gradient(circle, var(--glass-06, rgba(255,255,255,0.06)) 1px, transparent 1px);
        background-size: 32px 32px;
      }

      .text-gradient {
        background: linear-gradient(135deg, var(--shimmer-color));
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: gradientShift 4s linear infinite;
      }

      @keyframes gradientShift {
        from { background-position: 0% center; }
        to { background-position: 200% center; }
      }

      .shimmer-text {
        background: linear-gradient(90deg, var(--shimmer-color));
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: shimmer 3s linear infinite;
      }

      .glow-green { box-shadow: 0 0 40px rgba(74, 222, 128, 0.3); }
      .glow-green-sm { box-shadow: 0 0 20px rgba(74, 222, 128, 0.2); }

      .btn-primary {
        position: relative;
        overflow: hidden;
        background: #4ade80;
        color: black;
        font-weight: 700;
        border-radius: 14px;
        padding: 14px 32px;
        font-size: 16px;
        transition: all 0.3s ease;
      }
      .btn-primary::before {
        content: '';
        position: absolute;
        top: 0; left: -100%;
        width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        transition: left 0.5s ease;
      }
      .btn-primary:hover::before { left: 100%; }
      .btn-primary:hover { background: #86efac; transform: translateY(-2px); box-shadow: 0 8px 30px rgba(74,222,128,0.4); }

      .btn-secondary {
        background: var(--glass-05, rgba(255,255,255,0.05));
        border: 1px solid var(--glass-10, rgba(255,255,255,0.1));
        color: var(--text-main);
        font-weight: 600;
        border-radius: 14px;
        padding: 14px 32px;
        font-size: 16px;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
      }
      .btn-secondary:hover {
        background: var(--glass-10, rgba(255,255,255,0.1));
        border-color: rgba(74,222,128,0.4);
        transform: translateY(-2px);
      }

      .feature-card {
        background: var(--glass-02, rgba(255,255,255,0.02));
        border: 1px solid var(--glass-06, rgba(255,255,255,0.06));
        border-radius: 24px;
        padding: 28px;
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
        overflow: hidden;
      }
      .feature-card::before {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(74,222,128,0.08), transparent 60%);
        opacity: 0;
        transition: opacity 0.3s;
      }
      .feature-card:hover::before { opacity: 1; }
      .feature-card:hover {
        border-color: rgba(74,222,128,0.25);
        transform: translateY(-6px);
        box-shadow: 0 20px 60px rgba(0,0,0,0.4);
      }

      .nearby-card {
        background: var(--glass-02, rgba(255,255,255,0.02));
        border: 1px solid var(--glass-06, rgba(255,255,255,0.06));
        border-radius: 20px;
        padding: 20px;
        transition: all 0.3s ease;
        cursor: pointer;
      }
      .nearby-card:hover {
        border-color: rgba(74,222,128,0.2);
        background: var(--glass-04, rgba(255,255,255,0.04));
        transform: translateY(-4px);
        box-shadow: 0 12px 40px rgba(0,0,0,0.3);
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleCardMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty('--x', `${x}%`);
    card.style.setProperty('--y', `${y}%`);
  };

  const skillColor = (level) => {
    if (level === 'advanced') return { bg: 'rgba(74,222,128,0.1)', color: '#4ade80', border: 'rgba(74,222,128,0.2)' };
    if (level === 'intermediate') return { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: 'rgba(59,130,246,0.2)' };
    return { bg: 'rgba(156,163,175,0.1)', color: '#9ca3af', border: 'rgba(156,163,175,0.2)' };
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white overflow-x-hidden">
      <Navbar />
      <div className="scanline" />
      <div className="fixed inset-0 grid-dots pointer-events-none opacity-40" />
      <div className="fixed inset-0 noise pointer-events-none" />
      <div
        className="fixed inset-0 pointer-events-none transition-transform duration-75"
        style={{ background: `radial-gradient(ellipse 600px 600px at ${50 + mousePos.x}% ${30 + mousePos.y}%, rgba(74,222,128,0.06), transparent)` }}
      />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-green-400/40 to-transparent pointer-events-none" />

      <div className="relative pt-8">
        {/* Hero Section */}
        <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-4 pb-24 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none">
            <div className="absolute inset-0 rounded-full border border-green-400/5 animate-spin-slow" />
            <div className="absolute inset-8 rounded-full border border-green-400/5" style={{ animation: 'spin-slow 15s linear infinite reverse' }} />
            <div className="absolute inset-16 rounded-full border border-green-400/8" style={{ animation: 'spin-slow 10s linear infinite' }} />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(74,222,128,0.04) 0%, transparent 70%)' }}
          />

          <FloatingCard style={{ top: '20%', left: '8%', animation: 'float1 7s ease-in-out infinite' }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <span className="text-gray-700 dark:text-gray-300">Rahul is available nearby</span>
          </FloatingCard>
          <FloatingCard style={{ top: '30%', right: '6%', animation: 'float2 9s ease-in-out infinite' }}>
            <span>🏏</span>
            <span className="text-gray-700 dark:text-gray-300">Cricket · 2.3km away</span>
          </FloatingCard>
          <FloatingCard style={{ bottom: '28%', left: '5%', animation: 'float3 6s ease-in-out infinite' }}>
            <span>🏟️</span>
            <div>
              <div className="text-gray-900 dark:text-white text-xs font-semibold">Punjab Cricket Ground</div>
              <div className="text-green-400 text-xs">Slot available — ₹500/hr</div>
            </div>
          </FloatingCard>
          <FloatingCard style={{ bottom: '25%', right: '7%', animation: 'float1 8s ease-in-out 1s infinite' }}>
            <span>👥</span>
            <span className="text-gray-700 dark:text-gray-300">Sunday Gang · 4/11 joined</span>
          </FloatingCard>

          <div className="relative z-10 text-center max-w-5xl mx-auto">
            <div className="animate-fadeUp inline-flex items-center gap-2 bg-green-400/8 border border-green-400/15 rounded-full px-5 py-2 text-green-400 text-sm mb-10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              Live players active near you right now
            </div>
            <div className="overflow-hidden mb-2">
              <h1 className="font-bebas animate-fadeUp-1 relative"
                style={{ fontSize: 'clamp(4rem, 15vw, 10rem)', lineHeight: 0.9, letterSpacing: '0.05em' }}
                data-text="PLAYNSPORTS"
              >
                <span className="text-gradient">spotNplay</span>
              </h1>
            </div>
            <div className="animate-fadeUp-2 mt-6 mb-10">
              <p className="text-gray-600 dark:text-gray-400 text-2xl md:text-xl max-w-2xl mx-auto leading-relaxed">
                {quote}
                <br />
                <span className="text-gray-900 dark:text-white font-medium">Your sports community — live on the map.</span>
              </p>
            </div>
            <div className="animate-fadeUp-3 flex flex-wrap gap-4 justify-center">
              {user ? (
                <>
                  <Link to="/map" className="btn-primary">Open Live Map 🗺️</Link>
                  <Link to={user.role === 'player' ? '/player/dashboard' : '/owner/dashboard'} className="btn-secondary">My Dashboard →</Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="btn-primary">Get Started — Free 🚀</Link>
                  <Link to="/otp-login" className="btn-secondary">Login with OTP 📧</Link>
                </>
              )}
            </div>
            <div ref={statsRef} className="animate-fadeUp-4 flex justify-center gap-12 mt-16">
              <div className="text-center">
                <div className="font-bebas text-4xl text-green-400"><AnimatedCounter target={stats.players} /></div>
                <div className="text-xs text-gray-600 uppercase tracking-widest mt-1">Players</div>
              </div>
              <div className="w-px bg-black/8 dark:bg-white/8" />
              <div className="text-center">
                <div className="font-bebas text-4xl text-green-400"><AnimatedCounter target={stats.grounds} /></div>
                <div className="text-xs text-gray-600 uppercase tracking-widest mt-1">Grounds</div>
              </div>
              <div className="w-px bg-black/8 dark:bg-white/8" />
              <div className="text-center">
                <div className="font-bebas text-4xl text-green-400"><AnimatedCounter target={stats.sports} /></div>
                <div className="text-xs text-gray-600 uppercase tracking-widest mt-1">Sports</div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-fadeUp-4 flex flex-col items-center gap-2">
            <span className="text-gray-600 text-xs uppercase tracking-widest">Scroll</span>
            <div className="w-px h-8 bg-gradient-to-b from-gray-600 to-transparent" style={{ animation: 'float2 2s ease-in-out infinite' }} />
          </div>
        </section>

        {/* Marquee */}
        <div className="relative py-6 overflow-hidden border-y border-black/5 dark:border-white/5">
          <div className="flex animate-marquee whitespace-nowrap">
            {['FOOTBALL', 'CRICKET', 'BASKETBALL', 'TENNIS', 'BADMINTON', 'VOLLEYBALL', 'BOX CRICKET', 'BOX FOOTBALL',
              'FOOTBALL', 'CRICKET', 'BASKETBALL', 'TENNIS', 'BADMINTON', 'VOLLEYBALL', 'BOX CRICKET', 'BOX FOOTBALL'].map((sport, i) => (
              <span key={i} className="mx-8 font-bebas text-2xl tracking-widest text-gray-900/10 dark:text-white/10">
                {sport} <span className="text-green-400/30">✦</span>
              </span>
            ))}
          </div>
        </div>

        {/* Nearby Players & Grounds Section */}
        <section className="py-24 px-4" ref={featuresRef}>
          <div className="max-w-6xl mx-auto">

            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-green-400/10 border border-green-400/20 rounded-full px-4 py-1.5 mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                </span>
                <span className="text-green-400 text-xs font-semibold uppercase tracking-wider">Live Near You</span>
              </div>
              <h2 className="font-bebas text-5xl md:text-7xl tracking-wide text-gray-900 dark:text-white mb-3">
                LIVE <span className="shimmer-text">RIGHT NOW</span>
              </h2>
              <p className="text-gray-600 text-sm">Players and grounds currently active on the platform</p>
            </div>

            {/* Tabs */}
            <div className="flex justify-center mb-8">
              <div className="flex gap-1 p-1 bg-black/3 dark:bg-white/3 border border-black/6 dark:border-white/6 rounded-2xl">
                <button
                  onClick={() => { setActiveTab('players'); setPlayerPage(0); }}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={activeTab === 'players' ? {
                    background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)',
                  } : { color: 'var(--text-muted)' }}
                >
                  ⚽ Players ({nearbyPlayers.length})
                </button>
                <button
                  onClick={() => { setActiveTab('grounds'); setGroundPage(0); }}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={activeTab === 'grounds' ? {
                    background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)',
                  } : { color: 'var(--text-muted)' }}
                >
                  🏟️ Grounds ({nearbyGrounds.length})
                </button>
              </div>
            </div>

            {/* Content */}
            {locationLoading ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600 text-sm">Finding nearby {activeTab}...</p>
              </div>
            ) : locationError ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-black/3 dark:bg-white/3 border border-black/8 dark:border-white/8 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">📍</div>
                <p className="text-gray-500 text-sm mb-4">{locationError}</p>
                <button onClick={() => navigate('/map')} className="bg-green-400/10 border border-green-400/20 text-green-400 px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-400/20 transition-all">
                  Open Map →
                </button>
              </div>
            ) : (
              <>
                {/* Players Tab */}
                {activeTab === 'players' && (
                  <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {nearbyPlayers.length === 0 ? (
                      <div className="col-span-3 text-center py-16">
                        <div className="text-4xl mb-3">🏃</div>
                        <p className="text-gray-600 text-sm">No players available right now</p>
                      </div>
                    ) : (
                      nearbyPlayers.slice(playerPage * 6, (playerPage + 1) * 6).map((player, i) => (
                        <div
                          key={player._id}
                          className={`nearby-card ${featuresInView ? 'card-visible' : 'card-hidden'}`}
                          style={{ animationDelay: `${i * 0.1}s` }}
                          onClick={() => navigate('/map')}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            {player.user?.avatar ? (
                              <img src={player.user.avatar} className="w-10 h-10 rounded-xl object-cover" alt="" />
                            ) : (
                              <div className="w-10 h-10 bg-green-400/15 border border-green-400/20 rounded-xl flex items-center justify-center font-bold text-green-400">
                                {player.user?.name?.[0] || '?'}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-900 dark:text-white font-semibold text-sm truncate">{player.user?.name || 'Player'}</p>
                              <p className="text-gray-600 text-xs">📍 Nearby</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                              </span>
                              <span className="text-green-400 text-xs">Live</span>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <span className="bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 text-gray-600 dark:text-gray-400 text-xs px-2.5 py-1 rounded-lg">
                              {player.sport || 'Sport'}
                            </span>
                            <span className="text-xs px-2.5 py-1 rounded-lg font-semibold capitalize"
                              style={{
                                background: skillColor(player.skillLevel).bg,
                                color: skillColor(player.skillLevel).color,
                                border: `1px solid ${skillColor(player.skillLevel).border}`,
                              }}
                            >
                              {player.skillLevel || 'Beginner'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {nearbyPlayers.length > 6 && (
                    <div className="flex justify-center items-center gap-4 mt-6">
                      <button 
                        disabled={playerPage === 0}
                        onClick={() => setPlayerPage(p => Math.max(0, p - 1))}
                        className="bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:bg-black/10 dark:hover:bg-white/10"
                      >
                        ← Prev
                      </button>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                        {playerPage + 1} / {Math.ceil(nearbyPlayers.length / 6)}
                      </span>
                      <button 
                        disabled={(playerPage + 1) * 6 >= nearbyPlayers.length}
                        onClick={() => setPlayerPage(p => p + 1)}
                        className="bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:bg-black/10 dark:hover:bg-white/10"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                  </>
                )}

                {/* Grounds Tab */}
                {activeTab === 'grounds' && (
                  <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {nearbyGrounds.length === 0 ? (
                      <div className="col-span-3 text-center py-16">
                        <div className="text-4xl mb-3">🏟️</div>
                        <p className="text-gray-600 text-sm">No grounds available right now</p>
                      </div>
                    ) : (
                      nearbyGrounds.slice(groundPage * 6, (groundPage + 1) * 6).map((ground, i) => (
                        <div
                          key={ground._id}
                          className={`nearby-card ${featuresInView ? 'card-visible' : 'card-hidden'}`}
                          style={{ animationDelay: `${i * 0.1}s` }}
                          onClick={() => navigate(`/grounds/${ground._id}`)}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            {ground.images?.[0] ? (
                              <img src={ground.images[0]} className="w-10 h-10 rounded-xl object-cover" alt="" />
                            ) : (
                              <div className="w-10 h-10 bg-green-400/15 border border-green-400/20 rounded-xl flex items-center justify-center text-xl">🏟️</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-900 dark:text-white font-semibold text-sm truncate">{ground.name}</p>
                              <p className="text-gray-600 text-xs truncate">📍 {ground.address || 'Nearby'}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 text-gray-600 dark:text-gray-400 text-xs px-2.5 py-1 rounded-lg">{ground.sport}</span>
                            <span className="text-green-400 text-sm font-bold">₹{ground.pricePerHour}/hr</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {nearbyGrounds.length > 6 && (
                    <div className="flex justify-center items-center gap-4 mt-6">
                      <button 
                        disabled={groundPage === 0}
                        onClick={() => setGroundPage(p => Math.max(0, p - 1))}
                        className="bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:bg-black/10 dark:hover:bg-white/10"
                      >
                        ← Prev
                      </button>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                        {groundPage + 1} / {Math.ceil(nearbyGrounds.length / 6)}
                      </span>
                      <button 
                        disabled={(groundPage + 1) * 6 >= nearbyGrounds.length}
                        onClick={() => setGroundPage(p => p + 1)}
                        className="bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:bg-black/10 dark:hover:bg-white/10"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                  </>
                )}

                {(nearbyPlayers.length > 0 || nearbyGrounds.length > 0) && (
                  <div className="text-center mt-8">
                    <button
                      onClick={() => navigate('/map')}
                      className="inline-flex items-center gap-2 bg-green-400/10 border border-green-400/20 text-green-400 px-8 py-3 rounded-xl font-semibold hover:bg-green-400/20 transition-all hover:-translate-y-0.5"
                    >
                      View All on Map 🗺️
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Sports Grid */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <p className="text-gray-700 text-xs uppercase tracking-[0.3em] text-center mb-10">Supported Sports</p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {[
                { emoji: '⚽', name: 'Football' },
                { emoji: '🏏', name: 'Cricket' },
                { emoji: '🏏', name: 'Box Cricket' },
                { emoji: '⚽', name: 'Box Football' },
                { emoji: '🏀', name: 'Basketball' },
                { emoji: '🎾', name: 'Tennis' },
                { emoji: '🏸', name: 'Badminton' },
                { emoji: '🏐', name: 'Volleyball' },
              ].map((s, i) => (
                <div key={i} className="group flex flex-col items-center gap-3 bg-black/2 dark:bg-white/2 border border-black/5 dark:border-white/5 rounded-2xl p-5 hover:border-green-400/30 hover:bg-green-400/5 transition-all duration-300 cursor-pointer">
                  <span className="text-3xl group-hover:scale-110 transition-transform duration-300">{s.emoji}</span>
                  <span className="text-xs text-gray-600 group-hover:text-green-400 transition-colors uppercase tracking-wider">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        {!user && (
          <section className="py-28 px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="relative inline-block mb-8">
                <div className="absolute inset-0 rounded-full bg-green-400/10 animate-ping-slow" />
                <div className="relative w-16 h-16 bg-green-400/15 border border-green-400/30 rounded-full flex items-center justify-center text-2xl">🏆</div>
              </div>
              <h2 className="font-bebas text-5xl md:text-8xl text-gray-900 dark:text-white tracking-wide mb-6">
                READY TO <span className="text-green-400">PLAY?</span>
              </h2>
              <p className="text-gray-500 text-lg mb-10 max-w-xl mx-auto">
                Join thousands of players already on the map. Find your next game today.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to="/register" className="btn-primary">Join as Player 🚀</Link>
                <Link to="/register" className="btn-secondary">List Your Ground 🏟️</Link>
              </div>
            </div>
          </section>
        )}

        {/* Get in Touch */}
        <section className="py-20 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-black/2 dark:bg-white/2 border border-black/6 dark:border-white/6 rounded-3xl p-8 md:p-10 text-center">
              <p className="text-gray-700 text-xs uppercase tracking-[0.3em] mb-3">Get in Touch</p>
              <h2 className="font-bebas text-3xl md:text-4xl text-gray-900 dark:text-white tracking-wide mb-3">
                FOUND A BUG? HAVE FEEDBACK?
              </h2>
              <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto">
                Send us a message and it'll land straight in front of the team.
              </p>

              {!user ? (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-gray-500 text-sm">Log in to send us a message.</p>
                  <Link to="/login" className="btn-primary">Log In</Link>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="text-left">
                  <textarea
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Tell us what's up..."
                    maxLength={2000}
                    rows={4}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 rounded-2xl px-5 py-4 text-sm text-gray-900 dark:text-white outline-none focus:border-green-400/40 transition-all resize-none"
                  />
                  <div className="flex items-center justify-between mt-4 gap-4">
                    <div className="text-sm">
                      {contactError && <span className="text-red-400">{contactError}</span>}
                      {contactSent && <span className="text-green-400">✓ Message sent — thanks!</span>}
                    </div>
                    <button
                      type="submit"
                      disabled={contactSubmitting || !contactMessage.trim()}
                      className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      {contactSubmitting ? 'Sending...' : 'Send Message ✉️'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-black/5 dark:border-white/5 py-10 px-4 mx-auto">
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-6">
        
            <p className="text-gray-700 text-sm">© 2026 SPOTNPLAY — Built for players, by players.</p>
            
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Home;
