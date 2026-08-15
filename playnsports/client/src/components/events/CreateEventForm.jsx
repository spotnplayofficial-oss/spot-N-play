import { useState } from 'react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { SPORTS, sportLabel } from './eventConstants.js';
import SubEventFields, { emptySubEvent, serializeSubEvents } from './SubEventFields.jsx';

const emptyForm = (user) => ({
  title: '',
  sport: 'football',
  description: '',
  eventType: 'free',
  price: '',
  contactName: user?.name || '',
  contactNumber: user?.phone || '',
  venue: '',
  date: '',
  startTime: '',
  endTime: '',
  maxParticipants: '',
  image: '',
});

const CreateEventForm = ({ onCreated, flash }) => {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm(user));
  const [hasSubEvents, setHasSubEvents] = useState(false);
  const [subEvents, setSubEvents] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

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
      setForm((prev) => ({ ...prev, image: data.fileUrl }));
    } catch (err) {
      flash(err.response?.data?.message || 'Image upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const toggleSubEvents = (checked) => {
    setHasSubEvents(checked);
    if (checked && subEvents.length === 0) {
      setSubEvents([emptySubEvent()]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title || !form.contactNumber) {
      flash('Please fill all required fields', 'error');
      return;
    }

    if (hasSubEvents) {
      if (subEvents.length === 0) {
        flash('Add at least one sub-event, or switch off "Multiple Sub-Events"', 'error');
        return;
      }
      for (const se of subEvents) {
        if (!se.title || !se.venue || !se.date || !se.startTime || !se.endTime) {
          flash('Every sub-event needs a title, venue, date and time', 'error');
          return;
        }
        if (se.eventType === 'paid' && (!se.price || Number(se.price) <= 0)) {
          flash(`Add a valid ticket price for "${se.title}"`, 'error');
          return;
        }
      }
    } else if (!form.venue || !form.date || !form.startTime || !form.endTime) {
      flash('Please fill all required fields', 'error');
      return;
    } else if (form.eventType === 'paid' && (!form.price || Number(form.price) <= 0)) {
      flash('Please add a valid price for a paid event', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await API.post('/events', {
        ...form,
        price: form.eventType === 'paid' ? Number(form.price) : 0,
        maxParticipants: Number(form.maxParticipants) || 0,
        subEvents: hasSubEvents ? serializeSubEvents(subEvents) : [],
      });
      flash('Event submitted for admin approval. It will appear on Explore once approved.');
      setForm(emptyForm(user));
      setHasSubEvents(false);
      setSubEvents([]);
      onCreated?.();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to create event', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="g-card g-cardIn flex flex-col gap-4" style={{ maxWidth: 640, margin: '0 auto' }}>
      <div>
        <h3 className="font-bebas text-2xl tracking-wide text-white mb-1">Create an Event</h3>
        <p className="text-gray-500 text-sm">Submit the details below — an admin will review and approve your event before it goes live on the Explore page.</p>
      </div>

      {/* Title */}
      <div>
        <label className="g-label">Event Title *</label>
        <input name="title" value={form.title} onChange={handleChange} className="g-input" placeholder="e.g. Sunday Sports Meet" required />
      </div>

      <div>
        <label className="g-label">Sport *</label>
        <select name="sport" value={form.sport} onChange={handleChange} className="g-input">
          {SPORTS.map((s) => (
            <option key={s} value={s}>{sportLabel(s)}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="g-label">Description</label>
        <textarea name="description" value={form.description} onChange={handleChange} className="g-input" rows={3} placeholder="What's this event about overall?" />
      </div>

      {/* Banner */}
      <div>
        <label className="g-label">Event Banner {hasSubEvents ? '(shown at the top of the event, above the sub-events list)' : '(optional)'}</label>
        {form.image && <img src={form.image} alt="Event banner preview" className="ev-banner mb-2" />}
        <input type="file" accept="image/*" onChange={handleImageChange} className="g-input" disabled={uploading} />
        {uploading && <p className="text-gray-500 text-xs mt-1">Uploading…</p>}
      </div>

      {/* Contact info — shown to players via "Contact Admin", kept for internal record */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="g-label">Contact Name</label>
          <input name="contactName" value={form.contactName} onChange={handleChange} className="g-input" placeholder="Your name" />
        </div>
        <div>
          <label className="g-label">Contact Number *</label>
          <input name="contactNumber" value={form.contactNumber} onChange={handleChange} className="g-input" placeholder="For admin reference" required />
        </div>
      </div>

      {/* Sub-events toggle */}
      <div className="sev-card">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasSubEvents}
            onChange={(e) => toggleSubEvents(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: '#4ade80' }}
          />
          <div>
            <p className="font-semibold text-sm text-white">This event has multiple sub-events</p>
            <p className="text-gray-500 text-xs">e.g. "Under-16 Football" + "Open Cricket Box League" inside one "Sports Meet" — each with its own venue, time, price and capacity.</p>
          </div>
        </label>
      </div>

      {hasSubEvents ? (
        <div>
          <p className="ed-section-title" style={{ marginBottom: 10 }}>Sub-Events</p>
          <SubEventFields subEvents={subEvents} onChangeAll={setSubEvents} flash={flash} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="g-label">Event Type *</label>
              <select name="eventType" value={form.eventType} onChange={handleChange} className="g-input">
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            {form.eventType === 'paid' && (
              <div>
                <label className="g-label">Entry Fee per Person (₹) *</label>
                <input type="number" min="1" name="price" value={form.price} onChange={handleChange} className="g-input" placeholder="e.g. 200" required />
              </div>
            )}
          </div>

          <div>
            <label className="g-label">Venue / Location *</label>
            <input name="venue" value={form.venue} onChange={handleChange} className="g-input" placeholder="e.g. Green Park Turf, Sector 21" required />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="g-label">Date *</label>
              <input type="date" name="date" value={form.date} onChange={handleChange} className="g-input" required />
            </div>
            <div>
              <label className="g-label">Start Time *</label>
              <input type="time" name="startTime" value={form.startTime} onChange={handleChange} className="g-input" required />
            </div>
            <div>
              <label className="g-label">End Time *</label>
              <input type="time" name="endTime" value={form.endTime} onChange={handleChange} className="g-input" required />
            </div>
          </div>

          <div>
            <label className="g-label">Max Participants (optional)</label>
            <input type="number" min="0" name="maxParticipants" value={form.maxParticipants} onChange={handleChange} className="g-input" placeholder="Leave empty for unlimited" />
          </div>
        </>
      )}

      <button type="submit" disabled={submitting || uploading} className="g-btn-primary mt-1">
        {submitting ? 'Submitting…' : 'Submit for Approval'}
      </button>
    </form>
  );
};

export default CreateEventForm;
