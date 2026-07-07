// ─────────────────────────────────────────────────────────────
// Guided tour step configuration.
// Each step points to a real element via a `data-tour="..."` attribute
// that has been added directly on the relevant page components.
//
// Fields:
//   id        unique key
//   page      route the step lives on (tour will auto-navigate here)
//   target    CSS selector for the element to spotlight
//   fallback  optional selector used if `target` isn't found (e.g. empty state)
//   placement preferred tooltip position: 'top' | 'bottom' | 'left' | 'right' | 'center'
//   title     tooltip heading
//   content   tooltip body copy
//   icon      small emoji shown in the tooltip badge
// ─────────────────────────────────────────────────────────────

export const TOUR_STEPS = [
  {
    id: 'welcome',
    page: '/player/dashboard',
    target: null,
    placement: 'center',
    icon: '🏆',
    title: "Welcome to spotNplay!",
    content: "Let's take a quick 60-second lap around the app so you know exactly how to find players, book grounds, build a squad, and jump into events. You can skip anytime.",
  },
  {
    id: 'dash-sport',
    page: '/player/dashboard',
    target: '[data-tour="dash-sport"]',
    placement: 'bottom',
    icon: '⚽',
    title: 'Step 1 — Choose your sport',
    content: 'Pick the sport you want to play right now. This is what other players will see when they find you on the map.',
  },
  {
    id: 'dash-skill',
    page: '/player/dashboard',
    target: '[data-tour="dash-skill"]',
    placement: 'bottom',
    icon: '🎯',
    title: 'Step 2 — Set your skill level',
    content: 'Beginner, intermediate, or advanced — this helps you get matched with players around your level.',
  },
  {
    id: 'dash-golive',
    page: '/player/dashboard',
    target: '[data-tour="dash-golive"]',
    placement: 'top',
    icon: '🟢',
    title: 'Step 3 — Go live on the map',
    content: "Hit this and you'll instantly appear on the live map so nearby players can spot you and say hey.",
  },
  {
    id: 'map-filters',
    page: '/map',
    target: '[data-tour="map-filters"]',
    placement: 'bottom',
    icon: '🔍',
    title: 'Filter the map',
    content: 'Search by name, filter by sport or skill level, and adjust the radius slider to widen or narrow your search.',
  },
  {
    id: 'map-players',
    page: '/map',
    target: '[data-tour="map-players-list"]',
    placement: 'left',
    icon: '📋',
    title: 'Find compatible players',
    content: "Every match to your filters shows up here and on the map — ranked closest-first, so it's easy to find someone nearby.",
  },
  {
    id: 'map-message',
    page: '/map',
    target: '[data-tour="map-message-btn"]',
    fallback: '[data-tour="map-players-list"]',
    placement: 'top',
    icon: '💬',
    title: 'Message a player',
    content: 'Found someone you want to play with? Tap Message to start chatting directly and set up a game.',
  },
  {
    id: 'groups-create',
    page: '/groups',
    target: '[data-tour="group-create-form"]',
    placement: 'bottom',
    icon: '👥',
    title: 'Create a group',
    content: 'Building a squad for an upcoming match? Create a group here, set a joining deadline, and invite players you meet on the map.',
  },
  {
    id: 'events-explore',
    page: '/events',
    target: '[data-tour="events-explore-tab"]',
    placement: 'bottom',
    icon: '🎟️',
    title: 'Join an event',
    content: 'Browse events hosted by other players and ground owners nearby, and join the ones that fit your schedule.',
  },
  {
    id: 'events-create',
    page: '/events',
    target: '[data-tour="events-create-tab"]',
    placement: 'bottom',
    icon: '📅',
    title: 'Host your own event',
    content: 'Got a ground booked and want to fill it up? Create an event here — free or paid — and let players near you join in.',
  },
  {
    id: 'finish',
    page: '/events',
    target: null,
    placement: 'center',
    icon: '🎉',
    title: "You're all set!",
    content: "That's the full loop — go live, find your people, build a group, and get into events. Coaches are one tab away too. Restart this guide anytime from your profile menu.",
  },
];

export const isCenterStep = (step) => !step?.target && step?.placement === 'center';
