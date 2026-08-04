import { useState } from 'react';
import API from '../../api/axios';
import { SPORTS, sportLabel } from './eventConstants.js';

const EditEventModal = ({ event, onClose, onUpdated, flash }) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.eventType === 'paid' && (!form.price || Number(form.price) <= 0)) {
      flash('Please add a valid price for a paid event', 'error');
      return;
    }

    setSaving(true);
    try {
      await API.put(`/events/${event._id}`, {
        ...form,
        price: form.eventType === 'paid' ? Number(form.price) : 0,
        maxParticipants: Number(form.maxParticipants) || 0,
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="g-label">Sport *</label>
              <select name="sport" value={form.sport} onChange={handleChange} className="g-input">
                {SPORTS.map((s) => (
                  <option key={s} value={s}>{sportLabel(s)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="g-label">Event Type *</label>
              <select name="eventType" value={form.eventType} onChange={handleChange} className="g-input">
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          {form.eventType === 'paid' && (
            <div>
              <label className="g-label">Entry Fee per Person (₹) *</label>
              <input type="number" min="1" name="price" value={form.price} onChange={handleChange} className="g-input" required />
            </div>
          )}

          <div>
            <label className="g-label">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} className="g-input" rows={3} />
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

          <div>
            <label className="g-label">Event Banner (optional)</label>
            {form.image && <img src={form.image} alt="Event banner preview" className="ev-banner mb-2" />}
            <input type="file" accept="image/*" onChange={handleImageChange} className="g-input" disabled={uploading} />
            {uploading && <p className="text-gray-500 text-xs mt-1">Uploading…</p>}
          </div>
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
