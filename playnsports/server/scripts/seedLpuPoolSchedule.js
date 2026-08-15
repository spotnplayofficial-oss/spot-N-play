// Seeds the real "Sports Complex Swimming Pool" weekly schedule onto one
// pool at one venue — the exact 8 slots/day from the venue's own posted
// timings, Monday through Saturday (Sunday closed, matching "6 days/week").
//
// Usage (run from anywhere — the .env path is resolved relative to this
// file, not to whatever directory you happen to be in):
//   node server/scripts/seedLpuPoolSchedule.js <groundId> [poolName] [capacity]
//
// <groundId> is the venue's MongoDB _id (a 24-character hex string) — NOT
// the pool's name. Find it in the URL when viewing the venue as
// /grounds/<this-part>, or in the admin panel / your database.
//
// Examples:
//   node server/scripts/seedLpuPoolSchedule.js 66f1a2b3c4d5e6f7a8b9c0d1
//   node server/scripts/seedLpuPoolSchedule.js 66f1a2b3c4d5e6f7a8b9c0d1 "Pool 1" 25
//
// Safe to re-run: it REPLACES the weekly template for the target pool
// rather than appending to it, so running it twice doesn't create
// duplicate slots.
//
// Note: the venue's own notice doesn't state a per-slot swimmer capacity
// ("I would not add capacity numbers yet... get that number from the
// pool"), so this defaults to 20 as a placeholder — pass a real number as
// the third argument once you have it, or edit it later from the Schedule
// tab in the pool owner/admin dashboard.
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import PoolConfig from '../models/PoolConfig.js';

// Resolve ../.env relative to THIS file's location, not the current working
// directory — so `cd server/scripts && node seedLpuPoolSchedule.js ...`
// still finds server/.env instead of silently loading nothing.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const WEEKLY_SLOTS = [
  { startTime: '06:00', endTime: '06:50', category: 'general' },
  { startTime: '07:00', endTime: '07:50', category: 'girls_only' },
  { startTime: '08:00', endTime: '08:50', category: 'general' },
  { startTime: '16:00', endTime: '16:50', category: 'general' },
  { startTime: '17:00', endTime: '17:50', category: 'general' },
  { startTime: '18:00', endTime: '18:50', category: 'girls_only' },
  { startTime: '19:00', endTime: '19:50', category: 'general' },
  { startTime: '20:00', endTime: '20:50', category: 'general' },
];

// Monday(1) through Saturday(6) — Sunday(0) is left with no blocks, i.e.
// closed, matching "operates 6 days a week". Change this array if the
// actual closed day turns out to be a different one.
const OPEN_DAYS = [1, 2, 3, 4, 5, 6];

function printUsage() {
  console.error('Usage: node server/scripts/seedLpuPoolSchedule.js <groundId> [poolName] [capacity]');
  console.error('  <groundId> is the venue\'s MongoDB _id (24-char hex), not the pool name.');
  console.error('  Example:   node server/scripts/seedLpuPoolSchedule.js 66f1a2b3c4d5e6f7a8b9c0d1 "Pool 1" 25');
}

async function run() {
  const [, , groundId, poolNameArg, capacityArg] = process.argv;

  if (!groundId) {
    printUsage();
    process.exit(1);
  }
  if (!mongoose.Types.ObjectId.isValid(groundId) || groundId.length !== 24) {
    console.error(`"${groundId}" doesn't look like a valid MongoDB _id.`);
    printUsage();
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Checked for a .env file at:', path.join(__dirname, '..', '.env'));
    console.error('Make sure server/.env exists and contains MONGODB_URI=...');
    process.exit(1);
  }

  const poolName = poolNameArg || 'Pool 1';
  const capacity = Number(capacityArg) || 20;

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  let config = await PoolConfig.findOneAndUpdate(
    { ground: groundId },
    { $setOnInsert: { ground: groundId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  let pool = config.pools.find((p) => p.name === poolName);
  if (!pool) {
    config.pools.push({ name: poolName, defaultCapacity: capacity });
    await config.save();
    config = await PoolConfig.findById(config._id);
    pool = config.pools.find((p) => p.name === poolName);
    console.log(`Created pool "${poolName}" (it didn't exist yet).`);
  }

  const weeklyBlocks = [];
  for (const day of OPEN_DAYS) {
    for (const slot of WEEKLY_SLOTS) {
      weeklyBlocks.push({ dayOfWeek: day, capacity, ...slot });
    }
  }
  pool.weeklyBlocks = weeklyBlocks;
  pool.defaultCapacity = capacity;
  await config.save();

  console.log(`\nDone. "${poolName}" now has ${weeklyBlocks.length} recurring slots (${WEEKLY_SLOTS.length}/day × ${OPEN_DAYS.length} days, Mon–Sat).`);
  console.log(`Capacity was set to ${capacity} per slot as a placeholder — update it once the venue confirms the real number.`);
  console.log('Sunday is left closed. Re-run this script any time to reset back to this exact schedule.');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
