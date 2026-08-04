import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_URL } from '../config';
import API from '../api/axios';
import { dataStore } from '../utils/dataStore';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeRequests, setActiveRequests] = useState([]);

  useEffect(() => {
    if (!user || !token) return;

    socketRef.current = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
  auth: { token },
  transports: ['polling', 'websocket'],
});

    const socket = socketRef.current;

    // socket.on('connect', () => {
    //   console.log('🟢 Socket connected:', socket.id);
    // });

    socket.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    socket.on('user_online', ({ userId }) => {
      setOnlineUsers((prev) => [...new Set([...prev, userId])]);
    });

    socket.on('user_offline', ({ userId }) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    socket.on('message_notification', (data) => {
      setNotifications((prev) => [data, ...prev.slice(0, 9)]);
      setUnreadCount((prev) => prev + 1);
    });

    // ── Looking for Players — live updates ──
    const upsertRequest = (req) => {
      setActiveRequests((prev) => {
        const exists = prev.some((r) => r._id === req._id);
        return exists ? prev.map((r) => (r._id === req._id ? req : r)) : [req, ...prev];
      });
    };
    const removeRequest = ({ _id }) => {
      setActiveRequests((prev) => prev.filter((r) => r._id !== _id));
    };
    socket.on('request:created', upsertRequest);
    socket.on('request:joined', upsertRequest);
    socket.on('request:full', upsertRequest);
    socket.on('request:cancelled', removeRequest);
    socket.on('request:expired', removeRequest);

    // Initial load — read-through cache, same pattern the rest of the app
    // uses (see utils/dataStore.js), so this is instant on revisit and the
    // socket events above keep it fresh from here on.
    dataStore.getOrFetch('looking:active', () => API.get('/looking').then((r) => r.data))
      .then((data) => setActiveRequests(data))
      .catch(() => {});

    socket.on('disconnect', () => {
      console.log('🔴 Socket disconnected');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setActiveRequests([]);
    };
  }, [user, token]);

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const isOnline = (userId) => onlineUsers.includes(userId?.toString());

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      onlineUsers,
      notifications,
      unreadCount,
      clearNotifications,
      isOnline,
      activeRequests,
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);