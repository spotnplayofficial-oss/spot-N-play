import Ground from '../models/Ground.js';

export const todayStr = () => new Date().toISOString().split('T')[0];

export const addDays = (baseDateStr, days) => {
  const d = new Date(`${baseDateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const DEFAULT_HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM (06:00) to 9 PM (21:00 start, 22:00 end)

export const toTimeStr = (h) => `${String(h).padStart(2, '0')}:00`;

/**
 * Builds standard 06:00 - 22:00 hourly recurring blocks for a given sport/court across all 7 days.
 */
export const buildDefaultWeeklyBlocks = (sports = []) => {
  const blocks = [];
  const targetSports = Array.isArray(sports) && sports.length > 0 ? sports : [{ _id: null, courts: [] }];

  for (let dow = 0; dow <= 6; dow++) {
    for (const sport of targetSports) {
      const activeCourts = Array.isArray(sport.courts) ? sport.courts.filter((c) => c.isActive) : [];
      if (sport.bookingMode === 'specific' && activeCourts.length > 0) {
        for (const court of activeCourts) {
          for (const h of DEFAULT_HOURS) {
            blocks.push({
              dayOfWeek: dow,
              startTime: toTimeStr(h),
              endTime: toTimeStr(h + 1),
              sportId: sport._id || null,
              courtId: court._id || null,
              capacity: 1,
              isActive: true,
            });
          }
        }
      } else {
        const capacity = activeCourts.length > 0 ? activeCourts.length : (sport.capacityPerSlot || 1);
        for (const h of DEFAULT_HOURS) {
          blocks.push({
            dayOfWeek: dow,
            startTime: toTimeStr(h),
            endTime: toTimeStr(h + 1),
            sportId: sport._id || null,
            courtId: null,
            capacity: capacity || 1,
            isActive: true,
          });
        }
      }
    }
  }
  return blocks;
};

/**
 * Ensures a ground's weeklySchedule has standard blocks if empty.
 */
export const ensureWeeklySchedule = (ground) => {
  if (ground.venueType === 'pool') return false; // Pools use PoolConfig

  if (!Array.isArray(ground.weeklySchedule) || ground.weeklySchedule.length === 0) {
    ground.weeklySchedule = buildDefaultWeeklyBlocks(ground.sports);
    return true;
  }
  return false;
};

/**
 * Synchronizes rolling automated slots for the next `daysAhead` days.
 * Preserves all booked slots and date overrides.
 * Automatically repeats weekly blocks indefinitely until/unless the owner changes them.
 */
export const syncGroundAutomatedSlots = (ground, daysAhead = 14) => {
  if (!ground || ground.venueType === 'pool') return false;

  const today = todayStr();
  let modified = false;

  // 1. Prune past unbooked slots (keep booked slots for historical record)
  if (Array.isArray(ground.slots)) {
    const beforeCount = ground.slots.length;
    ground.slots = ground.slots.filter((s) => s.isBooked || (s.bookedCount || 0) > 0 || s.date >= today);
    if (ground.slots.length !== beforeCount) modified = true;
  } else {
    ground.slots = [];
    modified = true;
  }

  // 2. Ensure weeklySchedule template is initialized
  if (ensureWeeklySchedule(ground)) {
    modified = true;
  }

  const overrideSet = new Set(ground.overrideDates || []);

  // Map existing slots for quick lookup: `${date}_${sportId}_${courtId}_${startTime}`
  const existingMap = new Set();
  for (const s of ground.slots) {
    const key = `${s.date}_${String(s.sportId || '')}_${String(s.courtId || '')}_${s.startTime}`;
    existingMap.add(key);
  }

  // 3. Roll forward across `daysAhead` days
  const newSlots = [];
  for (let i = 0; i < daysAhead; i++) {
    const dateStr = addDays(today, i);
    // If the venue owner set a custom override for this date, do NOT auto-generate from weekly template
    if (overrideSet.has(dateStr)) continue;

    const dow = new Date(`${dateStr}T00:00:00`).getDay();
    const dayBlocks = ground.weeklySchedule.filter((b) => b.dayOfWeek === dow && b.isActive !== false);

    for (const block of dayBlocks) {
      const key = `${dateStr}_${String(block.sportId || '')}_${String(block.courtId || '')}_${block.startTime}`;
      if (!existingMap.has(key)) {
        newSlots.push({
          sportId: block.sportId || ground.sports?.[0]?._id,
          courtId: block.courtId || null,
          date: dateStr,
          startTime: block.startTime,
          endTime: block.endTime,
          capacity: block.capacity || 1,
          bookedCount: 0,
          bookedBy: [],
          isBooked: false,
        });
        existingMap.add(key);
      }
    }
  }

  if (newSlots.length > 0) {
    ground.slots.push(...newSlots);
    modified = true;
  }

  return modified;
};

/**
 * Toggles an hour slot in the weekly recurring template for a specific weekday (or 'all' days).
 * Automatically updates future unbooked slots for matching days of the week.
 */
export const toggleWeeklyBlock = async (ground, { dayOfWeek, startTime, endTime, sportId, courtId, applyToAllDays = false }) => {
  ensureWeeklySchedule(ground);
  const isAll = applyToAllDays || dayOfWeek === 'all';
  const targetDays = isAll ? [0, 1, 2, 3, 4, 5, 6] : [Number(dayOfWeek)];
  const today = todayStr();
  const overrideSet = new Set(ground.overrideDates || []);

  const hasBlockInDay = (dow) =>
    ground.weeklySchedule.some(
      (b) =>
        b.dayOfWeek === dow &&
        b.startTime === startTime &&
        String(b.sportId || '') === String(sportId || '') &&
        String(b.courtId || '') === String(courtId || '')
    );

  // If toggling all days: if any day is open, turn OFF for all days; if all are closed, turn ON for all days
  const shouldTurnOff = isAll
    ? targetDays.some((dow) => hasBlockInDay(dow))
    : hasBlockInDay(targetDays[0]);

  for (const dow of targetDays) {
    const existingIndex = ground.weeklySchedule.findIndex(
      (b) =>
        b.dayOfWeek === dow &&
        b.startTime === startTime &&
        String(b.sportId || '') === String(sportId || '') &&
        String(b.courtId || '') === String(courtId || '')
    );

    if (shouldTurnOff) {
      if (existingIndex >= 0) {
        ground.weeklySchedule.splice(existingIndex, 1);
        ground.slots = ground.slots.filter((s) => {
          if (s.isBooked || (s.bookedCount || 0) > 0) return true;
          if (s.date < today) return true;
          if (overrideSet.has(s.date)) return true;
          const sDow = new Date(`${s.date}T00:00:00`).getDay();
          const matchesBlock =
            sDow === dow &&
            s.startTime === startTime &&
            String(s.sportId || '') === String(sportId || '') &&
            String(s.courtId || '') === String(courtId || '');
          return !matchesBlock;
        });
      }
    } else {
      if (existingIndex < 0) {
        const blockCapacity = 1;
        ground.weeklySchedule.push({
          dayOfWeek: dow,
          startTime,
          endTime,
          sportId: sportId || null,
          courtId: courtId || null,
          capacity: blockCapacity,
          isActive: true,
        });

        for (let i = 0; i < 14; i++) {
          const dateStr = addDays(today, i);
          if (overrideSet.has(dateStr)) continue;
          const sDow = new Date(`${dateStr}T00:00:00`).getDay();
          if (sDow === dow) {
            const already = ground.slots.some(
              (s) =>
                s.date === dateStr &&
                s.startTime === startTime &&
                String(s.sportId || '') === String(sportId || '') &&
                String(s.courtId || '') === String(courtId || '')
            );
            if (!already) {
              ground.slots.push({
                sportId: sportId || ground.sports?.[0]?._id,
                courtId: courtId || null,
                date: dateStr,
                startTime,
                endTime,
                capacity: blockCapacity,
                bookedCount: 0,
                bookedBy: [],
                isBooked: false,
              });
            }
          }
        }
      }
    }
  }

  await ground.save();
  return {
    weeklySchedule: ground.weeklySchedule,
    slots: ground.slots,
    overrideDates: ground.overrideDates,
  };
};

export const startOverrideDate = async (ground, dateStr) => {
  if (!ground.overrideDates) ground.overrideDates = [];
  if (!ground.overrideDates.includes(dateStr)) {
    ground.overrideDates.push(dateStr);
  }
  // Ensure slots exist for this date
  const dow = new Date(`${dateStr}T00:00:00`).getDay();
  const dayBlocks = (ground.weeklySchedule || []).filter((b) => b.dayOfWeek === dow && b.isActive !== false);

  for (const block of dayBlocks) {
    const already = ground.slots.some(
      (s) =>
        s.date === dateStr &&
        s.startTime === block.startTime &&
        String(s.sportId || '') === String(block.sportId || '') &&
        String(s.courtId || '') === String(block.courtId || '')
    );
    if (!already) {
      ground.slots.push({
        sportId: block.sportId || ground.sports?.[0]?._id,
        courtId: block.courtId || null,
        date: dateStr,
        startTime: block.startTime,
        endTime: block.endTime,
        capacity: block.capacity || 1,
        bookedCount: 0,
        bookedBy: [],
        isBooked: false,
      });
    }
  }

  await ground.save();
  return ground;
};

/**
 * Reverts a date override back to the automated weekly schedule.
 */
export const revertOverrideDate = async (ground, dateStr) => {
  if (Array.isArray(ground.overrideDates)) {
    ground.overrideDates = ground.overrideDates.filter((d) => d !== dateStr);
  }

  // Remove unbooked slots for this date and re-sync from weekly schedule
  ground.slots = ground.slots.filter((s) => s.isBooked || (s.bookedCount || 0) > 0 || s.date !== dateStr);
  syncGroundAutomatedSlots(ground, 14);

  await ground.save();
  return ground;
};

