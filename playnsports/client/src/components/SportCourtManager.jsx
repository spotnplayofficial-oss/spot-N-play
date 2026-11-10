import { useState, useEffect, useMemo } from 'react';
import API from '../api/axios';
import SearchableSportSelect from './SearchableSportSelect';

// Full 24-hour scheduler (00:00 to 24:00) with swimming pool model custom slots:
// - 24hr automated schedule option (all day & night, standard 6am-10pm, late night 6pm-6am, or custom range)
// - Swimming pool model: venue owner can add arbitrary custom start/end time slots, custom capacity, and delete slots
// - Recurring weekly template repeats indefinitely; date overrides for date-specific exceptions

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i); // 0 (00:00) to 23 (23:00)
const DAYS_AHEAD = 14;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const useLocalStyles = () => {
  useEffect(() => {
    if (document.getElementById('scm-styles')) return;
    const style = document.createElement('style');
    style.id = 'scm-styles';
    style.textContent = `
      .scm .glass-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(0,0,0,0.06); border-radius: 24px; padding: 24px; }
      html.dark .scm .glass-card { border-color: rgba(255,255,255,0.06); }
      .scm .tab-btn { padding: 8px 16px; border-radius: 12px; font-size: 12px; font-weight: 600; transition: all .2s ease; white-space: nowrap; cursor: pointer; }
      .scm .tab-active { background: rgba(74,222,128,0.12); color: #4ade80; border: 1px solid rgba(74,222,128,0.25); }
      .scm .tab-inactive { background: transparent; color: #6b7280; border: 1px solid rgba(107,114,128,0.2); }
      .scm .tab-inactive:hover { color: #9ca3af; }
      .scm .input-field { width: 100%; background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 10px 12px; color: inherit; font-size: 13px; outline: none; }
      html.dark .scm .input-field { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); }
      .scm .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 5px; display: block; }
      .scm .btn-primary { background: linear-gradient(135deg,#4ade80,#22c55e); color: #052e12; font-weight: 700; border-radius: 12px; padding: 10px 20px; font-size: 13px; cursor: pointer; }
      .scm .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
      .scm .btn-secondary { background: rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.1); color: #6b7280; font-weight: 500; border-radius: 12px; padding: 8px 16px; font-size: 12px; cursor: pointer; }
      html.dark .scm .btn-secondary { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); color: #9ca3af; }
      .scm .btn-danger { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #ef4444; font-weight: 600; border-radius: 12px; padding: 8px 16px; font-size: 12px; cursor: pointer; }
      .scm .slot-pill { min-height: 48px; }
      .scm .slot-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 14px; border-radius: 14px; border: 1px solid rgba(0,0,0,0.08); background: rgba(0,0,0,0.02); }
      html.dark .scm .slot-row { border-color: rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); }
    `;
    document.head.appendChild(style);
  }, []);
};

const toTimeStr = (h) => `${String(h % 24).padStart(2, '0')}:00`;

