import { useState, useEffect } from 'react';
import API from '../../api/axios';
import { SPORT_EMOJI, sportLabel, formatEventDate, formatEventTime } from '../events/eventConstants.js';

const approvalBadgeColor = (s) => {
  if (s === 'approved') return 'bg-green-400/10 text-green-400 border-green-400/20';
  if (s === 'rejected') return 'bg-red-400/10 text-red-400 border-red-400/20';
  return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20';
};

const Spinner = () => (
  <div className="flex justify-center py-16">
    <div className="w-10 h-10 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
  </div>
);

const EmptyState = ({ icon, text }) => (
  <div className="flex flex-col items-center py-16 gap-3 text-center">
    <span className="text-5xl">{icon}</span>
    <p className="text-gray-500 text-sm">{text}</p>
  </div>
);

const EventApprovals = ({ flash, fetchStats }) => {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(null); // event id
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchEvents();
  }, [filter]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/admin/events?status=${filter}`);
      setEvents(data);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await API.patch(`/admin/events/${id}/approve`);
      flash('Event approved ✅');
      fetchEvents();
      fetchStats?.();
    } catch {
      flash('Failed', 'error');
    }
  };

  const handleReject = async () => {
    try {
      await API.patch(`/admin/events/${rejectModal}/reject`, { reason: rejectReason });
      flash('Event rejected');
      setRejectModal(null);
      setRejectReason('');
      fetchEvents();
      fetchStats?.();
    } catch {
      flash('Failed', 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white">EVENT APPLICATIONS</h2>
        <div className="flex gap-2 ml-auto">
          {['pending', 'approved', 'rejected', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${filter === f ? 'tab-active' : 'tab-inactive'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <button onClick={fetchEvents} className="text-xs text-gray-500 hover:text-green-400 transition-colors">↻</button>
      </div>

      {loading ? <Spinner /> : events.length === 0 ? (
        <EmptyState icon="📅" text={`No ${filter === 'all' ? '' : filter} events`} />
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((event, i) => (
            <div key={event._id} className="card anim-cardIn" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                {/* Sport icon */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}>
                  {SPORT_EMOJI[event.sport] || '🏅'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-gray-900 dark:text-white font-semibold">{event.title}</p>
                    <span className={`badge ${approvalBadgeColor(event.approvalStatus)} capitalize`}>{event.approvalStatus}</span>
                    {event.status === 'cancelled' && <span className="badge bg-red-400/10 text-red-400 border-red-400/20">Cancelled</span>}
                    {event.subEvents?.length > 0 ? (
                      <span className="badge bg-blue-400/10 text-blue-400 border-blue-400/20">🗂️ {event.subEvents.length} sub-events</span>
                    ) : (
                      <span className={`badge ${event.eventType === 'paid' ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 'bg-green-400/10 text-green-400 border-green-400/20'}`}>
                        {event.eventType === 'paid' ? `₹${event.price} / person` : 'FREE'}
                      </span>
                    )}
                  </div>

                  {!event.subEvents?.length && <p className="text-gray-500 text-xs mb-1">📍 {event.venue}</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-1">
                    <span className="capitalize">{sportLabel(event.sport)}</span>
                    {!event.subEvents?.length && (
                      <>
                        <span>📅 {formatEventDate(event.date)}</span>
                        <span>⏰ {formatEventTime(event.startTime)} – {formatEventTime(event.endTime)}</span>
                        <span>👥 {event.participants?.length || 0}{event.maxParticipants > 0 ? ` / ${event.maxParticipants}` : ''} joined</span>
                      </>
                    )}
                  </div>

                  {event.subEvents?.length > 0 && (
                    <div className="flex flex-col gap-1.5 my-2">
                      {event.subEvents.map((se) => (
                        <div key={se._id} className="text-xs text-gray-500 bg-white/[0.02] border border-white/5 rounded-lg px-3 py-1.5">
                          <span className="text-gray-300 font-medium">{se.title}</span>
                          {' · '}📍 {se.venue} · 📅 {formatEventDate(se.date)} · ⏰ {formatEventTime(se.startTime)}
                          {' · '}{se.eventType === 'paid' ? `₹${se.price}/ticket` : 'Free'}
                          {' · '}up to {se.maxTicketsPerBooking}/player{se.capacity > 0 ? ` · cap ${se.capacity}` : ''}
                        </div>
                      ))}
                    </div>
                  )}

                  {event.description && (
                    <p className="text-gray-500 text-xs mb-1 line-clamp-2">{event.description}</p>
                  )}

                  <p className="text-gray-500 text-xs">📞 Contact: {event.contactName || event.organizer?.name} · {event.contactNumber}</p>

                  {/* Organizer */}
                  <div className="flex items-center gap-2 mt-2">
                    {event.organizer?.avatar
                      ? <img src={event.organizer.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                      : <div className="w-6 h-6 rounded-full bg-green-400/10 border border-green-400/20 flex items-center justify-center text-green-400 text-xs font-bold">{event.organizer?.name?.charAt(0)}</div>
                    }
                    <p className="text-gray-500 text-xs">{event.organizer?.name} · {event.organizer?.email}</p>
                  </div>

                  {event.rejectionReason && (
                    <p className="text-red-400 text-xs mt-1.5">Rejection reason: {event.rejectionReason}</p>
                  )}
                  <p className="text-gray-600 text-xs mt-1">Submitted {new Date(event.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>

                {/* Actions */}
                {event.approvalStatus === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(event._id)}
                      className="bg-green-400/15 border border-green-400/25 text-green-400 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-400/25 transition-all"
                    >✅ Approve</button>
                    <button
                      onClick={() => setRejectModal(event._id)}
                      className="bg-red-400/10 border border-red-400/20 text-red-400 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-400/20 transition-all"
                    >❌ Reject</button>
                  </div>
                )}
                {event.approvalStatus === 'rejected' && (
                  <button
                    onClick={() => handleApprove(event._id)}
                    className="bg-green-400/15 border border-green-400/25 text-green-400 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-400/25 transition-all flex-shrink-0"
                  >↩ Re-approve</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-4">Reject Event</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm outline-none resize-none mb-4 focus:border-red-400/40"
            />
            <div className="flex gap-3">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="flex-1 bg-white/5 border border-white/10 text-gray-400 rounded-xl py-3 text-sm font-semibold hover:bg-white/10 transition-all">Cancel</button>
              <button onClick={handleReject} className="flex-1 bg-red-400/15 border border-red-400/25 text-red-400 rounded-xl py-3 text-sm font-semibold hover:bg-red-400/25 transition-all">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventApprovals;
