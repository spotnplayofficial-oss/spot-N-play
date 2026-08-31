import { useState } from 'react';
import API from '../../api/axios';
import { ESPORTS_FORMATS, ESPORTS_GAMES, ESPORTS_PLATFORMS } from './eventConstants.js';

export const emptySubEvent = () => ({
  _key: Math.random().toString(36).slice(2), // client-only key for list rendering
  title: '',
  description: '',
  image: '',
  gameTitle: '',
  platform: '',
  matchFormat: '',
  prizePool: '',
  streamUrl: '',
  eventType: 'free',
  price: '',
  venue: '',
  date: '',
  startTime: '',
  endTime: '',
  capacity: '',
  maxTicketsPerBooking: '1',
  registrationType: 'individual',
  teamSize: '',
});

// Strips the client-only fields (_key, existing _id if the caller wants a
// clean payload) — kept simple since the server also re-validates/re-shapes
// everything on save.
export const serializeSubEvents = (subEvents) =>
  subEvents.map(({ _key, ...rest }) => rest);

// One collapsible card for a single sub-event's fields. Reused by both
// "Create Event" and "Edit Event" so the two flows never drift apart.
const SubEventCard = ({ subEvent, index, onChange, onRemove, flash }) => {
  const [uploading, setUploading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const set = (field, value) => onChange({ ...subEvent, [field]: value });

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await API.post('/upload/event', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set('image', data.fileUrl);
    } catch (err) {
      flash(err.response?.data?.message || 'Image upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="sev-card">
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-2 text-left"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          <span style={{ fontSize: 11 }}>{collapsed ? '▶' : '▼'}</span>
          <span className="font-semibold text-sm text-white">
            {subEvent.title ? subEvent.title : `Sub-Event ${index + 1}`}
          </span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-400 hover:text-red-300 text-xs font-semibold"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ✕ Remove
        </button>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="g-label">Sub-Event Title *</label>
            <input value={subEvent.title} onChange={(e) => set('title', e.target.value)} className="g-input" placeholder="e.g. Under-16 Football" required />
          </div>

          <div>
            <label className="g-label">Key Details / Description</label>
            <textarea value={subEvent.description} onChange={(e) => set('description', e.target.value)} className="g-input" rows={2} placeholder="Rules, format, what to bring…" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="g-label">Game</label>
              <select value={subEvent.gameTitle || ''} onChange={(e) => set('gameTitle', e.target.value)} className="g-input">
                <option value="">Same as event</option>
                {ESPORTS_GAMES.map((game) => <option key={game} value={game}>{game}</option>)}
              </select>
            </div>
            <div>
              <label className="g-label">Platform</label>
              <select value={subEvent.platform || ''} onChange={(e) => set('platform', e.target.value)} className="g-input">
                <option value="">Same as event</option>
                {ESPORTS_PLATFORMS.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
              </select>
            </div>
            <div>
              <label className="g-label">Format</label>
              <select value={subEvent.matchFormat || ''} onChange={(e) => set('matchFormat', e.target.value)} className="g-input">
                <option value="">Same as event</option>
                {ESPORTS_FORMATS.map((format) => <option key={format} value={format}>{format}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="g-label">Prize Pool (₹, optional)</label>
              <input type="number" min="0" value={subEvent.prizePool} onChange={(e) => set('prizePool', e.target.value)} className="g-input" placeholder="e.g. 3000" />
            </div>
            <div>
              <label className="g-label">Stream Link (optional)</label>
              <input value={subEvent.streamUrl} onChange={(e) => set('streamUrl', e.target.value)} className="g-input" placeholder="e.g. https://twitch.tv/lobby" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="g-label">Type *</label>
              <select value={subEvent.eventType} onChange={(e) => set('eventType', e.target.value)} className="g-input">
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            {subEvent.eventType === 'paid' && (
              <div>
                <label className="g-label">Price per ticket (₹) *</label>
                <input type="number" min="1" value={subEvent.price} onChange={(e) => set('price', e.target.value)} className="g-input" placeholder="e.g. 150" required />
              </div>
            )}
          </div>

          <div>
            <label className="g-label">Venue *</label>
            <input value={subEvent.venue} onChange={(e) => set('venue', e.target.value)} className="g-input" placeholder="e.g. Court 2, Green Park Turf" required />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="g-label">Date *</label>
              <input type="date" value={subEvent.date} onChange={(e) => set('date', e.target.value)} className="g-input" required />
            </div>
            <div>
              <label className="g-label">Start Time *</label>
              <input type="time" value={subEvent.startTime} onChange={(e) => set('startTime', e.target.value)} className="g-input" required />
            </div>
            <div>
              <label className="g-label">End Time *</label>
              <input type="time" value={subEvent.endTime} onChange={(e) => set('endTime', e.target.value)} className="g-input" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="g-label">Total Capacity</label>
              <input type="number" min="0" value={subEvent.capacity} onChange={(e) => set('capacity', e.target.value)} className="g-input" placeholder="0 = unlimited (teams if Team mode)" />
            </div>
            {subEvent.registrationType !== 'team' && (
              <div>
                <label className="g-label">Max Tickets per Player *</label>
                <input type="number" min="1" value={subEvent.maxTicketsPerBooking} onChange={(e) => set('maxTicketsPerBooking', e.target.value)} className="g-input" placeholder="e.g. 5" required />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="g-label">Registration Type</label>
              <select value={subEvent.registrationType || 'individual'} onChange={(e) => set('registrationType', e.target.value)} className="g-input">
                <option value="individual">Individual</option>
                <option value="team">Team</option>
              </select>
            </div>
            {subEvent.registrationType === 'team' && (
              <div>
                <label className="g-label">Team Size * (incl. captain)</label>
                <input type="number" min="2" value={subEvent.teamSize} onChange={(e) => set('teamSize', e.target.value)} className="g-input" placeholder="e.g. 5" required />
              </div>
            )}
          </div>

          <div>
            <label className="g-label">Sub-Event Banner (optional — falls back to the event's banner)</label>
            {subEvent.image && <img src={subEvent.image} alt="Sub-event banner preview" className="ev-banner mb-2" style={{ height: 100 }} />}
            <input type="file" accept="image/*" onChange={handleImageChange} className="g-input" disabled={uploading} />
            {uploading && <p className="text-gray-500 text-xs mt-1">Uploading…</p>}
          </div>
        </div>
      )}
    </div>
  );
};

// The full builder: a list of SubEventCards + an "Add Sub-Event" button.
const SubEventFields = ({ subEvents, onChangeAll, flash }) => {
  const updateAt = (i, next) => {
    const copy = [...subEvents];
    copy[i] = next;
    onChangeAll(copy);
  };
  const removeAt = (i) => {
    onChangeAll(subEvents.filter((_, idx) => idx !== i));
  };
  const add = () => onChangeAll([...subEvents, emptySubEvent()]);

  return (
    <div className="flex flex-col gap-3">
      {subEvents.map((se, i) => (
        <SubEventCard
          key={se._key || se._id || i}
          subEvent={se}
          index={i}
          onChange={(next) => updateAt(i, next)}
          onRemove={() => removeAt(i)}
          flash={flash}
        />
      ))}
      <button type="button" onClick={add} className="g-btn-secondary" style={{ padding: '10px 16px', fontSize: 13 }}>
        ➕ Add Sub-Event
      </button>
      {subEvents.length === 0 && (
        <p className="text-gray-500 text-xs">No sub-events added — this will be a simple single-session event.</p>
      )}
    </div>
  );
};

export default SubEventFields;
