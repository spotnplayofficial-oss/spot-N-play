import { useState } from 'react';
import API from '../../api/axios';
import { SPORTS, sportLabel } from './eventConstants.js';
import SubEventFields, { emptySubEvent, serializeSubEvents } from './SubEventFields.jsx';

const EditEventModal = ({ event, onClose, onUpdated, flash }) => {
  const initialHasSubEvents = event.subEvents?.length > 0;

  const [form, setForm] = useState({
    title: event.title,
    sport: event.sport,
    description: event.description || '',
    eventType: event.eventType,
    price: event.price || '',
    contactName: event.contactName || '',
    contactNumber: event.contactNumber || '',
    venue: event.venue,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    maxParticipants: event.maxParticipants || '',
    image: event.image || '',
  });
  const [hasSubEvents, setHasSubEvents] = useState(initialHasSubEvents);
  const [subEvents, setSubEvents] = useState(
    (event.subEvents || []).map((se) => ({
      ...se,
      price: se.price || '',
      capacity: se.capacity || '',
      maxTicketsPerBooking: se.maxTicketsPerBooking || '1',
    }))
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

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
    } else {
      if (!form.venue || !form.date || !form.startTime || !form.endTime) {
        flash('Please fill all required fields', 'error');
        return;
      }
      if (form.eventType === 'paid' && (!form.price || Number(form.price) <= 0)) {
        flash('Please add a valid price for a paid event', 'error');
        return;
      }
    }

    setSaving(true);
    try {
      await API.put(`/events/${event._id}`, {
        ...form,
        price: form.eventType === 'paid' ? Number(form.price) : 0,
        maxParticipants: Number(form.maxParticipants) || 0,
        subEvents: hasSubEvents ? serializeSubEvents(subEvents) : [],
      });
      flash('Event updated ✅');
      onUpdated();
      onClose();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to update event', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="g-overlay g-overlayIn" onClick={onClose}>
      <div className="g-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h3 className="font-bebas text-2xl tracking-wide text-white">Edit Event</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex flex-col gap-4" style={{ flex: 1 }}>
          <div>
            <label className="g-label">Event Title *</label>
            <input name="title" value={form.title} onChange={handleChange} className="g-input" required />
          </div>

          <div>
            <label className="g-label">Sport *</label>
            <select name="sport" value={form.sport} onChange={handleChange} className="g-input">
              {SPORTS.map((s) => (
                <option key={s} value={s}>{sportLabel(s)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="g-label">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} className="g-input" rows={3} />
          </div>

          <div>
            <label className="g-label">Event Banner</label>
            {form.image && <img src={form.image} alt="Event banner preview" className="ev-banner mb-2" />}
            <input type="file" accept="image/*" onChange={handleImageChange} className="g-input" disabled={uploading} />
            {uploading && <p className="text-gray-500 text-xs mt-1">Uploading…</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="g-label">Contact Name</label>
              <input name="contactName" value={form.contactName} onChange={handleChange} className="g-input" />
            </div>
            <div>
              <label className="g-label">Contact Number *</label>
              <input name="contactNumber" value={form.contactNumber} onChange={handleChange} className="g-input" required />
            </div>
          </div>

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
                <p className="text-gray-500 text-xs">Each sub-event gets its own venue, time, price and capacity.</p>
              </div>
            </label>
          </div>

          {hasSubEvents ? (
            <div>
              <p className="g-label" style={{ marginBottom: 10 }}>Sub-Events</p>
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
                    <input type="number" min="1" name="price" value={form.price} onChange={handleChange} className="g-input" required />
                  </div>
                )}
              </div>

              <div>
                <label className="g-label">Venue / Location *</label>
                <input name="venue" value={form.venue} onChange={handleChange} className="g-input" required />
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
        </form>

        <div className="p-5 border-t border-white/5 flex gap-3">
          <button onClick={onClose} className="g-btn-secondary" style={{ flex: 1 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving || uploading} className="g-btn-primary" style={{ flex: 1 }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditEventModal;
