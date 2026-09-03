import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import SpotNPlayLogo from '../components/SpotNPlayLogo';
import { Eye, EyeOff, KeyRound, Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Verify & Reset
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email: email.trim() });
      toast.success('Verification code sent to your email! 📧');
      setStep(2);
      setResendCooldown(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send verification code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await API.post('/auth/reset-password', {
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });
      toast.success('Password reset successfully! ✅ Please sign in.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email: email.trim() });
      toast.success('A fresh verification code was sent! 📧');
      setResendCooldown(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070c18] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#b3f406]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-8 relative z-10">
        <Link to="/" className="inline-block transition-transform hover:scale-105" aria-label="spotNplay Home">
          <SpotNPlayLogo size="lg" theme="dark" />
        </Link>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-[#0c1428]/85 backdrop-blur-xl border border-white/10 rounded-3xl p-7 md:p-8 shadow-2xl shadow-black/80 relative z-10">
        {/* Step 1: Request Code */}
        {step === 1 && (
          <div>
            <div className="w-12 h-12 rounded-2xl bg-[#b3f406]/15 border border-[#b3f406]/30 flex items-center justify-center text-[#b3f406] mb-5 mx-auto">
              <Mail size={22} />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-center text-white mb-2">
              Forgot Password?
            </h1>
            <p className="text-sm text-slate-400 text-center mb-6 leading-relaxed">
              Enter your account email and we'll send you a 6-digit verification code to reset your password.
            </p>

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2.5 text-xs text-red-400">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#b3f406] focus:ring-1 focus:ring-[#b3f406] transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-[#b3f406] hover:bg-[#c6ff24] text-black font-bold py-3.5 px-4 rounded-xl text-sm transition-all duration-200 transform hover:translate-y-[-1px] active:translate-y-[0px] shadow-lg shadow-[#b3f406]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? 'Sending Code...' : 'Send Verification Code →'}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Verify OTP & Enter New Password */}
        {step === 2 && (
          <div>
            <div className="w-12 h-12 rounded-2xl bg-[#b3f406]/15 border border-[#b3f406]/30 flex items-center justify-center text-[#b3f406] mb-5 mx-auto">
              <KeyRound size={22} />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-center text-white mb-2">
              Create New Password
            </h1>
            <p className="text-xs text-slate-400 text-center mb-6 leading-relaxed">
              We sent a 6-digit code to <span className="text-[#b3f406] font-semibold">{email}</span>. Enter the code and set your new password.
            </p>

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2.5 text-xs text-red-400">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* 6-Digit OTP */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || loading}
                    className="text-xs text-[#b3f406] hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-center text-xl tracking-[0.3em] font-mono text-white placeholder-slate-600 focus:outline-none focus:border-[#b3f406] focus:ring-1 focus:ring-[#b3f406] transition"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  New Password (min 6 characters)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#b3f406] focus:ring-1 focus:ring-[#b3f406] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={`w-full bg-black/40 border rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-slate-600 focus:outline-none transition ${
                      confirmPassword && confirmPassword !== newPassword
                        ? 'border-red-500/50'
                        : confirmPassword && confirmPassword === newPassword
                        ? 'border-[#b3f406]/60'
                        : 'border-white/10 focus:border-[#b3f406]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {confirmPassword && confirmPassword === newPassword && (
                  <p className="flex items-center gap-1 text-[11px] text-[#b3f406] mt-1.5">
                    <CheckCircle2 size={12} /> Passwords match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 bg-[#b3f406] hover:bg-[#c6ff24] text-black font-bold py-3.5 px-4 rounded-xl text-sm transition-all duration-200 transform hover:translate-y-[-1px] active:translate-y-[0px] shadow-lg shadow-[#b3f406]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? 'Updating Password...' : 'Reset Password & Continue →'}
              </button>
            </form>
          </div>
        )}

        {/* Back to Login Link */}
        <div className="mt-6 pt-5 border-t border-white/10 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-[#b3f406] transition-colors"
          >
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
