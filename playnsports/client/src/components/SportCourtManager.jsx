import { useState, useEffect } from 'react';
import API from '../api/axios';
import SearchableSportSelect from './SearchableSportSelect';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM (06:00) to 9 PM (21:00 start, 22:00 end)
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
      .scm .btn-primary { background: linear-gradient(135deg,#4ade80,#22c55e); color: #052e12; font-weight: 700; border-radius: 12px; padding: 10px 20px; font-size: 13px; }
      .scm .btn-primary:disabled { opacity: 0.6; }
      .scm .btn-secondary { background: rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.1); color: #6b7280; font-weight: 500; border-radius: 12px; padding: 8px 16px; font-size: 12px; }
      html.dark .scm .btn-secondary { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); color: #9ca3af; }
      .scm .btn-danger { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #ef4444; font-weight: 600; border-radius: 12px; padding: 8px 16px; font-size: 12px; }
      .scm .slot-pill { min-height: 46px; }
    `;
    document.head.appendChild(style);
  }, []);
};

const toTimeStr = (h) => `${String(h).padStart(2, '0')}:00`;
const fmt = (h) => {
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
  const [newSport, setNewSport] = useState({ name: 'badminton', pricePerHour: '', slotDurationMinutes: 60, bookingMode: 'auto', capacityPerSlot: '' });
  const [newCourtName, setNewCourtName] = useState('');

  // Mode: 'weekly' (automated recurring template) or 'override' (date-specific exceptions)
  const [slotMode, setSlotMode] = useState('weekly');
  const [selectedDay, setSelectedDay] = useState('all'); // 'all', or 0..6
  const [selectedDate, setSelectedDate] = useState(getDates()[0]);
  const [selectedCourtIds, setSelectedCourtIds] = useState([]);
  const [saving, setSaving] = useState(null);
  const [busyAction, setBusyAction] = useState(false);

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

  // Check if an hour is enabled in the weekly recurring template
  const isWeeklyHourActive = (hour) => {
    const time = toTimeStr(hour);
    if (selectedDay === 'all') {
      // Return true if active in at least one day
      return weeklySchedule.some(
        (b) =>
          b.startTime === time &&
          b.isActive !== false &&
          (String(b.sportId || '') === String(activeSportId || '') || !b.sportId)
      );
    }
    const dow = Number(selectedDay);
    return weeklySchedule.some(
      (b) =>
        b.dayOfWeek === dow &&
        b.startTime === time &&
        b.isActive !== false &&
        (String(b.sportId || '') === String(activeSportId || '') || !b.sportId)
    );
  };

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
      showMessage?.(`Slot ${fmt(hour)} updated in weekly schedule 🔁`);
      onRefresh?.();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to update weekly schedule', 'error');
    } finally {
      setSaving(null);
    }
  };

  // Reset to default standard operating hours (06:00 - 22:00)
  const handleResetDefaults = async () => {
    if (!confirm('Reset weekly schedule to standard 6:00 AM – 10:00 PM for all days?')) return;
    setBusyAction(true);
    try {
      await API.post(`/grounds/${ground._id}/schedule/reset-defaults`);
      showMessage?.('Weekly schedule reset to 6:00 AM – 10:00 PM (All Days) 🔁');
      onRefresh?.();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to reset schedule', 'error');
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

          {/* ── AUTOMATED SLOT SCHEDULER (SWIMMING POOL STRUCTURE) ── */}
          <div className="glass-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="font-bebas text-2xl text-gray-900 dark:text-white tracking-wide">
                  SLOT MANAGEMENT — {sportDoc.name.toUpperCase()}
                </h4>
                <p className="text-xs text-gray-500">
                  Automated time slots repeat indefinitely until or unless you customize or override them.
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

            {/* ── VIEW 1: RECURRING WEEKLY SCHEDULE (AUTOMATED) ── */}
            {slotMode === 'weekly' && (
              <div>
                {/* Information Callout */}
                <div className="p-3.5 rounded-xl bg-green-400/10 border border-green-400/20 text-xs mb-4 flex items-start justify-between flex-wrap gap-2">
                  <div className="flex items-start gap-2">
                    <span className="text-base">🔁</span>
                    <div>
                      <p className="font-bold text-green-400">Recurring Weekly Schedule is Active</p>
                      <p className="text-gray-600 dark:text-gray-400 text-[11px] mt-0.5">
                        These slots automatically repeat every week indefinitely. Clicking an hour toggles it ON/OFF for that weekday across all upcoming dates.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={handleResetDefaults}
                    className="text-xs bg-black/15 dark:bg-white/10 text-gray-900 dark:text-white hover:text-green-400 px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 transition-colors whitespace-nowrap"
                  >
                    ⚡ Reset Standard Hours (6 AM – 10 PM)
                  </button>
                </div>

                {/* Day selector */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                  {[
                    { id: 'all', label: 'All Days (Everyday)' },
                    ...DAY_NAMES.map((name, idx) => ({ id: String(idx), label: DAY_FULL_NAMES[idx] })),
                  ].map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDay(d.id)}
                      className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full border whitespace-nowrap transition-colors ${
                        selectedDay === d.id
                          ? 'bg-green-400 text-black font-bold border-green-400 shadow-sm'
                          : 'border-black/10 dark:border-white/10 text-gray-500 hover:border-green-400/30'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                {/* Hour Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {HOURS.map((h) => {
                    const active = isWeeklyHourActive(h);
                    return (
                      <button
                        key={h}
                        disabled={saving === h}
                        onClick={() => handleToggleWeeklyHour(h)}
                        className={`slot-pill border text-xs py-2 rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 ${
                          active
                            ? 'bg-green-500/15 border-green-500/40 text-green-400 font-semibold shadow-sm hover:border-green-400'
                            : 'border-black/10 dark:border-white/10 text-gray-500 hover:border-green-400/30'
                        }`}
                        title={active ? 'Active — click to turn OFF' : 'Inactive — click to turn ON'}
                      >
                        <span>{saving === h ? '…' : fmt(h)}</span>
                        <span className="text-[10px] opacity-75">{active ? '🟢 Open' : '⚪ Closed'}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-gray-500 text-[11px] mt-3">
                  🟢 Open: Included in recurring weekly slots &nbsp;·&nbsp; ⚪ Closed: Off &nbsp;·&nbsp; Click any slot to toggle.
                </p>
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
                        className={`shrink-0 text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors ${
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
                          : 'Currently using the automated recurring weekly schedule.'}
                      </p>
                    </div>
                  </div>

                  {isDateOverridden ? (
                    <button
                      type="button"
                      disabled={busyAction}
                      onClick={handleRevertOverride}
                      className="px-3 py-1.5 bg-amber-400/20 hover:bg-amber-400/30 text-amber-400 font-bold rounded-lg border border-amber-400/30 text-xs transition-colors"
                    >
                      ↺ Revert to Weekly Schedule
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyAction}
                      onClick={handleStartOverride}
                      className="px-3 py-1.5 bg-black/10 dark:bg-white/10 hover:bg-black/20 text-gray-900 dark:text-white font-bold rounded-lg border border-black/15 dark:border-white/15 text-xs transition-colors"
                    >
                      ✏️ Customize This Date
                    </button>
                  )}
                </div>

                {/* Hour Grid for Specific Date */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {HOURS.map((h) => {
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
                      available: 'bg-blue-500/15 border-blue-500/40 text-blue-400',
                      partial: 'bg-orange-500/15 border-orange-500/40 text-orange-400',
                      full: 'bg-red-500/15 border-red-500/40 text-red-400 cursor-not-allowed',
                    };
                    return (
                      <button
                        key={h}
                        disabled={saving === h || (slot && slot.bookedCount > 0)}
                        onClick={() => handleOverrideHourClick(h)}
                        className={`slot-pill border text-xs py-2 rounded-xl transition-all ${stateStyles[state]}`}
                        title={slot ? `Capacity ${slot.bookedCount}/${slot.capacity}` : 'Click to add'}
                      >
                        {saving === h ? '…' : fmt(h)}
                        {slot && slot.capacity > 1 && (
                          <div className="text-[10px] opacity-70">
                            {slot.bookedCount}/{slot.capacity}
                          </div>
                        )}
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
