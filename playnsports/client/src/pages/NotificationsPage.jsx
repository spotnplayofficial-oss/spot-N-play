import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, Loader2, Users, MessageCircle, Calendar, Dumbbell, MapPin, Ticket } from 'lucide-react';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import { useNotifications, NOTIFICATION_ICONS } from '../context/NotificationContext';

const CATEGORIES = [
  { key: '', label: 'All', icon: null },
  { key: 'group', label: 'Groups', icon: Users },
  { key: 'chat', label: 'Chat', icon: MessageCircle },
  { key: 'event', label: 'Events', icon: Calendar },
  { key: 'coach', label: 'Coaches', icon: Dumbbell },
  { key: 'ground', label: 'Grounds', icon: MapPin },
  { key: 'ticket', label: 'Tickets', icon: Ticket },
];

const timeAgo = (dateString) => {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { unreadCount, refreshUnreadCount, fetchNotifications: refreshBell } = useNotifications();

  const [readFilter, setReadFilter] = useState('all'); // 'all' | 'unread'
  const [category, setCategory] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (pageNum, { append = false } = {}) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', pageNum);
      params.set('limit', '20');
      if (readFilter === 'unread') params.set('unreadOnly', 'true');
      if (category) params.set('category', category);

      const { data } = await API.get(`/notifications?${params.toString()}`);
      setItems((prev) => (append ? [...prev, ...data.notifications] : data.notifications));
      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch {
      if (!append) setItems([]);
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  }, [readFilter, category]);

  // Refetch from page 1 whenever a filter changes
  useEffect(() => { load(1); }, [readFilter, category, load]);

  const syncBell = () => { refreshUnreadCount(); refreshBell(1); };

  const handleMarkAsRead = async (id) => {
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    try { await API.patch(`/notifications/${id}/read`); } catch { /* ignore */ }
    syncBell();
  };

  const handleMarkAllAsRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try { await API.patch('/notifications/read-all'); } catch { /* ignore */ }
    syncBell();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    setItems((prev) => prev.filter((n) => n._id !== id));
    try { await API.delete(`/notifications/${id}`); } catch { /* ignore */ }
    syncBell();
  };

  const handleClickNotification = (n) => {
    if (!n.isRead) handleMarkAsRead(n._id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl tracking-wide text-green-500 dark:text-green-400" style={{ fontFamily: "'Bebas Neue', cursive" }}>NOTIFICATIONS</h1>
            <p className="text-gray-500 text-sm mt-2">
              {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : "You're all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 border border-green-500/20 hover:border-green-500/40 bg-green-500/5 hover:bg-green-500/10 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer"
            >
              <Check size={13} /> Mark all read
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {/* Read/Unread tabs */}
          <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl p-1">
            {['all', 'unread'].map((f) => (
              <button
                key={f}
                onClick={() => setReadFilter(f)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  readFilter === f
                    ? 'bg-green-400 text-black'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-1 hidden sm:block" />

          {/* Category pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = category === c.key;
              return (
                <button
                  key={c.key || 'all'}
                  onClick={() => setCategory(c.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                    active
                      ? 'bg-green-400/15 border-green-400/30 text-green-600 dark:text-green-400'
                      : 'bg-transparent border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-black/20 dark:hover:border-white/20 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  {Icon && <Icon size={12} />} {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-dashed border-black/10 dark:border-white/10 rounded-2xl">
            <Bell size={32} className="mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {readFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">
              {category ? 'Try a different category, or check back later.' : "We'll let you know when something happens."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((n) => (
              <div
                key={n._id}
                onClick={() => handleClickNotification(n)}
                className={`group relative flex items-start gap-3 px-4 py-3.5 rounded-2xl border cursor-pointer transition-all ${
                  !n.isRead
                    ? 'bg-green-400/[0.05] border-green-400/15 hover:border-green-400/30'
                    : 'bg-black/[0.015] dark:bg-white/[0.015] border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10'
                }`}
              >
                <span className="text-xl flex-shrink-0 mt-0.5">{NOTIFICATION_ICONS[n.type] || '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">{n.title}</p>
                  {n.body && <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug mt-0.5">{n.body}</p>}
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 block">{timeAgo(n.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-green-400" />}
                  <button
                    onClick={(e) => handleDelete(n._id, e)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-opacity cursor-pointer p-1"
                    title="Dismiss"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {hasMore && (
              <button
                onClick={() => load(page + 1, { append: true })}
                disabled={loadingMore}
                className="mt-3 w-full py-3 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 border border-black/10 dark:border-white/10 hover:border-green-400/30 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
