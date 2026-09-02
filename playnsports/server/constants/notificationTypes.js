// ─────────────────────────────────────────────────────────────────
// Central registry of every notification type the app can produce.
//
// This is the ONLY place a brand-new notification "kind" needs to be
// declared. The Notification model's `type` enum is built from this
// same object (see models/Notification.js), so the DB schema and the
// rest of the codebase can never drift out of sync.
//
// To add a new notification type later:
//   1. Add a `KEY: 'value'` line below.
//   2. Add a small `notifyXxx()` helper in services/notificationService.js.
//   3. Call that helper from wherever the triggering action happens.
// Nothing else (routes, controller, model, frontend bell) needs to change.
// ─────────────────────────────────────────────────────────────────

export const NOTIFICATION_TYPES = Object.freeze({
  // Groups
  GROUP_INVITE: 'group_invite',

  // Chat
  NEW_MESSAGE: 'new_message',

  // Events
  EVENT_APPROVED: 'event_approved',
  EVENT_REJECTED: 'event_rejected',

  // Coaches
  COACH_APPROVED: 'coach_approved',
  COACH_REJECTED: 'coach_rejected',
  NEW_COACH_APPLICATION: 'new_coach_application', // admin-facing

  // Grounds
  NEW_GROUND_SUBMITTED: 'new_ground_submitted',   // admin-facing
  SLOT_BOOKED: 'slot_booked',                     // ground-owner-facing

  // Events — tickets / check-in
  EVENT_TICKET_ISSUED: 'event_ticket_issued',     // player-facing
  EVENT_CHECKED_IN: 'event_checked_in',           // player-facing (confirms they're marked as arrived)

  // Find Players
  NEARBY_GAME_REQUEST: 'nearby_game_request',     // player-facing — someone nearby is looking for players
  GAME_REQUEST_JOINED: 'game_request_joined',     // organizer-facing — someone joined your request
  GAME_REQUEST_JOIN_CONFIRMED: 'game_request_join_confirmed', // joiner-facing — you joined someone's request
  SQUAD_READY: 'squad_ready', // all members — squad is full and ready to book BGUS

  // Venues — gym trial leads
  VENUE_TRIAL_CLAIMED: 'venue_trial_claimed',     // venue-owner-facing — someone claimed a free trial
  VENUE_CHECKED_IN: 'venue_checked_in',           // player-facing — confirms they're marked as arrived for a trial
  VENUE_INTEREST_SHOWN: 'venue_interest_shown',   // venue-owner-facing — someone opened an interest-only venue

  // Swimming pool bookings
  POOL_BOOKING_CONFIRMED: 'pool_booking_confirmed', // player-facing

  // Player challenges (1v1 duels)
  CHALLENGE_RECEIVED: 'challenge_received',   // opponent-facing — someone challenged you
  CHALLENGE_UPDATE: 'challenge_update',       // challenger/opponent-facing — accepted, declined, cancelled or result
});

export const NOTIFICATION_TYPE_VALUES = Object.values(NOTIFICATION_TYPES);

// Groups types into UI-facing categories for the /notifications filter bar.
// Add a new type above, then slot it into the right bucket here (or a new
// bucket) — that's the only extra step needed for it to show up as a
// filterable category on the frontend.
export const NOTIFICATION_CATEGORIES = Object.freeze({
  group: [NOTIFICATION_TYPES.GROUP_INVITE],
  chat: [NOTIFICATION_TYPES.NEW_MESSAGE],
  event: [NOTIFICATION_TYPES.EVENT_APPROVED, NOTIFICATION_TYPES.EVENT_REJECTED],
  coach: [
    NOTIFICATION_TYPES.COACH_APPROVED,
    NOTIFICATION_TYPES.COACH_REJECTED,
    NOTIFICATION_TYPES.NEW_COACH_APPLICATION,
  ],
  ground: [NOTIFICATION_TYPES.NEW_GROUND_SUBMITTED, NOTIFICATION_TYPES.SLOT_BOOKED],
  ticket: [NOTIFICATION_TYPES.EVENT_TICKET_ISSUED, NOTIFICATION_TYPES.EVENT_CHECKED_IN, NOTIFICATION_TYPES.POOL_BOOKING_CONFIRMED],
  game: [NOTIFICATION_TYPES.NEARBY_GAME_REQUEST, NOTIFICATION_TYPES.GAME_REQUEST_JOINED, NOTIFICATION_TYPES.GAME_REQUEST_JOIN_CONFIRMED, NOTIFICATION_TYPES.SQUAD_READY],
  venue: [NOTIFICATION_TYPES.VENUE_TRIAL_CLAIMED, NOTIFICATION_TYPES.VENUE_CHECKED_IN, NOTIFICATION_TYPES.VENUE_INTEREST_SHOWN],
  challenge: [NOTIFICATION_TYPES.CHALLENGE_RECEIVED, NOTIFICATION_TYPES.CHALLENGE_UPDATE],
});
