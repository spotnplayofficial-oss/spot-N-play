import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import SpotNPlayLogo from '../components/SpotNPlayLogo';
import { Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const SetupPassword = () => {
  const { user, updateUser } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const { data } = await API.post('/auth/setup-password', { password });
      updateUser({ hasPassword: true, authProvider: data.user?.authProvider || 'both' });
      toast.success('Account password created successfully! ✅');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save password. You can set it later from your profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#070c18] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#b3f406]/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-8 relative z-10">
        <SpotNPlayLogo size="lg" theme="dark" />
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-[#0c1428]/85 backdrop-blur-xl border border-white/10 rounded-3xl p-7 md:p-8 shadow-2xl shadow-black/80 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-[#b3f406]/15 border border-[#b3f406]/30 flex items-center justify-center text-[#b3f406] mb-5 mx-auto">
          <ShieldCheck size={24} />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-center text-white mb-2">
          Create Account Password
        </h1>
        <p className="text-sm text-slate-400 text-center mb-6 leading-relaxed">
          Welcome <span className="text-[#b3f406] font-semibold">{user?.name || 'Player'}</span>! You connected via Google. Create an account password to also enable standard email sign-in anytime.
        </p>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2.5 text-xs text-red-400">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSavePassword} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Password (min 6 characters)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={`w-full bg-black/40 border rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-slate-600 focus:outline-none transition ${
                  confirmPassword && confirmPassword !== password
                    ? 'border-red-500/50'
                    : confirmPassword && confirmPassword === password
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

            {confirmPassword && confirmPassword === password && (
              <p className="flex items-center gap-1 text-[11px] text-[#b3f406] mt-1.5">
                <CheckCircle2 size={12} /> Passwords match
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#b3f406] hover:bg-[#c6ff24] text-black font-bold py-3.5 px-4 rounded-xl text-sm transition-all duration-200 transform hover:translate-y-[-1px] active:translate-y-[0px] shadow-lg shadow-[#b3f406]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Saving Password...' : 'Save Password & Enter App →'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Skip for now (I'll keep using Google only) →
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupPassword;
