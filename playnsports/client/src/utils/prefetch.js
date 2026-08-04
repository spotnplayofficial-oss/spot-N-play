import API from '../api/axios';
import { dataStore } from './dataStore';

// Fires once per browser session (guarded by `started` below), triggered
// from App.jsx as soon as we know who's logged in. Loads the data behind
// Home, Events, and the current user's dashboard — one request at a time,
// in the background — so that by the time the person actually clicks into
// one of those pages, it's already sitting in the cache and renders
// instantly instead of showing its own loading state.
//
// If the person navigates to one of these pages before prefetching gets to
// it, that page's own cache-aware fetch (see dataStore.getOrFetch) simply
// requests it on demand — nothing here blocks that.
let started = false;

export const prefetchApp = async (user) => {
  if (started || !user) return;
  started = true;

  const tasks = [
    ['analytics:stats', () => API.get('/analytics/stats').then((r) => r.data)],
    ['players:all', () => API.get('/players/all').then((r) => r.data)],
    ['grounds:all', () => API.get('/grounds/all').then((r) => r.data)],
    ['events:explore', () => API.get('/events').then((r) => r.data)],
    ['events:my', () => API.get('/events/my').then((r) => r.data)],
  ];

  if (user.role === 'player') {
    tasks.push(
      ['dashboard:player:availability', () => API.get('/players/me').then((r) => r.data)],
      ['dashboard:player:bookings', () => API.get('/bookings/my').then((r) => r.data)],
      ['dashboard:player:payments', () => API.get('/payments/my').then((r) => r.data)],
    );
  } else if (user.role === 'ground_owner') {
    tasks.push(['dashboard:owner:grounds', () => API.get('/grounds/my').then((r) => r.data)]);
  } else if (user.role === 'coach') {
    tasks.push(['dashboard:coach:profile', () => API.get('/coaches/me').then((r) => r.data)]);
  }

  // Sequential on purpose — "one by one", per the request — so a slow
  // connection doesn't fire a burst of parallel requests behind whatever
  // page the person actually navigates to next.
  for (const [key, fetchFn] of tasks) {
    // eslint-disable-next-line no-await-in-loop
    await dataStore.getOrFetch(key, fetchFn).catch(() => {});
  }
};

// Allows a fresh prefetch after logout → login as someone else.
export const resetPrefetch = () => {
  started = false;
};
