import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
      .font-bebas { font-family: 'Bebas Neue', cursive !important; }
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(24px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-12px) rotate(2deg); }
      }
      @keyframes shimmer {
        from { background-position: -200% center; }
        to { background-position: 200% center; }
      }
      @keyframes spin-slow {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(-10px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes glow {
        0%, 100% { box-shadow: 0 0 20px rgba(74,222,128,0.15); }
        50% { box-shadow: 0 0 40px rgba(74,222,128,0.3); }
      }
      @keyframes particle-float {
        0% { transform: translateY(100vh) scale(0); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateY(-10vh) scale(1); opacity: 0; }
      }
      @keyframes typewriter {
        from { width: 0; }
        to { width: 100%; }
      }
      @keyframes blink { 50% { border-color: transparent; } }
      @keyframes count-up {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes blob {
        0% { transform: translate(0px, 0px) scale(1); }
        33% { transform: translate(30px, -50px) scale(1.1); }
        66% { transform: translate(-20px, 20px) scale(0.9); }
        100% { transform: translate(0px, 0px) scale(1); }
      }
      .animate-blob { animation: blob 7s infinite; }
      .animate-glow { animation: glow 3s ease-in-out infinite; }
      .typewriter-text {
          display: inline-block;
          overflow: hidden;
          white-space: nowrap;
          width: 0;
          border-right: 2px solid #4ade80;
          animation:
              typing 2.5s steps(38, end) forwards,
              blink .7s step-end infinite;
      }
      @keyframes typing {
    from {
        width: 0;
    }
    to {
        width: 36ch;
    }
}
      .particle {
        position: fixed;
        width: 4px;
        height: 4px;
        background: rgba(74,222,128,0.3);
        border-radius: 50%;
        pointer-events: none;
      }
      .animate-fadeUp-1 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s forwards; opacity: 0; }
      .animate-fadeUp-2 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s forwards; opacity: 0; }
      .animate-fadeUp-3 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.3s forwards; opacity: 0; }
      .animate-fadeUp-4 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.4s forwards; opacity: 0; }
      .animate-fadeUp-5 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.5s forwards; opacity: 0; }
      .animate-float { animation: float 6s ease-in-out infinite; }
      .animate-spin-slow { animation: spin-slow 20s linear infinite; }
      .animate-slideIn { animation: slideIn 0.3s ease forwards; }
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
      .input-field {
        width: 100%;
        background: var(--glass-05);
        border: 1px solid var(--glass-08, rgba(255,255,255,0.08));
        border-radius: 14px;
        padding: 14px 16px;
        color: var(--text-main);
        font-size: 15px;
        transition: all 0.3s ease;
        outline: none;
      }
      .input-field:focus {
        background: var(--glass-05, rgba(255,255,255,0.05));
        border-color: rgba(74,222,128,0.5);
        box-shadow: 0 0 0 3px rgba(74,222,128,0.08);
      }
      .input-field::placeholder { color: var(--glass-20, rgba(255,255,255,0.2)); }
      .input-focused {
        background: var(--glass-05, rgba(255,255,255,0.05)) !important;
        border-color: rgba(74,222,128,0.5) !important;
        box-shadow: 0 0 0 3px rgba(74,222,128,0.08) !important;
      }
      .btn-login {
        width: 100%;
        background: linear-gradient(135deg, #4ade80, #22c55e);
        color: black;
        font-weight: 700;
        font-size: 16px;
        border-radius: 14px;
        padding: 15px;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        font-family: 'DM Sans', sans-serif;
      }
      .btn-login::before {
        content: '';
        position: absolute;
        top: 0; left: -100%;
        width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        transition: left 0.5s ease;
      }
      .btn-login:hover::before { left: 100%; }
      .btn-login:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(74,222,128,0.35); }
      .btn-login:disabled { opacity: 0.6; transform: none; box-shadow: none; }
      .otp-btn {
        width: 100%;
        background: var(--glass-05);
        border: 1px solid var(--glass-08, rgba(255,255,255,0.08));
        color: var(--text-main);
        font-weight: 500;
        font-size: 15px;
        border-radius: 14px;
        padding: 14px;
        transition: all 0.3s ease;
        font-family: 'DM Sans', sans-serif;
        text-align: center;
        display: block;
      }
      .otp-btn:hover {
        background: var(--glass-06, rgba(255,255,255,0.06));
        border-color: var(--text-muted);
        color: var(--text-main);
        transform: translateY(-1px);
      }
      .google-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        background: var(--glass-05);
        border: 1px solid var(--glass-08, rgba(255,255,255,0.08));
        color: var(--text-main);
        font-weight: 500;
        font-size: 15px;
        border-radius: 14px;
        padding: 14px;
        transition: all 0.3s ease;
        font-family: 'DM Sans', sans-serif;
        text-decoration: none;
      }
      .google-btn:hover {
        background: var(--glass-06, rgba(255,255,255,0.06));
        border-color: var(--text-muted);
        color: var(--text-main);
        transform: translateY(-1px);
      }
      .divider {
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--text-muted);
        font-size: 12px;
      }
      .divider::before, .divider::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--glass-08, rgba(255,255,255,0.08));
      }
      .sport-pill {
        background: var(--glass-05);
        border: 1px solid var(--glass-06, rgba(255,255,255,0.06));
        border-radius: 100px;
        padding: 6px 14px;
        font-size: 12px;
        color: var(--text-muted);
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  try {
    const { data } = await API.post('/auth/login', form);
    login({
      _id: data._id,
      name: data.name,
      email: data.email,
      role: data.role,
      phone: data.phone,
      avatar: data.avatar || '',
      isEmailVerified: data.isEmailVerified,
      isPhoneVerified: data.isPhoneVerified,
    }, data.token);

    if (data.role === 'admin') navigate('/admin');
    else if (data.role === 'coach') navigate('/coach/dashboard');
    else if (data.role === 'ground_owner') navigate('/owner/dashboard');
    else if (data.role === 'player') navigate('/player/dashboard');
    else navigate('/');

  } catch (err) {
    setError(err.response?.data?.message || 'Login failed');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white flex items-center justify-center px-4 relative overflow-hidden">
      <div className="fixed inset-0 grid-dots pointer-events-none opacity-20" />
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-green-500/20 rounded-full blur-[100px] animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-blue-500/10 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '2s', animationDuration: '8s' }} />
        <div className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] bg-emerald-500/10 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '4s', animationDuration: '10s' }} />
      </div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none opacity-50 z-0">
        <div className="absolute inset-0 rounded-full border-[1px] border-dashed border-green-400/20 animate-spin-slow" />
        <div className="absolute inset-16 rounded-full border-[1px] border-green-400/10" style={{ animation: 'spin-slow 25s linear infinite reverse' }} />
        <div className="absolute inset-32 rounded-full border-[1px] border-dashed border-green-400/10 animate-spin-slow" style={{ animationDuration: '30s' }} />
      </div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(74,222,128,0.06) 0%, transparent 60%)' }} />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[1px] bg-gradient-to-r from-transparent via-green-400/50 to-transparent pointer-events-none" />

      {/* Floating particles */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div key={i} className="particle" style={{
          left: `${Math.random() * 100}%`,
          animation: `particle-float ${5 + Math.random() * 10}s linear ${Math.random() * 5}s infinite`,
          width: `${2 + Math.random() * 4}px`,
          height: `${2 + Math.random() * 4}px`,
          background: `rgba(74,222,128,${0.2 + Math.random() * 0.4})`,
          boxShadow: `0 0 10px rgba(74,222,128,0.5)`,
        }} />
      ))}

      <div className="absolute top-20 right-20 animate-float" style={{ animationDelay: '0s' }}>
        <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-black/8 dark:border-white/8 rounded-2xl px-4 py-3 text-sm hidden lg:flex items-center gap-2">
          <span>⚽</span>
          <span className="text-gray-600 dark:text-gray-400">Football · 3 players nearby</span>
        </div>
      </div>
      <div className="absolute top-36 left-16 animate-float" style={{ animationDelay: '1s' }}>
        <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-black/8 dark:border-white/8 rounded-2xl px-4 py-3 text-sm hidden lg:flex items-center gap-2">
          <span>🏏</span>
          <span className="text-gray-600 dark:text-gray-400">Cricket · 12 matches today</span>
        </div>
      </div>
      <div className="absolute bottom-32 left-16 animate-float" style={{ animationDelay: '2s' }}>
        <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-black/8 dark:border-white/8 rounded-2xl px-4 py-3 text-sm hidden lg:flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
          </span>
          <span className="text-gray-600 dark:text-gray-400">24 players active now</span>
        </div>
      </div>
      <div className="absolute top-48 right-16 animate-float" style={{ animationDelay: '3s' }}>
        <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-black/8 dark:border-white/8 rounded-2xl px-4 py-3 text-sm hidden lg:flex items-center gap-2">
          <span>🏀</span>
          <span className="text-gray-600 dark:text-gray-400">Basketball · 5 grounds open</span>
        </div>
      </div>
      <div className="absolute bottom-48 right-20 animate-float" style={{ animationDelay: '4s' }}>
        <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-black/8 dark:border-white/8 rounded-2xl px-4 py-3 text-sm hidden lg:flex items-center gap-2">
          <span>🎾</span>
          <span className="text-gray-600 dark:text-gray-400">Tennis · 2 courts free</span>
        </div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="animate-fadeUp-1 text-center mb-8">
          {/* <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-green-400 rounded-xl flex items-center justify-center animate-glow">
              <span className="text-black font-black text-sm">S</span>
            </div>
            <span className="bold text-2xl tracking-widest text-gray-900 dark:text-white">spotNplay</span>
          </Link> */}
          <h1 className="font-bebas text-5xl tracking-wide shimmer-text mb-2">WELCOME BACK</h1>
          <p className="text-gray-600 text-sm"><span className="typewriter-text">Sign in to find players and book grounds</span></p>
        </div>

        <div className="animate-fadeUp-2 bg-white dark:bg-white/2 border border-black/10 dark:border-white/6 rounded-3xl p-8 backdrop-blur-sm">
          {error && (
            <div className="animate-slideIn bg-red-400/8 border border-red-400/20 text-red-400 px-4 py-3 rounded-2xl mb-6 text-sm flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="animate-fadeUp-3">
              <label className="text-xs text-gray-600 uppercase tracking-wider mb-2 block">Email Address</label>
              <input
                type="email" name="email" value={form.email}
                onChange={handleChange}
                onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
                placeholder="alex@example.com" required
                className={`input-field ${focused === 'email' ? 'input-focused' : ''}`}
              />
            </div>
            <div className="animate-fadeUp-3">
              <label className="text-xs text-gray-600 uppercase tracking-wider mb-2 block">Password</label>
              <input
                type="password" name="password" value={form.password}
                onChange={handleChange}
                onFocus={() => setFocused('password')} onBlur={() => setFocused('')}
                placeholder="••••••••" required
                className={`input-field ${focused === 'password' ? 'input-focused' : ''}`}
              />
            </div>
            <div className="animate-fadeUp-4">
              <button type="submit" disabled={loading} className="btn-login">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Signing in...
                  </span>
                ) : 'Sign In →'}
              </button>
            </div>
          </form>

          <div className="animate-fadeUp-4 divider my-5">OR</div>

          {/* Google Login */}
          <div className="animate-fadeUp-5 flex flex-col gap-3">
            
            <a  href={`${import.meta.env.VITE_API_URL}/auth/google`}
              className="google-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </a>

            {/* <Link to="/otp-login" className="otp-btn">
              Login with OTP 📧
            </Link> */}
          </div>
        </div>

        <div className="animate-fadeUp-5 text-center mt-6">
          <p className="text-gray-600 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-green-400 hover:text-green-300 font-medium transition-colors">
              Create one free →
            </Link>
          </p>
        </div>

        {/* <div className="animate-fadeUp-5 flex flex-wrap justify-center gap-2 mt-8">
          {['⚽ Football', '🏏 Cricket', '🏀 Basketball', '🎾 Tennis', '🏸 Badminton', '🏏 Box Cricket', '⚽ Box Football'].map((s, i) => (
            <span key={i} className="sport-pill" style={{ animation: `fadeUp 0.5s ease ${0.6 + i * 0.1}s forwards`, opacity: 0 }}>{s}</span>
          ))}
        </div> */}

        {/* Animated stats bar */}
        {/* <div className="animate-fadeUp-5 mt-8 flex justify-center gap-6">
          {[
            { value: '10K+', label: 'Players', icon: '⚡' },
            { value: '500+', label: 'Grounds', icon: '🏟️' },
            { value: '15+', label: 'Cities', icon: '🗺️' },
          ].map((stat, i) => (
            <div key={i} className="text-center" style={{ animation: `count-up 0.6s ease ${1 + i * 0.15}s forwards`, opacity: 0 }}>
              <div className="text-green-400 font-bold text-lg">{stat.icon} {stat.value}</div>
              <div className="text-gray-700 text-xs uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div> */}
      </div>
    </div>
  );
};

export default Login;