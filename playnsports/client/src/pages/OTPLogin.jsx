import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const OTPLogin = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('player');
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [focused, setFocused] = useState('');
  const otpRefs = useRef([]);
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
      @keyframes stepFade {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .animate-fadeUp-1 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s forwards; opacity: 0; }
      .animate-fadeUp-2 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s forwards; opacity: 0; }
      .animate-fadeUp-3 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.3s forwards; opacity: 0; }
      .animate-fadeUp-4 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.4s forwards; opacity: 0; }
      .animate-fadeUp-5 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.5s forwards; opacity: 0; }
      .animate-fadeUp-6 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.6s forwards; opacity: 0; }
      .animate-float { animation: float 6s ease-in-out infinite; }
      .animate-spin-slow { animation: spin-slow 20s linear infinite; }
      .animate-slideIn { animation: slideIn 0.3s ease forwards; }
      .animate-stepFade { animation: stepFade 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }

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
        font-family: 'DM Sans', sans-serif;
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

      /* OTP boxes */
      .otp-box {
        width: 48px;
        height: 56px;
        background: var(--glass-05);
        border: 1px solid var(--glass-08, rgba(255,255,255,0.08));
        border-radius: 14px;
        color: var(--text-main);
        font-size: 22px;
        font-weight: 700;
        text-align: center;
        transition: all 0.3s ease;
        outline: none;
        font-family: 'DM Sans', sans-serif;
        caret-color: #4ade80;
      }
      .otp-box:focus {
        background: var(--glass-05, rgba(255,255,255,0.05));
        border-color: rgba(74,222,128,0.5);
        box-shadow: 0 0 0 3px rgba(74,222,128,0.08);
      }
      .otp-box.filled {
        border-color: rgba(74,222,128,0.3);
        background: rgba(74,222,128,0.04);
        color: #4ade80;
      }

      /* Step indicator */
      .step-dot {
        width: 8px; height: 8px;
        border-radius: 100px;
        background: var(--glass-10, rgba(255,255,255,0.1));
        transition: all 0.4s ease;
      }
      .step-dot.active {
        width: 24px;
        background: #4ade80;
      }
      .step-dot.done {
        background: rgba(74,222,128,0.4);
      }

      .role-selector {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .role-option {
        background: var(--glass-05);
        border: 1px solid var(--glass-08, rgba(255,255,255,0.08));
        border-radius: 14px;
        padding: 12px 16px;
        color: var(--text-muted);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: 'DM Sans', sans-serif;
      }
      .role-option:hover {
        background: var(--glass-05, rgba(255,255,255,0.05));
        border-color: var(--text-muted);
        color: var(--text-main);
      }
      .role-option.active {
        background: rgba(74,222,128,0.08);
        border-color: rgba(74,222,128,0.4);
        color: #4ade80;
        box-shadow: 0 0 0 3px rgba(74,222,128,0.06);
      }

      .btn-primary {
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
      .btn-primary::before {
        content: '';
        position: absolute;
        top: 0; left: -100%;
        width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        transition: left 0.5s ease;
      }
      .btn-primary:hover::before { left: 100%; }
      .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(74,222,128,0.35); }
      .btn-primary:disabled { opacity: 0.6; transform: none; box-shadow: none; }

      .btn-ghost {
        background: transparent;
        color: var(--text-muted);
        font-size: 13px;
        font-family: 'DM Sans', sans-serif;
        transition: color 0.2s ease;
        padding: 8px;
      }
      .btn-ghost:hover { color: var(--text-main); }

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

  // OTP box handlers
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await API.post('/otp/send', { email });
      setMessage('OTP sent to your email ✅');
      const userCheck = await API.post('/otp/check', { email }).catch(() => null);
      if (userCheck?.data?.exists === false) setIsNewUser(true);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await API.post('/otp/verify', {
        email,
        otp: otp.join(''),
        name,
        phone,
        role,
      });
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
      if (data.role === 'player') navigate('/player/dashboard');
      else navigate('/owner/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 grid-dots pointer-events-none opacity-40" />

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none">
        <div className="absolute inset-0 rounded-full border border-green-400/5 animate-spin-slow" />
        <div className="absolute inset-12 rounded-full border border-green-400/4" style={{ animation: 'spin-slow 15s linear infinite reverse' }} />
      </div>

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(74,222,128,0.04) 0%, transparent 70%)' }}
      />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[400px] h-[1px] bg-gradient-to-r from-transparent via-green-400/30 to-transparent pointer-events-none" />

      {/* Floating badges */}
      <div className="absolute top-20 right-20 animate-float" style={{ animationDelay: '0s' }}>
        <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-black/8 dark:border-white/8 rounded-2xl px-4 py-3 text-sm hidden lg:flex items-center gap-2">
          <span>📧</span>
          <span className="text-gray-600 dark:text-gray-400">Quick · No password needed</span>
        </div>
      </div>
      <div className="absolute bottom-32 left-16 animate-float" style={{ animationDelay: '2s' }}>
        <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-black/8 dark:border-white/8 rounded-2xl px-4 py-3 text-sm hidden lg:flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
          </span>
          <span className="text-gray-600 dark:text-gray-400">Secure OTP login</span>
        </div>
      </div>

      {/* Main */}
      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="animate-fadeUp-1 text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 bg-green-400 rounded-xl flex items-center justify-center">
              <span className="text-black font-black text-sm">S</span>
            </div>
            <span className=" text-2xl tracking-widest text-gray-900 dark:text-white">spotNplay</span>
          </Link>
          <h1 className="font-bebas text-5xl tracking-wide shimmer-text mb-2">
            {step === 1 ? 'OTP LOGIN' : isNewUser ? 'ALMOST THERE' : 'ENTER CODE'}
          </h1>
          <p className="text-gray-600 text-sm">
            {step === 1 ? "We'll send a 6-digit code to your email" : `Code sent to ${email}`}
          </p>
        </div>

        {/* Step indicator */}
        <div className="animate-fadeUp-1 flex items-center justify-center gap-2 mb-6">
          <div className={`step-dot ${step >= 1 ? 'active' : ''}`} />
          <div className={`step-dot ${step >= 2 ? 'active' : 'done'}`} />
        </div>

        {/* Card */}
        <div className="animate-fadeUp-2 bg-white dark:bg-white/2 border border-black/10 dark:border-white/6 rounded-3xl p-8 backdrop-blur-sm">

          {error && (
            <div className="animate-slideIn bg-red-400/8 border border-red-400/20 text-red-400 px-4 py-3 rounded-2xl mb-6 text-sm flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}
          {message && step === 2 && (
            <div className="animate-slideIn bg-green-400/8 border border-green-400/20 text-green-400 px-4 py-3 rounded-2xl mb-6 text-sm flex items-center gap-2">
              <span>✅</span> {message}
            </div>
          )}

          {/* Step 1 — Email */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="animate-stepFade flex flex-col gap-5">
              <div className="animate-fadeUp-3">
                <label className="text-xs text-gray-600 uppercase tracking-wider mb-2 block">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused('')}
                  placeholder="gaurav@gmail.com"
                  required
                  className={`input-field ${focused === 'email' ? 'input-focused' : ''}`}
                />
              </div>
              <div className="animate-fadeUp-4">
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Sending OTP...
                    </span>
                  ) : 'Send OTP 📧'}
                </button>
              </div>
            </form>
          )}

          {/* Step 2 — OTP + optional new user fields */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="animate-stepFade flex flex-col gap-5">

              {/* OTP boxes */}
              <div className="animate-fadeUp-3">
                <label className="text-xs text-gray-600 uppercase tracking-wider mb-3 block">Enter 6-digit OTP</label>
                <div className="flex gap-2 justify-between" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => otpRefs.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className={`otp-box ${digit ? 'filled' : ''}`}
                    />
                  ))}
                </div>
              </div>

              {/* New user fields */}
              {isNewUser && (
                <>
                  <div className="border-t border-black/5 dark:border-white/5 pt-4">
                    <p className="text-xs text-green-400/60 uppercase tracking-wider mb-4">Complete your profile</p>

                    <div className="flex flex-col gap-4">
                      <div className="animate-fadeUp-3">
                        <label className="text-xs text-gray-600 uppercase tracking-wider mb-2 block">Your Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onFocus={() => setFocused('name')}
                          onBlur={() => setFocused('')}
                          placeholder="Gaurav Kumar"
                          required
                          className={`input-field ${focused === 'name' ? 'input-focused' : ''}`}
                        />
                      </div>

                      <div className="animate-fadeUp-4">
                        <label className="text-xs text-gray-600 uppercase tracking-wider mb-2 block">Phone Number</label>
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          onFocus={() => setFocused('phone')}
                          onBlur={() => setFocused('')}
                          placeholder="9999999999"
                          className={`input-field ${focused === 'phone' ? 'input-focused' : ''}`}
                        />
                      </div>

                      <div className="animate-fadeUp-5">
                        <label className="text-xs text-gray-600 uppercase tracking-wider mb-2 block">I am a</label>
                        <div className="role-selector">
                          <button type="button" onClick={() => setRole('player')} className={`role-option ${role === 'player' ? 'active' : ''}`}>
                            <span>🏃</span> Player
                          </button>
                          <button type="button" onClick={() => setRole('ground_owner')} className={`role-option ${role === 'ground_owner' ? 'active' : ''}`}>
                            <span>🏟️</span> Ground Owner
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="animate-fadeUp-5">
                <button type="submit" disabled={loading || otp.join('').length < 6} className="btn-primary">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Verifying...
                    </span>
                  ) : 'Verify & Login ✅'}
                </button>
              </div>

              <div className="text-center">
                <button type="button" onClick={() => { setStep(1); setError(''); setMessage(''); setOtp(['','','','','','']); }} className="btn-ghost">
                  ← Change Email
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer links */}
        <div className="animate-fadeUp-5 text-center mt-6 flex flex-col gap-2">
          <p className="text-gray-600 text-sm">
            Login with password?{' '}
            <Link to="/login" className="text-green-400 hover:text-green-300 font-medium transition-colors">Click here →</Link>
          </p>
          <p className="text-gray-600 text-sm">
            New user?{' '}
            <Link to="/register" className="text-green-400 hover:text-green-300 font-medium transition-colors">Register here →</Link>
          </p>
        </div>

        {/* Sport pills */}
        <div className="animate-fadeUp-6 flex flex-wrap justify-center gap-2 mt-8">
          {['⚽ Football', '🏏 Cricket', '🏀 Basketball', '🎾 Tennis', '🏸 Badminton', '🏏 Box Cricket', '⚽ Box Football'].map((s, i) => (
            <span key={i} className="sport-pill">{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OTPLogin;