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
  ticket: [NOTIFICATION_TYPES.EVENT_TICKET_ISSUED, NOTIFICATION_TYPES.EVENT_CHECKED_IN],
});
