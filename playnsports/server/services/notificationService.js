import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { getIO } from '../socket/io.js';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes.js';

// ── Core primitive ──────────────────────────────────────────────
// Every notification in the app — current and future — is created
// through this one function. It persists to the DB AND pushes a
// real-time event to the recipient (if they're online) via the
// `user_<id>` socket room every authenticated socket joins on connect.
//
// Never throws — a notification failing must never break the feature
// that triggered it (e.g. a typo in a notification shouldn't stop an
// event from being approved).
const notify = async ({ recipient, actor = null, type, title, body = '', link = '', data = {} }) => {
  try {
    if (!recipient) return null;
    const recipientId = recipient.toString();

    // Don't notify yourself (e.g. an admin who is also somehow the actor)
    if (actor && actor.toString() === recipientId) return null;

    const notification = await Notification.create({
      recipient: recipientId, actor, type, title, body, link, data,
    });

    const io = getIO();
    if (io) {
      io.to(`user_${recipientId}`).emit('new_notification', notification);
    }

    return notification;
  } catch (err) {
    console.error('notify() failed:', err.message);
    return null;
  }
};

// Fan a single notification out to many recipients (e.g. "all admins")
const notifyMany = async (recipients = [], payload) => {
  return Promise.all(recipients.map((recipient) => notify({ ...payload, recipient })));
};

const getAdminIds = async () => {
  const admins = await User.find({ role: 'admin' }).select('_id');
  return admins.map((a) => a._id);
};

// ─────────────────────────────────────────────────────────────────
// Per-feature helpers — this is the "expandable" surface.
//
// To wire up a brand-new feature's notification later:
//   1. Add the type to constants/notificationTypes.js
//   2. Add a small notifyXxx() function below
//   3. Call it (fire-and-forget, e.g. `notifyXxx({...})` with no await
//      needed since it never throws) from the controller where the
//      triggering action happens.
// ─────────────────────────────────────────────────────────────────

// Someone invited you to a group
const notifyGroupInvite = ({ groupId, groupName, invitedUserId, inviterId, inviterName }) =>
  notify({
    recipient: invitedUserId,
    actor: inviterId,
    type: NOTIFICATION_TYPES.GROUP_INVITE,
    title: 'New group invitation',
    body: `${inviterName} invited you to join "${groupName}"`,
    link: '/groups',
    data: { groupId },
  });

// You received a chat message (direct or group conversation)
const notifyNewMessage = ({ conversationId, recipientId, senderId, senderName, preview }) =>
  notify({
    recipient: recipientId,
    actor: senderId,
    type: NOTIFICATION_TYPES.NEW_MESSAGE,
    title: `New message from ${senderName}`,
    body: preview?.length > 120 ? `${preview.slice(0, 120)}…` : preview,
    link: `/chat/${conversationId}`,
    data: { conversationId },
  });

// Admin approved your event
const notifyEventApproved = ({ eventId, eventTitle, organizerId }) =>
  notify({
    recipient: organizerId,
    type: NOTIFICATION_TYPES.EVENT_APPROVED,
    title: 'Event approved ✅',
    body: `Your event "${eventTitle}" is now live on /events`,
    link: '/events',
    data: { eventId },
  });

// Admin rejected your event
const notifyEventRejected = ({ eventId, eventTitle, organizerId, reason }) =>
  notify({
    recipient: organizerId,
    type: NOTIFICATION_TYPES.EVENT_REJECTED,
    title: 'Event rejected',
    body: reason ? `"${eventTitle}" was rejected: ${reason}` : `Your event "${eventTitle}" was rejected`,
    link: '/events',
    data: { eventId },
  });

// Admin approved your coach application
const notifyCoachApproved = ({ coachId, userId }) =>
  notify({
    recipient: userId,
    type: NOTIFICATION_TYPES.COACH_APPROVED,
    title: 'Coach application approved 🎉',
    body: 'You are now listed as a coach on PlayNSports',
    link: '/coach/dashboard',
    data: { coachId },
  });

// Admin rejected your coach application
const notifyCoachRejected = ({ coachId, userId, reason }) =>
  notify({
    recipient: userId,
    type: NOTIFICATION_TYPES.COACH_REJECTED,
    title: 'Coach application rejected',
    body: reason || 'Your coach application was rejected',
    data: { coachId },
  });

// Tell every admin a new coach application needs review
const notifyAdminsNewCoachApplication = async ({ coachId, coachName }) => {
  const admins = await getAdminIds();
  return notifyMany(admins, {
    type: NOTIFICATION_TYPES.NEW_COACH_APPLICATION,
    title: 'New coach application',
    body: `${coachName} applied to become a coach — review in Admin Panel`,
    link: '/admin',
    data: { coachId },
  });
};

// Tell every admin a new ground was submitted for approval
const notifyAdminsNewGroundSubmitted = async ({ groundId, groundName }) => {
  const admins = await getAdminIds();
  return notifyMany(admins, {
    type: NOTIFICATION_TYPES.NEW_GROUND_SUBMITTED,
    title: 'New ground submitted',
    body: `"${groundName}" was submitted for approval — review in Admin Panel`,
    link: '/admin',
    data: { groundId },
  });
};

// A player booked a slot on your ground — real-time + persisted, shows up
// in the owner's bell instantly whether they're looking at the dashboard
// or not (and is still there in the notification list if they weren't
// online at the time).
const notifySlotBooked = ({ ownerId, actorId, groundId, groundName, date, startTime, endTime, pendingApproval = false }) =>
  notify({
    recipient: ownerId,
    actor: actorId,
    type: NOTIFICATION_TYPES.SLOT_BOOKED,
    title: pendingApproval ? 'New booking request 🏟️' : 'Slot booked ✅',
    body: `"${groundName}" — ${date}, ${startTime}–${endTime}${pendingApproval ? ' (awaiting your approval)' : ''}`,
    link: '/owner/dashboard',
    data: { groundId, date, startTime, endTime },
  });

// Your event ticket is ready (fired right after joining, alongside the
// confirmation email — this is the in-app copy of the same confirmation).
const notifyEventTicketIssued = ({ eventId, eventTitle, userId, ticketId }) =>
  notify({
    recipient: userId,
    type: NOTIFICATION_TYPES.EVENT_TICKET_ISSUED,
    title: 'Your ticket is ready 🎟️',
    body: `Ticket ${ticketId} for "${eventTitle}" — check your email for the full confirmation.`,
    link: '/events/joined',
    data: { eventId, ticketId },
  });

// The organizer just checked you in at the door
const notifyEventCheckedIn = ({ eventId, eventTitle, userId }) =>
  notify({
    recipient: userId,
    type: NOTIFICATION_TYPES.EVENT_CHECKED_IN,
    title: "You're checked in 🎉",
    body: `Have fun at "${eventTitle}"!`,
    link: '/events/joined',
    data: { eventId },
  });

export {
  notify,
  notifyMany,
  getAdminIds,
  notifyGroupInvite,
  notifyNewMessage,
  notifyEventApproved,
  notifyEventRejected,
  notifyCoachApproved,
  notifyCoachRejected,
  notifyAdminsNewCoachApplication,
  notifyAdminsNewGroundSubmitted,
  notifySlotBooked,
  notifyEventTicketIssued,
  notifyEventCheckedIn,
};