const fmt = (h) => {
  if (h === 0 || h === 24) return '12:00 AM';
  if (h === 12) return '12:00 PM';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${ampm}`;
};

const getDates = () => {
  const dates = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

const dayLabel = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

const SportCourtManager = ({ ground, onRefresh, showMessage }) => {
  useLocalStyles();
  const [activeSportId, setActiveSportId] = useState(ground?.sports?.[0]?._id || null);
  const [showAddSport, setShowAddSport] = useState(false);
  const [savingSport, setSavingSport] = useState(false);
  const [newSport, setNewSport] = useState({
    name: 'badminton',
    pricePerHour: '',
    slotDurationMinutes: 60,
    bookingMode: 'auto',
    capacityPerSlot: '',
  });
  const [newCourtName, setNewCourtName] = useState('');

  // Schedular Mode: 'weekly' (automated recurring template) or 'override' (date-specific exceptions)
  const [slotMode, setSlotMode] = useState('weekly');
  const [selectedDay, setSelectedDay] = useState('all'); // 'all', or 0..6
  const [selectedDate, setSelectedDate] = useState(getDates()[0]);
  const [selectedCourtIds, setSelectedCourtIds] = useState([]);
  const [saving, setSaving] = useState(null);
  const [busyAction, setBusyAction] = useState(false);

  // 24-Hour filter view: 'all' | 'night' (0..5) | 'morning' (6..11) | 'afternoon' (12..16) | 'evening' (17..23)
  const [hourFilter, setHourFilter] = useState('all');

  // Swimming Pool Model: Custom Slot Form state
  const [showCustomSlotForm, setShowCustomSlotForm] = useState(false);
  const [customSlot, setCustomSlot] = useState({
    startTime: '06:00',
    endTime: '07:00',
    capacity: '1',
    applyToAllDays: false,
  });

  // Custom Range Automator Modal/Inline state
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [rangeConfig, setRangeConfig] = useState({
    startHour: 5,
    endHour: 23,
    applyToAllDays: true,
  });

  const isPoolVenue = ground?.venueType === 'pool';

  useEffect(() => {
    if (ground?.sports?.length && !ground.sports.find((s) => s._id === activeSportId)) {
      setActiveSportId(ground.sports[0]._id);
    }
  }, [ground, activeSportId]);

  const sportDoc = ground?.sports?.find((s) => s._id === activeSportId);

  useEffect(() => {
    setSelectedCourtIds([]);
  }, [activeSportId]);

  if (!ground) return null;

  // ── Add / Remove Sports & Courts ──
  const handleAddSport = async (e) => {
    e.preventDefault();
    setSavingSport(true);
    try {
      await API.post(`/grounds/${ground._id}/sports`, {
        name: newSport.name,
        pricePerHour: isPoolVenue ? 0 : Number(newSport.pricePerHour) || 0,
        slotDurationMinutes: Number(newSport.slotDurationMinutes) || 60,
        bookingMode: newSport.bookingMode,
        capacityPerSlot: newSport.capacityPerSlot ? Number(newSport.capacityPerSlot) : null,
      });
      showMessage?.('Sport added ✅');
      setShowAddSport(false);
      setNewSport({ name: 'badminton', pricePerHour: '', slotDurationMinutes: 60, bookingMode: 'auto', capacityPerSlot: '' });
      onRefresh?.();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to add sport', 'error');
    } finally {
      setSavingSport(false);
    }
  };

  const handleRemoveSport = async (sportId) => {
    if (!confirm('Remove this sport? Its courts and unbooked slots go with it.')) return;
    try {
      await API.delete(`/grounds/${ground._id}/sports/${sportId}`);
      showMessage?.('Sport removed');
      onRefresh?.();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to remove sport', 'error');
    }
  };

  const handleToggleMode = async (mode) => {
    if (!sportDoc) return;
    try {
      await API.put(`/grounds/${ground._id}/sports/${sportDoc._id}`, { bookingMode: mode });
      showMessage?.(`Booking mode set to "${mode === 'specific' ? 'player picks court' : 'auto-assign'}" ✅`);
      onRefresh?.();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to update', 'error');
    }
  };

  const handleAddCourt = async (e) => {
    e.preventDefault();
    if (!newCourtName.trim() || !sportDoc) return;
    try {
      await API.post(`/grounds/${ground._id}/sports/${sportDoc._id}/courts`, { name: newCourtName.trim() });
      showMessage?.('Court added ✅');
      setNewCourtName('');
      onRefresh?.();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to add court', 'error');
    }
  };

  const handleRemoveCourt = async (courtId) => {
    if (!confirm('Remove this court?')) return;
    try {
      await API.delete(`/grounds/${ground._id}/sports/${sportDoc._id}/courts/${courtId}`);
      showMessage?.('Court removed');
      onRefresh?.();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to remove court', 'error');
    }
  };

  const toggleCourtActive = async (court) => {
    try {
      await API.put(`/grounds/${ground._id}/sports/${sportDoc._id}/courts/${court._id}`, { isActive: !court.isActive });
      onRefresh?.();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to update court', 'error');
    }
  };

  // ── Weekly Automated Schedule Calculations ──
  const weeklySchedule = ground.weeklySchedule || [];

  // Active blocks for selected day
  const currentDayBlocks = useMemo(() => {
    if (selectedDay === 'all') {
      // deduplicate by startTime + endTime + sportId
      const map = new Map();
      weeklySchedule.forEach((b) => {
        if (String(b.sportId || '') === String(activeSportId || '') || !b.sportId) {
          const key = `${b.startTime}_${b.endTime}_${String(b.courtId || '')}`;
          if (!map.has(key)) map.set(key, b);
        }
      });
      return Array.from(map.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    const dow = Number(selectedDay);
    return weeklySchedule
      .filter((b) => b.dayOfWeek === dow && (String(b.sportId || '') === String(activeSportId || '') || !b.sportId))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [weeklySchedule, selectedDay, activeSportId]);

  // Check state of an hour in the weekly schedule
  const getWeeklyHourState = (hour) => {
    const time = toTimeStr(hour);
    if (selectedDay === 'all') {
      const activeCount = [0, 1, 2, 3, 4, 5, 6].filter((dow) =>
        weeklySchedule.some(
          (b) =>
            b.dayOfWeek === dow &&
            b.startTime === time &&
            b.isActive !== false &&
            (String(b.sportId || '') === String(activeSportId || '') || !b.sportId)
        )
      ).length;
      if (activeCount === 7) return 'open';
      if (activeCount > 0) return 'partial';
      return 'closed';
    }
    const dow = Number(selectedDay);
    const active = weeklySchedule.some(
      (b) =>
        b.dayOfWeek === dow &&
        b.startTime === time &&
        b.isActive !== false &&
        (String(b.sportId || '') === String(activeSportId || '') || !b.sportId)
    );
    return active ? 'open' : 'closed';
  };

  // Filtered hours based on hourFilter tab
  const visibleHours = useMemo(() => {
    if (hourFilter === 'night') return ALL_HOURS.filter((h) => h < 6);
    if (hourFilter === 'morning') return ALL_HOURS.filter((h) => h >= 6 && h < 12);
    if (hourFilter === 'afternoon') return ALL_HOURS.filter((h) => h >= 12 && h < 17);
    if (hourFilter === 'evening') return ALL_HOURS.filter((h) => h >= 17);
    return ALL_HOURS;
  }, [hourFilter]);

  // Toggle hour in Weekly Schedule
  const handleToggleWeeklyHour = async (hour) => {
    setSaving(hour);
    try {
      await API.post(`/grounds/${ground._id}/schedule/weekly/toggle`, {
        dayOfWeek: selectedDay,
        startTime: toTimeStr(hour),
        endTime: toTimeStr(hour + 1),
        sportId: activeSportId,
        applyToAllDays: selectedDay === 'all',
      });
      showMessage?.(`Slot ${fmt(hour)} toggled 🔁`);
      onRefresh?.();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to update schedule', 'error');
    } finally {
      setSaving(null);
    }
  };

  // ── Automated Presets (24 Hours, Standard, Night, Custom Range) ──
  const handleApplyPreset = async (preset) => {
    const presetNames = {
      '24hours': '24 Hours (Full Day & Night: 00:00 – 24:00)',
      standard: 'Standard Daytime (6:00 AM – 10:00 PM)',
      night: 'Late Night Owl (6:00 PM – 6:00 AM)',
    };
    if (!confirm(`Apply ${presetNames[preset] || preset} for ${selectedDay === 'all' ? 'all 7 days' : DAY_FULL_NAMES[Number(selectedDay)]}? Future unbooked slots will update automatically.`)) return;

    setBusyAction(true);
    try {
      await API.post(`/grounds/${ground._id}/schedule/set-preset`, {
        preset,
        applyToAllDays: selectedDay === 'all',
        dayOfWeek: selectedDay,
        sportId: activeSportId,
      });
      showMessage?.(`Automated ${presetNames[preset] || preset} schedule activated! 🔁`);
      onRefresh?.();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to apply preset', 'error');
    } finally {
      setBusyAction(false);
    }
  };

  // Custom range automator
  const handleApplyCustomRange = async (e) => {
    e.preventDefault();
    setBusyAction(true);
    try {
      await API.post(`/grounds/${ground._id}/schedule/set-preset`, {
        preset: 'custom',
        startHour: rangeConfig.startHour,
        endHour: rangeConfig.endHour,
        applyToAllDays: rangeConfig.applyToAllDays || selectedDay === 'all',
        dayOfWeek: selectedDay,
        sportId: activeSportId,
      });
      showMessage?.(`Custom range ${fmt(rangeConfig.startHour)} – ${fmt(rangeConfig.endHour)} automated! 🔁`);
      setShowRangeModal(false);
      onRefresh?.();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to apply custom range', 'error');
    } finally {
      setBusyAction(false);
    }
  };

  // Clear day (mark closed)
  const handleClearDay = async () => {
    const targetLabel = selectedDay === 'all' ? 'All Days' : DAY_FULL_NAMES[Number(selectedDay)];
    if (!confirm(`Clear all slots for ${targetLabel}? The ground will be marked closed on ${targetLabel}.`)) return;

    setBusyAction(true);
    try {
      await API.post(`/grounds/${ground._id}/schedule/weekly/clear-day`, {
        dayOfWeek: selectedDay,
      });
      showMessage?.(`Schedule cleared for ${targetLabel} (Marked Closed)`);
      onRefresh?.();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to clear day', 'error');
    } finally {
      setBusyAction(false);
    }
  };

  // ── Swimming Pool Model: Add Custom Slot ──
  const handleAddCustomSlot = async (e) => {
    e.preventDefault();
    if (!customSlot.startTime || !customSlot.endTime) {
      return showMessage?.('Please select start and end time', 'error');
    }
    setBusyAction(true);
    try {
      if (slotMode === 'override') {
        // Add slot to specific override date
        await API.post(`/grounds/${ground._id}/slots`, {
          sportId: sportDoc?._id,
          courtIds: sportDoc?.bookingMode === 'specific' ? selectedCourtIds : undefined,
          slots: [
            {
              date: selectedDate,
              startTime: customSlot.startTime,
              endTime: customSlot.endTime,
              capacity: Number(customSlot.capacity) || 1,
            },
          ],
        });
        showMessage?.(`Custom slot ${customSlot.startTime}–${customSlot.endTime} added for ${dayLabel(selectedDate)} ✅`);
      } else {
        // Add to weekly recurring template
        await API.post(`/grounds/${ground._id}/schedule/weekly/custom-slot`, {
          dayOfWeek: selectedDay,
          startTime: customSlot.startTime,
          endTime: customSlot.endTime,
          sportId: activeSportId,
          capacity: Number(customSlot.capacity) || 1,
          applyToAllDays: customSlot.applyToAllDays || selectedDay === 'all',
        });
        showMessage?.(`Custom slot ${customSlot.startTime}–${customSlot.endTime} added to weekly schedule! 🔁`);
      }
      setShowCustomSlotForm(false);
      onRefresh?.();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to add custom slot', 'error');
    } finally {
      setBusyAction(false);
    }
  };

  // Swimming Pool Model: Remove Slot Block
  const handleRemoveBlock = async (block) => {
    if (!confirm(`Remove slot ${block.startTime} — ${block.endTime}?`)) return;
    setBusyAction(true);
    try {
      await API.delete(`/grounds/${ground._id}/schedule/weekly/slot/${block._id}`);
      showMessage?.(`Slot ${block.startTime} — ${block.endTime} removed`);
      onRefresh?.();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to remove slot', 'error');
    } finally {
      setBusyAction(false);
    }
  };

  // ── Date Overrides (Exceptions for a calendar day) ──
  const isDateOverridden = (ground.overrideDates || []).includes(selectedDate);

  const daySlots = (ground.slots || []).filter(
    (s) => s.date === selectedDate && (String(s.sportId || '') === String(activeSportId || '') || !s.sportId)
  );

  const slotForHour = (hour) => daySlots.find((s) => parseInt(s.startTime.split(':')[0]) === hour);

  const handleStartOverride = async () => {
    setBusyAction(true);
    try {
      await API.post(`/grounds/${ground._id}/schedule/override/${selectedDate}/start`);
      showMessage?.(`Custom override started for ${dayLabel(selectedDate)} — edits now affect only this date`);
      onRefresh?.();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to start override', 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const handleRevertOverride = async () => {
    if (!confirm(`Revert ${dayLabel(selectedDate)} back to the automated recurring schedule?`)) return;
    setBusyAction(true);
    try {
      await API.post(`/grounds/${ground._id}/schedule/override/${selectedDate}/revert`);
      showMessage?.(`Reverted ${dayLabel(selectedDate)} to automated weekly schedule 🔁`);
      onRefresh?.();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to revert override', 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const handleOverrideHourClick = async (hour) => {
    if (!isDateOverridden) {
      showMessage?.('Please click "Customize this date" first to edit this day\'s schedule.', 'error');
      return;
    }
    const existing = slotForHour(hour);
    setSaving(hour);
    try {
      if (existing) {
        if (existing.bookedCount > 0) {
          setSaving(null);
          return;
        }
        await API.delete(`/grounds/${ground._id}/slots/${existing._id}`);
        showMessage?.(`Slot ${fmt(hour)} removed for ${dayLabel(selectedDate)}`);
      } else {
        await API.post(`/grounds/${ground._id}/slots`, {
          sportId: sportDoc?._id,
          courtIds: sportDoc?.bookingMode === 'specific' ? selectedCourtIds : undefined,
          slots: [{ date: selectedDate, startTime: toTimeStr(hour), endTime: toTimeStr(hour + 1) }],
        });
        showMessage?.(`Slot ${fmt(hour)} added for ${dayLabel(selectedDate)} ✅`);
      }
      onRefresh?.();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to update slot', 'error');
    } finally {
      setSaving(null);
    }
  };

  if (ground.venueMode !== 'live') {
    return (
      <div className="scm glass-card text-center py-16">
        <span className="text-5xl block mb-4">🚧</span>
        <p className="text-gray-500 text-sm font-semibold mb-1">Venue still in trial phase</p>
        <p className="text-gray-600 text-xs">Sport & slot booking opens once an admin marks this venue as live.</p>
      </div>
    );
  }

  return (
    <div className="scm flex flex-col gap-5">
      {/* Sport tabs */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bebas text-lg text-gray-900 dark:text-white tracking-wide">SPORTS AT THIS VENUE</h4>
          <button className="btn-secondary text-xs" onClick={() => setShowAddSport((v) => !v)}>
            {showAddSport ? 'Cancel' : '+ Add Sport'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-2">
          {(ground.sports || []).map((s) => (
            <button
              key={s._id}
              onClick={() => setActiveSportId(s._id)}
              className={`tab-btn ${activeSportId === s._id ? 'tab-active' : 'tab-inactive'}`}
            >
              {s.name} {s.courts?.length > 0 ? `· ${s.courts.length} courts` : ''}
            </button>
          ))}
          {(!ground.sports || ground.sports.length === 0) && (
            <p className="text-gray-500 text-xs">No sports configured yet — add one to start creating slots.</p>
          )}
        </div>

        {showAddSport && (
          <form onSubmit={handleAddSport} className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Sport</label>
                <SearchableSportSelect
                  className="input-field"
                  value={newSport.name}
                  onChange={(s) => setNewSport({ ...newSport, name: s })}
                  includeAll={false}
                  placeholder="Search sports"
                />
              </div>
              {!isPoolVenue && (
                <div>
                  <label className="label">Price / hour (₹)</label>
                  <input
                    type="number"
                    className="input-field"
                    min="0"
                    value={newSport.pricePerHour}
                    onChange={(e) => setNewSport({ ...newSport, pricePerHour: e.target.value })}
                    required
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Slot length (minutes)</label>
                <select className="input-field" value={newSport.slotDurationMinutes} onChange={(e) => setNewSport({ ...newSport, slotDurationMinutes: e.target.value })}>
                  {[30, 45, 60, 90, 120].map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </div>
              {isPoolVenue ? (
                <div>
                  <label className="label">Headcount cap per slot (blank = no cap)</label>
                  <input
                    type="number"
                    className="input-field"
                    min="1"
                    placeholder="No cap"
                    value={newSport.capacityPerSlot}
                    onChange={(e) => setNewSport({ ...newSport, capacityPerSlot: e.target.value })}
                  />
                </div>
              ) : (
                <div>
                  <label className="label">Booking mode</label>
                  <select className="input-field" value={newSport.bookingMode} onChange={(e) => setNewSport({ ...newSport, bookingMode: e.target.value })}>
                    <option value="auto">Auto-assign any court</option>
                    <option value="specific">Player picks the court</option>
                  </select>
                </div>
              )}
            </div>
            <button className="btn-primary text-sm" disabled={savingSport}>
              {savingSport ? 'Adding…' : 'Add Sport'}
            </button>
          </form>
        )}
      </div>

      {sportDoc && (
        <>
          {/* Sport settings + court management */}
          <div className="glass-card">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bebas text-lg text-gray-900 dark:text-white tracking-wide capitalize">{sportDoc.name} SETTINGS</h4>
              <button className="btn-danger text-xs" onClick={() => handleRemoveSport(sportDoc._id)}>
                Remove sport
              </button>
            </div>

            {!isPoolVenue && (
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-gray-500">Booking mode:</span>
                  <button
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${sportDoc.bookingMode === 'auto' ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-black/5 dark:bg-white/5 text-gray-500'}`}
                    onClick={() => handleToggleMode('auto')}
                  >
                    Auto-assign
                  </button>
                  <button
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${sportDoc.bookingMode === 'specific' ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-black/5 dark:bg-white/5 text-gray-500'}`}
                    onClick={() => handleToggleMode('specific')}
                  >
                    Player picks court
                  </button>
                </div>

                <label className="label">Courts ({sportDoc.courts?.length || 0})</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(sportDoc.courts || []).map((c) => (
                    <div key={c._id} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border ${c.isActive ? 'border-black/10 dark:border-white/10' : 'border-red-500/30 opacity-50'}`}>
                      <button onClick={() => toggleCourtActive(c)} title={c.isActive ? 'Active — click to disable' : 'Disabled — click to enable'}>
                        {c.isActive ? '🟢' : '⚪'}
                      </button>
                      <span>{c.name}</span>
                      <button onClick={() => handleRemoveCourt(c._id)} className="text-red-400 hover:text-red-500">
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddCourt} className="flex gap-2">
                  <input className="input-field flex-1" placeholder="e.g. Court 5" value={newCourtName} onChange={(e) => setNewCourtName(e.target.value)} />
                  <button className="btn-secondary text-xs whitespace-nowrap">+ Add Court</button>
                </form>
              </div>
            )}
          </div>

          {/* ── AUTOMATED 24-HOUR & CUSTOM SLOT SCHEDULER (SWIMMING POOL MODEL) ── */}
          <div className="glass-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bebas text-2xl text-gray-900 dark:text-white tracking-wide">
                    24-HOUR SLOT AUTOMATION & CUSTOMIZATION
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 border border-green-400/25 uppercase">
                    Swimming Pool Model
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Automated 24-hour slots and custom time slots repeat indefinitely per your convenience.
                </p>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex p-1 bg-black/10 dark:bg-white/5 rounded-xl border border-black/10 dark:border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setSlotMode('weekly')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    slotMode === 'weekly' ? 'bg-green-400 text-black shadow-md' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span>🔁 Weekly Schedule</span>
                  <span className="text-[10px] opacity-80">(Automated)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSlotMode('override')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    slotMode === 'override' ? 'bg-green-400 text-black shadow-md' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span>📅 Date Overrides</span>
                  <span className="text-[10px] opacity-80">(Exceptions)</span>
                </button>
              </div>
            </div>

            {/* ── 1-CLICK AUTOMATION PRESETS BAR ── */}
            <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 mb-4 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Automate:</span>
                <button
                  type="button"
                  disabled={busyAction}
                  onClick={() => handleApplyPreset('24hours')}
                  className="text-xs bg-green-500/15 hover:bg-green-500/25 text-green-400 font-bold px-3 py-1.5 rounded-xl border border-green-500/30 transition-all flex items-center gap-1.5"
                >
                  <span>⚡ 24 Hours (Full Day & Night)</span>
                </button>
                <button
                  type="button"
                  disabled={busyAction}
                  onClick={() => handleApplyPreset('standard')}
                  className="text-xs bg-black/10 dark:bg-white/10 hover:bg-black/20 text-gray-900 dark:text-gray-200 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 transition-all flex items-center gap-1.5"
                >
                  <span>☀️ Standard (6 AM – 10 PM)</span>
                </button>
                <button
                  type="button"
                  disabled={busyAction}
                  onClick={() => handleApplyPreset('night')}
                  className="text-xs bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 px-3 py-1.5 rounded-xl border border-purple-400/25 transition-all flex items-center gap-1.5"
                >
                  <span>🌙 Late Night (6 PM – 6 AM)</span>
                </button>
                <button
                  type="button"
                  disabled={busyAction}
                  onClick={() => setShowRangeModal((v) => !v)}
                  className="text-xs bg-black/10 dark:bg-white/10 hover:bg-black/20 text-gray-400 hover:text-white px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 transition-all"
                >
                  ⚙️ Custom Range Automator
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomSlotForm((v) => !v)}
                  className="text-xs bg-yellow-400 text-black font-bold px-3 py-1.5 rounded-xl hover:bg-yellow-300 transition-colors shadow-sm"
                >
                  {showCustomSlotForm ? '✕ Close Custom Slot' : '+ Custom Time Slot'}
                </button>
                <button
                  type="button"
                  disabled={busyAction}
                  onClick={handleClearDay}
                  className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 rounded-xl border border-red-500/20 transition-colors"
                  title="Clear all slots for this day"
                >
                  🗑️ Clear Day
                </button>
              </div>
            </div>

            {/* Custom Range Automator Dropdown / Form */}
            {showRangeModal && (
              <form onSubmit={handleApplyCustomRange} className="p-4 mb-4 rounded-xl bg-black/10 dark:bg-white/5 border border-black/10 dark:border-white/10 animate-cardIn">
                <p className="text-xs font-bold text-gray-900 dark:text-white mb-2">Automate Custom Operating Hours Range</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="label">Start Hour</label>
                    <select
                      className="input-field"
                      value={rangeConfig.startHour}
                      onChange={(e) => setRangeConfig({ ...rangeConfig, startHour: Number(e.target.value) })}
                    >
                      {ALL_HOURS.map((h) => (
                        <option key={h} value={h}>{fmt(h)} ({toTimeStr(h)})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">End Hour</label>
                    <select
                      className="input-field"
                      value={rangeConfig.endHour}
                      onChange={(e) => setRangeConfig({ ...rangeConfig, endHour: Number(e.target.value) })}
                    >
                      {ALL_HOURS.map((h) => (
                        <option key={h} value={h}>{fmt(h)} ({toTimeStr(h)})</option>
                      ))}
                      <option value={24}>12:00 AM Midnight (24:00)</option>
                    </select>
                  </div>
                  <div>
                    <button type="submit" disabled={busyAction} className="btn-primary w-full text-xs py-2.5">
                      {busyAction ? 'Automating…' : '⚡ Automate This Range'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Swimming Pool Model: Add Custom Slot Form */}
            {showCustomSlotForm && (
              <form onSubmit={handleAddCustomSlot} className="p-4 mb-4 rounded-xl bg-yellow-400/5 border border-yellow-400/20 animate-cardIn">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-yellow-500 uppercase tracking-wider">
                    Swimming Pool Model · Add Customized Slot
                  </p>
                  <span className="text-[11px] text-gray-500">
                    Target: {slotMode === 'override' ? dayLabel(selectedDate) : selectedDay === 'all' ? 'All Days' : DAY_FULL_NAMES[Number(selectedDay)]}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="label">Start Time</label>
                    <input
                      type="time"
                      className="input-field"
                      value={customSlot.startTime}
                      onChange={(e) => setCustomSlot({ ...customSlot, startTime: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">End Time</label>
                    <input
                      type="time"
                      className="input-field"
                      value={customSlot.endTime}
                      onChange={(e) => setCustomSlot({ ...customSlot, endTime: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Capacity</label>
                    <input
                      type="number"
                      min="1"
                      className="input-field"
                      value={customSlot.capacity}
                      onChange={(e) => setCustomSlot({ ...customSlot, capacity: e.target.value })}
                      placeholder="1"
                      required
                    />
                  </div>
                  <div>
                    <button type="submit" disabled={busyAction} className="btn-primary w-full text-xs py-2.5">
                      {busyAction ? 'Adding…' : '+ Add Slot'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* ── VIEW 1: RECURRING WEEKLY SCHEDULE (AUTOMATED 24-HOUR) ── */}
            {slotMode === 'weekly' && (
              <div>
                {/* Day selector */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                  {[
                    { id: 'all', label: 'All Days (Everyday)' },
                    ...DAY_NAMES.map((name, idx) => ({ id: String(idx), label: DAY_FULL_NAMES[idx] })),
                  ].map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDay(d.id)}
                      className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full border whitespace-nowrap transition-colors cursor-pointer ${
                        selectedDay === d.id
                          ? 'bg-green-400 text-black font-bold border-green-400 shadow-sm'
                          : 'border-black/10 dark:border-white/10 text-gray-500 hover:border-green-400/30'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                {/* 24-Hour Time Period Filters */}
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                    {[
                      { id: 'all', label: `All 24 Hours (${ALL_HOURS.length})` },
                      { id: 'night', label: '🌙 Late Night (12 AM–6 AM)' },
                      { id: 'morning', label: '🌅 Morning (6 AM–12 PM)' },
                      { id: 'afternoon', label: '☀️ Afternoon (12 PM–5 PM)' },
                      { id: 'evening', label: '🌆 Evening (5 PM–12 AM)' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setHourFilter(f.id)}
                        className={`px-2.5 py-1 rounded-lg border text-xs transition-colors cursor-pointer ${
                          hourFilter === f.id
                            ? 'bg-black/15 dark:bg-white/15 text-gray-900 dark:text-white font-bold border-black/20 dark:border-white/20'
                            : 'border-transparent text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <span className="text-[11px] text-gray-500">
                    Showing for: <strong className="text-gray-900 dark:text-white">{selectedDay === 'all' ? 'All Days' : DAY_FULL_NAMES[Number(selectedDay)]}</strong>
                  </span>
                </div>

                {/* 24-Hour Interactive Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2 mb-5">
                  {visibleHours.map((h) => {
                    const state = getWeeklyHourState(h);
                    const isOpen = state === 'open';
                    const isPartial = state === 'partial';
                    return (
                      <button
                        key={h}
                        disabled={saving === h}
                        onClick={() => handleToggleWeeklyHour(h)}
                        className={`slot-pill border text-xs py-2 rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                          isOpen
                            ? 'bg-green-500/15 border-green-500/40 text-green-400 font-semibold shadow-sm hover:border-green-400'
                            : isPartial
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 font-semibold shadow-sm hover:border-amber-400'
                            : 'border-black/10 dark:border-white/10 text-gray-500 hover:border-green-400/30'
                        }`}
                        title={
                          isOpen
                            ? 'Active — click to turn OFF'
                            : isPartial
                            ? 'Active for some days — click to toggle'
                            : 'Inactive — click to turn ON'
                        }
                      >
                        <span className="font-bold">{saving === h ? '…' : fmt(h)}</span>
                        <span className="text-[10px] opacity-75">
                          {isOpen ? '🟢 Open' : isPartial ? '🟡 Partial' : '⚪ Closed'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Swimming Pool Model: Configured Slots List for Selected Day */}
                <div className="pt-4 border-t border-black/10 dark:border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs uppercase tracking-wider font-bold text-gray-500">
                      Configured Slots for {selectedDay === 'all' ? 'All Days' : DAY_FULL_NAMES[Number(selectedDay)]} ({currentDayBlocks.length})
                    </p>
                    <p className="text-[11px] text-gray-400">Repeats automatically every week indefinitely</p>
                  </div>

                  {currentDayBlocks.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-black/10 dark:border-white/10 rounded-2xl">
                      <p className="text-sm text-gray-500">No slots configured for this day (Closed).</p>
                      <p className="text-xs text-gray-400 mt-1">Use the presets above or click "+ Custom Time Slot" to add slots.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-1">
                      {currentDayBlocks.map((b) => (
                        <div key={b._id} className="slot-row">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🕐</span>
                            <div>
                              <p className="text-xs font-bold text-gray-900 dark:text-white">
                                {b.startTime} — {b.endTime}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                Capacity: {b.capacity || 1} {b.courtId ? `· Court assigned` : ''}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveBlock(b)}
                            className="text-gray-400 hover:text-red-400 p-1 text-xs transition-colors cursor-pointer"
                            title="Remove this slot"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── VIEW 2: DATE-SPECIFIC OVERRIDES (EXCEPTIONS) ── */}
            {slotMode === 'override' && (
              <div>
                {/* Specific Date selector */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                  {getDates().map((d) => {
                    const isCustom = (ground.overrideDates || []).includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() => setSelectedDate(d)}
                        className={`shrink-0 text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors cursor-pointer ${
                          selectedDate === d
                            ? 'bg-green-500/20 text-green-400 border-green-500/40 font-bold'
                            : 'border-black/10 dark:border-white/10 text-gray-500 hover:border-green-400/30'
                        }`}
                      >
                        {dayLabel(d)} {isCustom && '⭐'}
                      </button>
                    );
                  })}
                </div>

                {/* Status Bar for Date */}
                <div
                  className={`p-3.5 rounded-xl border text-xs mb-4 flex items-center justify-between flex-wrap gap-2 ${
                    isDateOverridden
                      ? 'bg-amber-400/10 border-amber-400/25 text-amber-400'
                      : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{isDateOverridden ? '⚠️' : '📅'}</span>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {dayLabel(selectedDate)} ({selectedDate})
                      </p>
                      <p className="text-[11px] opacity-80">
                        {isDateOverridden
                          ? 'Custom override active — changes here affect only this date.'
                          : 'Currently following the automated recurring weekly schedule.'}
                      </p>
                    </div>
                  </div>

                  {isDateOverridden ? (
                    <button
                      type="button"
                      disabled={busyAction}
                      onClick={handleRevertOverride}
                      className="px-3 py-1.5 bg-amber-400/20 hover:bg-amber-400/30 text-amber-400 font-bold rounded-lg border border-amber-400/30 text-xs transition-colors cursor-pointer"
                    >
                      ↺ Revert to Weekly Schedule
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyAction}
                      onClick={handleStartOverride}
                      className="px-3 py-1.5 bg-black/10 dark:bg-white/10 hover:bg-black/20 text-gray-900 dark:text-white font-bold rounded-lg border border-black/15 dark:border-white/15 text-xs transition-colors cursor-pointer"
                    >
                      ✏️ Customize This Date
                    </button>
                  )}
                </div>

                {/* 24-Hour Time Period Filters */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs mb-3">
                  {[
                    { id: 'all', label: `All 24 Hours (${ALL_HOURS.length})` },
                    { id: 'night', label: '🌙 Night (12 AM–6 AM)' },
                    { id: 'morning', label: '🌅 Morning (6 AM–12 PM)' },
                    { id: 'afternoon', label: '☀️ Afternoon (12 PM–5 PM)' },
                    { id: 'evening', label: '🌆 Evening (5 PM–12 AM)' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setHourFilter(f.id)}
                      className={`px-2.5 py-1 rounded-lg border text-xs transition-colors cursor-pointer ${
                        hourFilter === f.id
                          ? 'bg-black/15 dark:bg-white/15 text-gray-900 dark:text-white font-bold border-black/20 dark:border-white/20'
                          : 'border-transparent text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Hour Grid for Specific Date */}
                <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {visibleHours.map((h) => {
                    const slot = slotForHour(h);
                    const state = !slot
                      ? 'empty'
                      : slot.bookedCount > 0
                      ? slot.bookedCount >= slot.capacity
                        ? 'full'
                        : 'partial'
                      : 'available';
                    const stateStyles = {
                      empty: 'border-black/10 dark:border-white/10 text-gray-500 hover:border-green-500/40',
                      available: 'bg-blue-500/15 border-blue-500/40 text-blue-400 font-semibold',
                      partial: 'bg-orange-500/15 border-orange-500/40 text-orange-400 font-semibold',
                      full: 'bg-red-500/15 border-red-500/40 text-red-400 cursor-not-allowed font-semibold',
                    };
                    return (
                      <button
                        key={h}
                        disabled={saving === h || (slot && slot.bookedCount > 0)}
                        onClick={() => handleOverrideHourClick(h)}
                        className={`slot-pill border text-xs py-2 rounded-xl transition-all cursor-pointer ${stateStyles[state]}`}
                        title={slot ? `Capacity ${slot.bookedCount}/${slot.capacity}` : 'Click to add'}
                      >
                        <span className="font-bold">{saving === h ? '…' : fmt(h)}</span>
                        {slot && (
                          <div className="text-[10px] opacity-75">
                            {slot.capacity > 1 ? `${slot.bookedCount}/${slot.capacity}` : '✓ Active'}
                          </div>
                        )}
                        {!slot && <div className="text-[10px] opacity-50">Closed</div>}
                      </button>
                    );
                  })}
                </div>
                <p className="text-gray-500 text-[11px] mt-3">
                  🔵 available &nbsp;·&nbsp; 🟠 partially booked &nbsp;·&nbsp; 🔴 full/booked &nbsp;·&nbsp; ⚪ closed. Click to edit.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SportCourtManager;
