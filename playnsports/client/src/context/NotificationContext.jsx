import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../api/axios';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const NotificationContext = createContext();

// Maps a notification's `type` to an icon shown in the bell dropdown and
// the toast. Add a new type here (and to the server's
// notificationTypes.js) and every other part of the notification system
// (model, API, real-time push, this UI) picks it up automatically — no
// other code to touch.
export const NOTIFICATION_ICONS = {
  group_invite: '👥',
  new_message: '💬',
  event_approved: '✅',
  event_rejected: '❌',
  coach_approved: '🏋️',
  coach_rejected: '🚫',
  new_coach_application: '🆕',
  new_ground_submitted: '🏟️',
  slot_booked: '📅',
  event_ticket_issued: '🎟️',
  event_checked_in: '🎉',
  verify_reminder: '⚠️',
};

const isNotificationSupported = () => typeof window !== 'undefined' && 'Notification' in window;

// True only while this tab is the one the user is actually looking at.
const isTabActive = () => document.visibilityState === 'visible' && document.hasFocus();

// In-app toast (react-hot-toast) — used while the user is on this tab,
// just possibly on a different page of the app.
const showToast = (notification, navigate) => {
  toast.custom(
    (t) => (
      <div
        onClick={() => {
          toast.dismiss(t.id);
          if (notification.link) navigate(notification.link);
        }}
        className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white dark:bg-[#161616] shadow-xl rounded-2xl pointer-events-auto flex items-start gap-3 px-4 py-3 border border-black/10 dark:border-white/10 cursor-pointer`}
      >
        <span className="text-xl flex-shrink-0">{NOTIFICATION_ICONS[notification.type] || '🔔'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">{notification.title}</p>
          {notification.body && (
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug mt-0.5">{notification.body}</p>
          )}
        </div>
      </div>
    ),
    { duration: 5000 }
  );
};

// Native OS-level popup — used when the browser/this site is open
// somewhere but the user is looking at a different tab or a different
// app entirely. Never fires once the browser/tab is fully closed, and
// is skipped entirely if this tab is the focused one (the toast above
// covers that case).
const showCrossTabNotification = (notification, navigate) => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;
  if (isTabActive()) return;

  const popup = new Notification(notification.title, {
    body: notification.body,
    icon: `${window.location.origin}/favicon.svg`,
    tag: notification._id, // de-dupe if it somehow fires twice
  });

  popup.onclick = () => {
    window.focus();
    if (notification.link) navigate(notification.link);
    popup.close();
  };
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [permission, setPermission] = useState(
    isNotificationSupported() ? Notification.permission : 'unsupported'
  );
  const [reminderDismissed, setReminderDismissed] = useState(false);

  // Best-effort ask for cross-tab popup permission. Some browsers (Chrome)
  // only honor this when tied to a user gesture — NotificationBell also
  // calls this on click so there's always a second chance even if this
  // silent attempt is ignored. If the user already denied it, we don't
  // nag them again — the toast still covers the focused-tab case either way.
  const requestPermission = useCallback(() => {
    if (!isNotificationSupported() || Notification.permission !== 'default') return;
    Notification.requestPermission().then(setPermission);
  }, []);

  useEffect(() => {
    if (user) requestPermission();
  }, [user, requestPermission]);

  const fetchNotifications = useCallback(async (page = 1) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await API.get(`/notifications?page=${page}&limit=20`);
      setNotifications((prev) => (page === 1 ? data.notifications : [...prev, ...data.notifications]));
      setUnreadCount(data.unreadCount);
      setHasMore(data.hasMore);
    } catch {
      // silent — bell just stays empty, not worth interrupting the UI
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await API.get('/notifications/unread-count');
      setUnreadCount(data.unreadCount);
    } catch {
      // ignore
    }
  }, [user]);

  // Whether the user dismissed the incomplete-verification reminder this session.
  useEffect(() => {
    if (!user) { setReminderDismissed(false); return; }
    setReminderDismissed(sessionStorage.getItem(`verify_reminder_dismissed_${user._id}`) === '1');
  }, [user]);

  // Synthetic, client-only reminder shown while email and/or phone aren't
  // verified yet — not persisted on the server, recomputed from `user`.
  const verificationReminder = useMemo(() => {
    if (!user || reminderDismissed) return null;
    const missing = [];
    if (!user.isEmailVerified) missing.push('email');
    if (!user.isPhoneVerified) missing.push('phone number');
    if (missing.length === 0) return null;

    return {
      _id: 'verify-reminder',
      type: 'verify_reminder',
      title: 'Your profile is incomplete',
      body: `Verify your ${missing.join(' and ')} to finish setting up your account.`,
      link: '/profile',
      isRead: false,
      synthetic: true,
      createdAt: new Date().toISOString(),
    };
  }, [user, reminderDismissed]);

  // Initial load whenever a user logs in; reset everything on logout
  useEffect(() => {
    if (user) {
      fetchNotifications(1);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotifications]);

  // Real-time push — new_notification is emitted by the server to the
  // `user_<id>` room any time notificationService.notify() runs. Only
  // reaches this tab while the socket connection is alive, i.e. while
  // the site is open somewhere in the browser.
  useEffect(() => {
    if (!socket) return;
    const handler = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      if (isTabActive()) {
        showToast(notification, navigate);
      } else {
        showCrossTabNotification(notification, navigate);
      }
    };
    socket.on('new_notification', handler);
    return () => socket.off('new_notification', handler);
  }, [socket, navigate]);

  const markAsRead = useCallback(async (id) => {
    if (id === 'verify-reminder') {
      if (user) sessionStorage.setItem(`verify_reminder_dismissed_${user._id}`, '1');
      setReminderDismissed(true);
      return;
    }
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((prev) => Math.max(prev - 1, 0));
    try {
      await API.patch(`/notifications/${id}/read`);
    } catch {
      // not critical if this fails silently — worst case it shows unread again on next fetch
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    if (user) sessionStorage.setItem(`verify_reminder_dismissed_${user._id}`, '1');
    setReminderDismissed(true);
    try {
      await API.patch('/notifications/read-all');
    } catch {
      // ignore
    }
  }, [user]);

  const deleteNotification = useCallback(async (id) => {
    if (id === 'verify-reminder') {
      if (user) sessionStorage.setItem(`verify_reminder_dismissed_${user._id}`, '1');
      setReminderDismissed(true);
      return;
    }
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    try {
      await API.delete(`/notifications/${id}`);
    } catch {
      // ignore
    }
  }, [user]);

  const notificationsWithReminder = useMemo(
    () => (verificationReminder ? [verificationReminder, ...notifications] : notifications),
    [verificationReminder, notifications]
  );
  const unreadCountWithReminder = unreadCount + (verificationReminder ? 1 : 0);

  return (
    <NotificationContext.Provider
      value={{
        notifications: notificationsWithReminder,
        unreadCount: unreadCountWithReminder,
        loading,
        hasMore,
        permission,
        requestPermission,
        fetchNotifications,
        refreshUnreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
