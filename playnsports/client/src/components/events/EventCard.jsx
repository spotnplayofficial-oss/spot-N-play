import { SPORT_EMOJI, sportLabel, formatEventDate, formatEventTime } from './eventConstants.js';

const EventCard = ({ event, animDelay = 0, onView }) => {
  const isFree = event.eventType !== 'paid';
  const hasSubEvents = event.subEvents?.length > 0;

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
        {hasSubEvents ? (
          <span className="ev-sport-chip" style={{ flexShrink: 0 }}>🗂️ {event.subEvents.length} sub-events</span>
        ) : (
          <span className={isFree ? 'ev-badge-free' : 'ev-badge-paid'} style={{ flexShrink: 0 }}>
            {isFree ? 'FREE' : `₹${event.price}`}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        <span className="ev-sport-chip">📅 {formatEventDate(event.date)}</span>
        {!hasSubEvents && (
          <span className="ev-sport-chip">⏰ {formatEventTime(event.startTime)} – {formatEventTime(event.endTime)}</span>
        )}
      </div>

      {!hasSubEvents && <p className="text-gray-500 text-xs mb-2">📍 {event.venue}</p>}

      {event.description && (
        <p className="text-gray-500 text-xs mb-3 line-clamp-2">{event.description}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {hasSubEvents && (
            <span className="text-gray-500 text-xs">
              {event.subEvents.some((se) => se.eventType === 'paid') ? 'Free & paid options' : 'All free'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {event.isJoined && (
            <span className="ev-badge-approved">✓ Joined</span>
          )}
          {!hasSubEvents && (
            <span className="text-gray-500 text-xs">
              {event.participantCount || 0}{event.maxParticipants > 0 ? ` / ${event.maxParticipants}` : ''} joined
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCard;
