import { CalendarDays, Gamepad2, MapPin, Monitor, Users, Trophy, Video } from 'lucide-react';
import { SPORT_EMOJI, eventLabel, formatEventDate, formatEventTime } from './eventConstants.js';

const EventCard = ({ event, animDelay = 0, onView }) => {
  const isFree = event.eventType !== 'paid';
  const hasSubEvents = event.subEvents?.length > 0;
  const isEsports = event.eventCategory === 'esports';

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
            {isEsports ? <Gamepad2 size={20} /> : (SPORT_EMOJI[event.sport] || '🏅')}
          </div>
          <div className="min-w-0">
            <p className="text-gray-900 dark:text-white font-semibold text-sm truncate">{event.title}</p>
            <p className="text-gray-500 text-xs">{eventLabel(event)}</p>
          </div>
        </div>
        {hasSubEvents ? (
          <span className="ev-sport-chip" style={{ flexShrink: 0 }}><Users size={12} /> {event.subEvents.length} sub-events</span>
        ) : /bgus|battle ground/i.test(event.title || '') ? (
          <span className="ev-badge-paid" style={{ flexShrink: 0, background: '#4ade80', color: '#052e12', fontWeight: 900 }}>₹39 / person</span>
        ) : (
          <span className={isFree ? 'ev-badge-free' : 'ev-badge-paid'} style={{ flexShrink: 0 }}>
            {isFree ? 'FREE' : `₹${event.price}`}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        <span className="ev-sport-chip"><CalendarDays size={12} /> {formatEventDate(event.date)}</span>
        {!hasSubEvents && (
          <span className="ev-sport-chip">{formatEventTime(event.startTime)} - {formatEventTime(event.endTime)}</span>
        )}
        {isEsports && event.platform && (
          <span className="ev-sport-chip"><Monitor size={12} /> {event.platform}</span>
        )}
        {isEsports && event.matchFormat && (
          <span className="ev-sport-chip">{event.matchFormat}</span>
        )}
        {isEsports && event.prizePool > 0 && (
          <span className="ev-sport-chip" style={{ color: '#fbbf24', borderColor: 'rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.08)' }}>
            <Trophy size={12} /> ₹{event.prizePool.toLocaleString('en-IN')} prize
          </span>
        )}
      </div>

      {!hasSubEvents && (
        <p className="text-gray-500 text-xs mb-2 flex items-center gap-1.5">
          <MapPin size={12} /> {event.venue}
          {isEsports && event.serverRegion ? ` · ${event.serverRegion}` : ''}
        </p>
      )}

      {isEsports && event.streamUrl && (
        <a
          href={event.streamUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-blue-400 text-xs mb-2 flex items-center gap-1.5 hover:text-blue-300"
          style={{ textDecoration: 'none' }}
        >
          <Video size={12} /> Watch the stream
        </a>
      )}

      {event.description && (
        <p className="text-gray-500 text-xs mb-3 line-clamp-2">{event.description}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {hasSubEvents && (
            <span className="text-gray-500 text-xs">
              {event.subEvents.some((se) => se.eventType === 'paid') ? 'Free and paid options' : 'All free'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {event.isJoined && (
            <span className="ev-badge-approved">Joined</span>
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
