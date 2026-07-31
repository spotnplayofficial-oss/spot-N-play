import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataStore } from '../utils/dataStore';
import { resetPrefetch } from '../utils/prefetch';

const AuthContext = createContext();

// ── Daily auto-logout boundary ──
// The "day" for session purposes resets at 2 AM local time instead of
// midnight. So a login at 11 PM on Monday and a login at 1 AM on Tuesday
// both belong to "Monday's session day", while opening the app at 2 AM
// Tuesday (or later) belongs to "Tuesday's session day" and triggers a logout.
const RESET_HOUR = 2; // 2 AM

const getSessionDay = (date = new Date()) => {
  const d = new Date(date);
  if (d.getHours() < RESET_HOUR) {
    d.setDate(d.getDate() - 1);
  }
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
};

const getMsUntilNextReset = () => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(RESET_HOUR, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const clearSession = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('sessionDay');
    dataStore.clear();
    resetPrefetch();
  };

  // ── Load session on mount, but expire it if we've crossed the 2 AM boundary ──
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    const storedSessionDay = localStorage.getItem('sessionDay');

    if (storedUser && storedToken) {
      if (storedSessionDay && storedSessionDay !== getSessionDay()) {
        // App was reopened after the 2 AM cutoff — force a fresh login
        // so streaks and other "daily" data are recalculated correctly.
        clearSession();
      } else {
        setUser(JSON.parse(storedUser));
        // Backfill sessionDay for sessions created before this feature existed
        if (!storedSessionDay) localStorage.setItem('sessionDay', getSessionDay());
      }
    }
    setLoading(false);
  }, []);

  // ── Auto-logout at 2 AM while the app stays open ──
  useEffect(() => {
    if (!user) return;

    const timeoutId = setTimeout(() => {
      clearSession();
      navigate('/login');
    }, getMsUntilNextReset());

    return () => clearTimeout(timeoutId);
  }, [user]);

  const login = (userData, tokenData) => {
    const userToStore = {
      _id: userData._id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      phone: userData.phone,
      avatar: userData.avatar || '',
      isEmailVerified: !!userData.isEmailVerified,
      isPhoneVerified: !!userData.isPhoneVerified,
    };
    setUser(userToStore);
    setToken(tokenData);
    localStorage.setItem('user', JSON.stringify(userToStore));
    localStorage.setItem('token', tokenData);
    localStorage.setItem('sessionDay', getSessionDay());
  };

  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const logout = () => {
    clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
