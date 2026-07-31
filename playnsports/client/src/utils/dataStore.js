// Lightweight in-memory cache shared across the whole app.
//
// This lives as plain module state (not React state), so it survives page
// navigation (React Router unmount/remount) but is naturally wiped on a
// manual browser refresh — which is exactly the "load once, reload only on
// manual refresh" behavior the app wants. It's populated in the background
// by utils/prefetch.js and read by pages via the helpers below.
//
// Entry shape: { status: 'idle' | 'loading' | 'ready' | 'error', data, promise, error }

const store = new Map();
const listeners = new Map(); // key -> Set<() => void>

const notify = (key) => {
  listeners.get(key)?.forEach((fn) => fn());
};

export const dataStore = {
  get(key) {
    return store.get(key) || { status: 'idle', data: undefined };
  },

  has(key) {
    return store.get(key)?.status === 'ready';
  },

  // Directly store a value as "ready" — used after an explicit fetch
  // (mutation, filter change, manual refresh) so the cache always reflects
  // the latest data a page actually fetched.
  set(key, data) {
    store.set(key, { status: 'ready', data });
    notify(key);
  },

  // Runs fetchFn() at most once per key: if data is already cached it
  // resolves immediately with no network call; if a fetch for this key is
  // already in flight, callers share that same promise instead of firing
  // duplicate requests (e.g. the background prefetcher and a page landing
  // on the same data at the same time).
  getOrFetch(key, fetchFn) {
    const entry = store.get(key);
    if (entry?.status === 'ready') return Promise.resolve(entry.data);
    if (entry?.status === 'loading') return entry.promise;

    const promise = fetchFn()
      .then((data) => {
        store.set(key, { status: 'ready', data });
        notify(key);
        return data;
      })
      .catch((error) => {
        store.set(key, { status: 'error', error });
        notify(key);
        throw error;
      });

    store.set(key, { status: 'loading', promise });
    return promise;
  },

  subscribe(key, fn) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(fn);
    return () => listeners.get(key)?.delete(fn);
  },

  // Wipes everything — call this on logout so the next person to log in on
  // the same tab never sees a previous user's cached dashboard/booking data.
  clear() {
    store.clear();
    listeners.clear();
  },
};
