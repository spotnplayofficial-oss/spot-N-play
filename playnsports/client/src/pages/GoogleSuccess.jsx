import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GoogleSuccess = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const rawUser = params.get('user');
      const user = rawUser ? JSON.parse(decodeURIComponent(rawUser)) : null;

      if (token && user) {
        login(user, token);
        // If the user signed in with Google and hasn't created a password, route to password setup
        if (user.hasPassword === false) {
          navigate('/setup-password');
        } else {
          navigate('/');
        }
      } else {
        navigate('/login');
      }
    } catch {
      navigate('/login');
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#070c18] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-[#b3f406]/30 border-t-[#b3f406] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Signing you in with Google...</p>
      </div>
    </div>
  );
};

export default GoogleSuccess;