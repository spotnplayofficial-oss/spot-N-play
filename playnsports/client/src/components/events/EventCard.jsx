import { SPORT_EMOJI, sportLabel, formatEventDate, formatEventTime } from './eventConstants.js';
import UserChip from '../UserChip.jsx';

const EventCard = ({ event, animDelay = 0, onView }) => {
  const isFree = event.eventType !== 'paid';

  return (
    <div
      className="g-card g-cardIn"
      style={{ animationDelay: `${animDelay}s`, cursor: 'pointer' }}
      onClick={() => onView(event)}
    >
      {event.image && (
        <img src={event.image} alt={event.title} className="ev-banner mb-3" />
      )}

      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="g-sport-icon" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}>
            {SPORT_EMOJI[event.sport] || '🏅'}
          </div>
          <div className="min-w-0">
            <p className="text-gray-900 dark:text-white font-semibold text-sm truncate">{event.title}</p>
            <p className="text-gray-500 text-xs">{sportLabel(event.sport)}</p>
          </div>
        </div>
        <span className={isFree ? 'ev-badge-free' : 'ev-badge-paid'} style={{ flexShrink: 0 }}>
          {isFree ? 'FREE' : `₹${event.price}`}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        <span className="ev-sport-chip">📅 {formatEventDate(event.date)}</span>
        <span className="ev-sport-chip">⏰ {formatEventTime(event.startTime)} – {formatEventTime(event.endTime)}</span>
      </div>

      <p className="text-gray-500 text-xs mb-2">📍 {event.venue}</p>

      {event.description && (
        <p className="text-gray-500 text-xs mb-3 line-clamp-2">{event.description}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs">by</span>
          <UserChip user={event.organizer} size="sm" stopPropagation={true} style={{ color: '#6b7280' }} />
        </div>

        <div className="flex items-center gap-2">
          {event.isJoined && (
            <span className="ev-badge-approved">✓ Joined</span>
          )}
          <span className="text-gray-500 text-xs">
            {event.participantCount || 0}{event.maxParticipants > 0 ? ` / ${event.maxParticipants}` : ''} joined
          </span>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
