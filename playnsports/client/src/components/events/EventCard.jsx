import { Calendar, Clock, MapPin, Users, Layers, CircleCheck, Trophy } from 'lucide-react';
import { sportLabel, formatEventDate, formatEventTime } from './eventConstants.js';
import EventBanner from './EventBanner.jsx';

const EventCard = ({ event, animDelay = 0, onView }) => {
  const isFree = event.eventType !== 'paid';
  const hasSubEvents = event.subEvents?.length > 0;

  return (
    <div
      className="g-card g-cardIn"
      style={{ animationDelay: `${animDelay}s`, cursor: 'pointer' }}
      onClick={() => onView(event)}
    >
      <EventBanner src={event.image} alt={event.title} aspect="16 / 8" className="mb-3" icon={Trophy} />

      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-gray-900 dark:text-white font-semibold text-sm truncate">{event.title}</p>
          <p className="text-gray-500 text-xs">{sportLabel(event.sport)}</p>
        </div>
        {hasSubEvents ? (
          <span className="ev-sport-chip" style={{ flexShrink: 0 }}><Layers size={12} /> {event.subEvents.length} sub-events</span>
        ) : (
          <span className={isFree ? 'ev-badge-free' : 'ev-badge-paid'} style={{ flexShrink: 0 }}>
            {isFree ? 'FREE' : `₹${event.price}`}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        <span className="ev-sport-chip"><Calendar size={12} /> {formatEventDate(event.date)}</span>
        {!hasSubEvents && (
          <span className="ev-sport-chip"><Clock size={12} /> {formatEventTime(event.startTime)} – {formatEventTime(event.endTime)}</span>
        )}
      </div>

      {!hasSubEvents && (
        <p className="text-gray-500 text-xs mb-2 flex items-center gap-1.5">
          <MapPin size={13} className="flex-shrink-0" /> <span className="truncate">{event.venue}</span>
        </p>
      )}

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
            <span className="ev-badge-approved"><CircleCheck size={12} /> Joined</span>
          )}
          {!hasSubEvents && (
            <span className="text-gray-500 text-xs flex items-center gap-1">
              <Users size={13} /> {event.participantCount || 0}{event.maxParticipants > 0 ? ` / ${event.maxParticipants}` : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCard;
