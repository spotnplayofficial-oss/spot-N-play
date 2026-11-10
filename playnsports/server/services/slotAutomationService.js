import Ground from '../models/Ground.js';

export const todayStr = () => new Date().toISOString().split('T')[0];

export const addDays = (baseDateStr, days) => {
  const d = new Date(`${baseDateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const ALL_24_HOURS = Array.from({ length: 24 }, (_, i) => i); // 0 (00:00) to 23 (23:00)
export const DEFAULT_HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM (06:00) to 10 PM (22:00)
export const NIGHT_HOURS = [18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5]; // 6 PM (18:00) to 6 AM (06:00)

export const toTimeStr = (h) => `${String(h % 24).padStart(2, '0')}:00`;

/**
 * Builds automated recurring blocks from an array of start hours (0..23).
 */
export const buildWeeklyBlocksFromHours = (sports = [], hours = ALL_24_HOURS) => {
  const blocks = [];
  const targetSports = Array.isArray(sports) && sports.length > 0 ? sports : [{ _id: null, courts: [] }];

  for (let dow = 0; dow <= 6; dow++) {
    for (const sport of targetSports) {
      const activeCourts = Array.isArray(sport.courts) ? sport.courts.filter((c) => c.isActive) : [];
      if (sport.bookingMode === 'specific' && activeCourts.length > 0) {
        for (const court of activeCourts) {
          for (const h of hours) {
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
        for (const h of hours) {
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

export const buildDefaultWeeklyBlocks = (sports = []) => buildWeeklyBlocksFromHours(sports, ALL_24_HOURS);
export const build24HourWeeklyBlocks = (sports = []) => buildWeeklyBlocksFromHours(sports, ALL_24_HOURS);
export const buildStandardDayWeeklyBlocks = (sports = []) => buildWeeklyBlocksFromHours(sports, DEFAULT_HOURS);

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

/**
 * Swimming Pool Model: Adds a customized arbitrary time slot (e.g. 05:30 - 06:15, 23:00 - 00:00)
 * to the weekly recurring schedule with custom capacity and court options.
 */
export const addCustomWeeklyBlock = async (ground, { dayOfWeek, startTime, endTime, sportId, courtId, capacity = 1, applyToAllDays = false }) => {
  ensureWeeklySchedule(ground);
  const isAll = applyToAllDays || dayOfWeek === 'all';
  const targetDays = isAll ? [0, 1, 2, 3, 4, 5, 6] : [Number(dayOfWeek)];
  const today = todayStr();
  const overrideSet = new Set(ground.overrideDates || []);

  for (const dow of targetDays) {
    const exists = ground.weeklySchedule.some(
      (b) =>
        b.dayOfWeek === dow &&
        b.startTime === startTime &&
        b.endTime === endTime &&
        String(b.sportId || '') === String(sportId || '') &&
        String(b.courtId || '') === String(courtId || '')
    );
    if (!exists) {
      ground.weeklySchedule.push({
        dayOfWeek: dow,
        startTime,
        endTime,
        sportId: sportId || null,
        courtId: courtId || null,
        capacity: Number(capacity) || 1,
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
              s.endTime === endTime &&
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
              capacity: Number(capacity) || 1,
              bookedCount: 0,
              bookedBy: [],
              isBooked: false,
            });
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

/**
 * Swimming Pool Model: Removes a specific slot block from the recurring weekly schedule.
 */
export const removeWeeklyBlock = async (ground, blockId) => {
  ensureWeeklySchedule(ground);
  const idx = ground.weeklySchedule.findIndex((b) => String(b._id) === String(blockId));
  if (idx >= 0) {
    const block = ground.weeklySchedule[idx];
    ground.weeklySchedule.splice(idx, 1);

    const today = todayStr();
    const overrideSet = new Set(ground.overrideDates || []);

    ground.slots = ground.slots.filter((s) => {
      if (s.isBooked || (s.bookedCount || 0) > 0) return true;
      if (s.date < today) return true;
      if (overrideSet.has(s.date)) return true;
      const sDow = new Date(`${s.date}T00:00:00`).getDay();
      const matches =
        sDow === block.dayOfWeek &&
        s.startTime === block.startTime &&
        String(s.sportId || '') === String(block.sportId || '') &&
        String(s.courtId || '') === String(block.courtId || '');
      return !matches;
    });

    await ground.save();
  }
  return ground;
};

/**
 * Swimming Pool Model: Clears all slots for a given day of the week (closes the ground on that day).
 */
export const clearWeeklyDay = async (ground, dayOfWeek) => {
  ensureWeeklySchedule(ground);
  const isAll = dayOfWeek === 'all';
  const targetDays = isAll ? [0, 1, 2, 3, 4, 5, 6] : [Number(dayOfWeek)];
  const today = todayStr();
  const overrideSet = new Set(ground.overrideDates || []);

  ground.weeklySchedule = ground.weeklySchedule.filter((b) => !targetDays.includes(b.dayOfWeek));

  ground.slots = ground.slots.filter((s) => {
    if (s.isBooked || (s.bookedCount || 0) > 0) return true;
    if (s.date < today) return true;
    if (overrideSet.has(s.date)) return true;
    const sDow = new Date(`${s.date}T00:00:00`).getDay();
    return !targetDays.includes(sDow);
  });

  await ground.save();
  return ground;
};

/**
 * Applies an automated schedule preset: '24hours', 'standard' (6am-10pm), 'night' (6pm-6am), or 'custom'.
 */
export const applySchedulePreset = async (
  ground,
  { preset = '24hours', startHour, endHour, applyToAllDays = true, dayOfWeek = 'all', sportId }
) => {
  const today = todayStr();
  const overrideSet = new Set(ground.overrideDates || []);
  const targetDays = applyToAllDays || dayOfWeek === 'all' ? [0, 1, 2, 3, 4, 5, 6] : [Number(dayOfWeek)];

  let hours = [];
  if (preset === '24hours') {
    hours = ALL_24_HOURS;
  } else if (preset === 'standard') {
    hours = DEFAULT_HOURS;
  } else if (preset === 'night') {
    hours = NIGHT_HOURS;
  } else if (preset === 'custom') {
    const s = Number(startHour) || 0;
    const e = Number(endHour) || 24;
    if (s < e) {
      hours = Array.from({ length: e - s }, (_, i) => s + i);
    } else {
      hours = [];
      for (let h = s; h < 24; h++) hours.push(h);
      for (let h = 0; h < e; h++) hours.push(h);
    }
  }

  // Remove existing blocks for targetDays
  ground.weeklySchedule = (ground.weeklySchedule || []).filter((b) => !targetDays.includes(b.dayOfWeek));

  const targetSports = sportId
    ? (ground.sports || []).filter((s) => String(s._id) === String(sportId))
    : ground.sports;

  for (const dow of targetDays) {
    for (const sport of targetSports?.length ? targetSports : [{ _id: null, courts: [] }]) {
      const activeCourts = Array.isArray(sport.courts) ? sport.courts.filter((c) => c.isActive) : [];
      if (sport.bookingMode === 'specific' && activeCourts.length > 0) {
        for (const court of activeCourts) {
          for (const h of hours) {
            ground.weeklySchedule.push({
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
        for (const h of hours) {
          ground.weeklySchedule.push({
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

  // Re-sync future unbooked slots
  ground.slots = (ground.slots || []).filter((s) => {
    if (s.isBooked || (s.bookedCount || 0) > 0) return true;
    if (s.date < today) return true;
    if (overrideSet.has(s.date)) return true;
    const sDow = new Date(`${s.date}T00:00:00`).getDay();
    return !targetDays.includes(sDow);
  });

  syncGroundAutomatedSlots(ground, 14);
  await ground.save();
  return ground;
};

export const startOverrideDate = async (ground, dateStr) => {
  if (!ground.overrideDates) ground.overrideDates = [];
  if (!ground.overrideDates.includes(dateStr)) {
    ground.overrideDates.push(dateStr);
  }

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

export const revertOverrideDate = async (ground, dateStr) => {
  if (Array.isArray(ground.overrideDates)) {
    ground.overrideDates = ground.overrideDates.filter((d) => d !== dateStr);
  }

  ground.slots = ground.slots.filter((s) => s.isBooked || (s.bookedCount || 0) > 0 || s.date !== dateStr);
  syncGroundAutomatedSlots(ground, 14);

  await ground.save();
  return ground;
};
