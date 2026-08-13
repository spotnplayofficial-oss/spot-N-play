import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import EditEventModal from './EditEventModal.jsx';
import { SPORT_EMOJI, sportLabel, formatEventDate, formatEventTime, approvalColor } from './eventConstants.js';

const MyEventsList = ({ events, onRefresh, flash, onView }) => {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const handleCancel = async (event) => {
    if (!window.confirm(`Cancel "${event.title}"? This cannot be undone.`)) return;
    setBusyId(event._id);
    try {
      await API.patch(`/events/${event._id}/cancel`);
      flash('Event cancelled');
      onRefresh();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to cancel event', 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (!events.length) {
    return (
      <div className="ev-empty">
        <span style={{ fontSize: 40 }}>🗂️</span>
        <p className="text-gray-400">You haven't created any events yet.</p>
        <p className="text-gray-500 text-sm">Switch to the "Create Event" tab to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {events.map((event, i) => {
        const isPaid = event.eventType === 'paid';
        const hasSubEvents = event.subEvents?.length > 0;

        // For sub-event containers, roll every sub-event's bookings up into
        // one flat list so the existing expand/participants UI below keeps
        // working without a rewrite — just annotate which sub-event each
        // booking belongs to.
        const allBookings = hasSubEvents
          ? event.subEvents.flatMap((se) => (se.bookings || []).map((b) => ({ ...b, _subTitle: se.title, _subPaid: se.eventType === 'paid' })))
          : (event.participants || []);

        const paidCount = hasSubEvents
          ? allBookings.filter((b) => b.paymentStatus === 'paid').length
          : event.participants?.filter((p) => p.paymentStatus === 'paid').length || 0;
        const revenue = hasSubEvents
          ? allBookings.reduce((sum, b) => sum + (b.amountPaid || 0), 0)
          : event.participants?.reduce((sum, p) => sum + (p.amountPaid || 0), 0) || 0;
        const totalTickets = hasSubEvents
          ? allBookings.reduce((sum, b) => sum + (b.quantity || 1), 0)
          : allBookings.length;
        const anyPaidSub = hasSubEvents && event.subEvents.some((se) => se.eventType === 'paid');

        return (
          <div key={event._id} className="g-card g-cardIn" style={{ animationDelay: `${i * 0.05}s` }}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="g-sport-icon" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}>
                  {SPORT_EMOJI[event.sport] || '🏅'}
                </div>
                <div className="min-w-0">
                  <p className="text-gray-900 dark:text-white font-semibold truncate">{event.title}</p>
                  <p className="text-gray-500 text-xs">{sportLabel(event.sport)} · {formatEventDate(event.date)} · {formatEventTime(event.startTime)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={approvalColor(event.approvalStatus)}>
                  {event.approvalStatus === 'pending' && '⏳ Awaiting Approval'}
                  {event.approvalStatus === 'approved' && '✅ Approved'}
                  {event.approvalStatus === 'rejected' && '❌ Rejected'}
                </span>
                {event.status === 'cancelled' && <span className="ev-badge-cancelled">Cancelled</span>}
                {hasSubEvents ? (
                  <span className="ev-sport-chip">🗂️ {event.subEvents.length} sub-event{event.subEvents.length > 1 ? 's' : ''}</span>
                ) : (
                  <span className={isPaid ? 'ev-badge-paid' : 'ev-badge-free'}>{isPaid ? `₹${event.price}` : 'FREE'}</span>
                )}
              </div>
            </div>

            {event.approvalStatus === 'rejected' && event.rejectionReason && (
              <div className="g-invite-card mb-3" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
                <p className="text-red-400 text-xs"><strong>Reason:</strong> {event.rejectionReason}</p>
              </div>
            )}

            {!hasSubEvents && <p className="text-gray-500 text-xs mb-3">📍 {event.venue}</p>}

            {/* Stats row */}
            <div className="flex items-center gap-4 mb-3 flex-wrap">
              <button
                onClick={() => setExpandedId(expandedId === event._id ? null : event._id)}
                className="g-btn-secondary"
                style={{ padding: '8px 14px', fontSize: 12 }}
              >
                👥 {totalTickets}{!hasSubEvents && event.maxParticipants > 0 ? ` / ${event.maxParticipants}` : ''} {hasSubEvents ? 'tickets booked' : 'joined'}
                {expandedId === event._id ? ' ▲' : ' ▼'}
              </button>
              {(isPaid || anyPaidSub) && (
                <span className="text-gray-500 text-xs">💰 ₹{revenue} collected ({paidCount} paid booking{paidCount === 1 ? '' : 's'})</span>
              )}
            </div>

            {/* Participants / bookings list */}
            {expandedId === event._id && (
              <div className="flex flex-col gap-2 mb-3 g-slideIn">
                {allBookings.length ? allBookings.map((p, idx) => (
                  <div key={p.ticketId || p.user?._id || p.user || idx} className="ev-participant-row">
                    {p.user?.avatar ? (
                      <img src={p.user.avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div className="g-member-initial" style={{ marginLeft: 0 }}>{p.user?.name?.charAt(0)}</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-900 dark:text-white text-sm truncate">
                        {p.user?.name}{p.quantity > 1 ? ` · ${p.quantity} tickets` : ''}
                      </p>
                      {p._subTitle && <p className="text-gray-500 text-xs truncate">{p._subTitle}</p>}
                      {p.user?.phone && <p className="text-gray-500 text-xs">📞 {p.user.phone}</p>}
                    </div>
                    {p.paymentStatus === 'paid' ? (
                      <span className="ev-badge-approved">Paid ₹{p.amountPaid}</span>
                    ) : (
                      <span className="ev-badge-free">Joined</span>
                    )}
                  </div>
                )) : (
                  <p className="text-gray-500 text-sm text-center py-2">No one has booked yet.</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              {/* View detail page */}
              <button
                onClick={() => navigate(`/events/${event._id}`)}
                className="g-btn-secondary"
                style={{ fontSize: 12, padding: '8px 14px' }}
              >
                👁 View
              </button>

              {/* Edit — available for all non-cancelled events owned by this user */}
              {event.status !== 'cancelled' && (
                <button
                  onClick={() => setEditingEvent(event)}
                  className="g-btn-secondary"
                  style={{ fontSize: 12, padding: '8px 14px' }}
                >
                  ✏️ Edit
                </button>
              )}

              {/* Cancel */}
              {event.status !== 'cancelled' && (
                <button
                  onClick={() => handleCancel(event)}
                  disabled={busyId === event._id}
                  className="g-btn-danger"
                  style={{ fontSize: 12, padding: '8px 14px' }}
                >
                  {busyId === event._id ? 'Cancelling…' : '🗑️ Cancel'}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onUpdated={() => { onRefresh(); setEditingEvent(null); }}
          flash={flash}
        />
      )}
    </div>
  );
};

export default MyEventsList;