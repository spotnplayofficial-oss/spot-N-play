import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { PROFILE_STYLES } from './profileStyles';
import ProfileHero from './ProfileHero';
import ProfileInfo from './ProfileInfo';
import ProfileSports from './ProfileSports';
import ProfileSocials from './ProfileSocials';

const UserProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [profileUser, setProfileUser] = useState(null);
  const [playerProfile, setPlayerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* ── inject styles ── */
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = PROFILE_STYLES;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // If the ID is the current user's own ID, redirect to /profile
      if (currentUser && id === currentUser._id) {
        navigate('/profile', { replace: true });
        return;
      }
      const { data } = await API.get(`/users/${id}/profile`);
      setProfileUser(data.user);
      setPlayerProfile(data.playerProfile);
    } catch (err) {
      setError(err.response?.data?.message || 'User not found');
    } finally {
      setLoading(false);
    }
  }, [id, currentUser, navigate]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const isOwnProfile = currentUser && profileUser && currentUser._id === profileUser._id?.toString();

  /* ── loading ── */
  if (loading) {
    return (
      <div
        className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] flex flex-col"
        style={{ fontFamily: 'DM Sans, sans-serif' }}
      >
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div style={{
            width: 38, height: 38, border: '3px solid rgba(74,222,128,0.15)',
            borderTopColor: '#4ade80', borderRadius: '50%',
            animation: 'up-spin 0.8s linear infinite',
          }} />
        </div>
      </div>
    );
  }

  /* ── error / not found ── */
  if (error || !profileUser) {
    return (
      <div
        className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white flex flex-col"
        style={{ fontFamily: 'DM Sans, sans-serif' }}
      >
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <p style={{ fontSize: 56 }}>🔍</p>
          <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 32 }} className="text-gray-400">
            User Not Found
          </h2>
          <p className="text-gray-500 text-sm text-center max-w-xs">
            {error || 'This profile does not exist or has been removed.'}
          </p>
          <button onClick={() => navigate(-1)} className="up-btn up-btn-secondary">
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white"
      style={{ fontFamily: 'DM Sans, sans-serif' }}
    >
      {/* Backgrounds */}
      <div className="fixed inset-0 up-grid-dots pointer-events-none opacity-20" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-green-400/20 to-transparent pointer-events-none" />
      <div className="fixed pointer-events-none overflow-hidden inset-0 z-0">
        <div
          className="absolute up-blob opacity-60"
          style={{ top: '-8%', left: '-8%', width: '40vw', height: '40vw', maxWidth: 450, maxHeight: 450, background: 'radial-gradient(circle, rgba(74,222,128,0.07), transparent 70%)', borderRadius: '50%' }}
        />
      </div>

      <Navbar />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10">

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="up-btn up-btn-secondary mb-6"
          style={{ fontSize: 12, padding: '7px 14px' }}
        >
          ← Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

          {/* ── Left column ── */}
          <div className="flex flex-col gap-5">
            <ProfileHero
              user={profileUser}
              playerProfile={playerProfile}
              isOwnProfile={isOwnProfile}
              currentUserId={currentUser?._id}
            />
            <ProfileSports playerProfile={playerProfile} />
          </div>

          {/* ── Right column ── */}
          <div className="flex flex-col gap-4">
            <ProfileInfo user={profileUser} playerProfile={playerProfile} />
            <ProfileSocials playerProfile={playerProfile} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
