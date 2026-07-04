import asyncHandler from 'express-async-handler';

// ── Reverse-geocode proxy ────────────────────────────────────────────
//
// MapSearch.jsx used to call nominatim.openstreetmap.org directly from the
// browser, once per player marker, all in parallel (Promise.all). Nominatim's
// usage policy caps public API use at ~1 request/second and expects a real
// identifying User-Agent — a burst of 10-20 simultaneous browser requests
// blows through that instantly, so some come back throttled (429) and,
// since Nominatim doesn't reliably send CORS headers on throttled/rejected
// responses, the browser reports those as CORS errors too.
//
// Routing this through our own backend fixes both problems at once:
//   1. The browser only ever talks to our own API (same-origin), so no CORS.
//   2. We serialize + rate-limit + cache the actual outbound Nominatim
//      calls here, so Nominatim only ever sees a single well-behaved client.

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — area names don't change
const cache = new Map(); // "lat,lon" (rounded) -> { area, expiresAt }

// ~110m precision — plenty for a neighbourhood/area name, and lets nearby
// players/grounds share one cached lookup instead of hitting Nominatim again.
const cacheKey = (lat, lon) => `${lat.toFixed(3)},${lon.toFixed(3)}`;

// Serialize every outbound Nominatim call through this queue so we never
// send more than ~1 request/second, no matter how many requests land here
// concurrently from different users/markers.
let queue = Promise.resolve();
const RATE_LIMIT_MS = 1100;

const enqueue = (fn) => {
  const run = queue.then(async () => {
    const result = await fn();
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS));
    return result;
  });
  // Don't let one failed lookup wedge the whole queue for everyone after it.
  queue = run.catch(() => {});
  return run;
};

const fetchFromNominatim = async (lat, lon) => {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14`;
  const res = await fetch(url, {
    headers: {
      // Nominatim's policy requires a real identifying User-Agent —
      // requests without one are the ones most likely to get throttled/blocked.
      'User-Agent': 'spotNplay/1.0 (contact: spotnplay.app@gmail.com)',
      'Accept-Language': 'en',
    },
  });
  if (!res.ok) throw new Error(`Nominatim responded ${res.status}`);
  const data = await res.json();
  const a = data.address || {};
  return a.suburb || a.neighbourhood || a.village || a.town || a.city || a.county || 'Unknown Area';
};

// GET /api/geocode/reverse?lat=..&lon=..
const reverseGeocode = asyncHandler(async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    res.status(400);
    throw new Error('lat and lon query params are required');
  }

  const key = cacheKey(lat, lon);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json({ area: cached.area });
  }

  let area;
  try {
    area = await enqueue(() => fetchFromNominatim(lat, lon));
  } catch {
    area = 'Unknown Area';
  }

  cache.set(key, { area, expiresAt: Date.now() + CACHE_TTL_MS });
  res.json({ area });
});

export { reverseGeocode };
