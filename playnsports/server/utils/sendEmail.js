import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generic sender — every other email helper in this file goes through this
// so retry/logging/from-address behaviour only needs to live in one place.
// Never logs credentials or their presence/absence (that used to be printed
// on every server start, which is harmless on your own machine but not
// something you want sitting in shared/production logs).
const sendMail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"PLAYNSPORTS" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error(`Email send failed (to: ${to}, subject: "${subject}"):`, error.message);
    return false;
  }
};

const sendOTPEmail = async (email, otp) => {
  const sent = await sendMail({
    to: email,
    subject: "Your PLAYNSPORTS OTP",
    html: `<h2>Your OTP is ${otp}</h2>`,
  });
  if (!sent) throw new Error("Email sending failed");
};

// Event ticket confirmation — sent right after a player successfully joins
// an event (free or paid). Kept as a simple, plain template rather than a
// heavy branded one so it's fast to read on a phone at the door.
// `subEvent` and `quantity` are optional — pass them when the ticket is for
// a sub-event booking so the email shows the specific activity, venue,
// date/time and party size rather than the parent container event's.
const sendEventTicketEmail = async (user, event, ticketId, subEvent = null, quantity = 1, team = null) => {
  const displayTitle = subEvent ? `${event.title} — ${subEvent.title}` : event.title;
  const venue = subEvent?.venue || event.venue;
  const date = subEvent?.date || event.date;
  const startTime = subEvent?.startTime || event.startTime;
  const endTime = subEvent?.endTime || event.endTime;
  const isTeam = !!(team && team.teamName);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background:#0d1117;color:#4ade80;padding:20px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="margin:0;font-size:20px;letter-spacing:1px;">🎟️ YOUR TICKET IS CONFIRMED</h1>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
        <p style="font-size:15px;color:#111827;">Hi ${user.name},</p>
        <p style="font-size:14px;color:#374151;">${isTeam ? `Your team is registered for the following event:` : `You're confirmed for the following event:`}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Event</td><td style="padding:6px 0;font-weight:600;text-align:right;">${displayTitle}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Venue</td><td style="padding:6px 0;text-align:right;">${venue}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Date</td><td style="padding:6px 0;text-align:right;">${date}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Time</td><td style="padding:6px 0;text-align:right;">${startTime} – ${endTime}</td></tr>
          ${isTeam ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Team</td><td style="padding:6px 0;font-weight:600;text-align:right;">${team.teamName}</td></tr>` : ''}
          ${!isTeam && quantity > 1 ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Tickets</td><td style="padding:6px 0;text-align:right;">${quantity}</td></tr>` : ''}
        </table>
        ${isTeam ? `
        <div style="background:#f9fafb;border-radius:10px;padding:14px 16px;margin:0 0 16px;">
          <p style="margin:0 0 8px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Roster (${1 + (team.players?.length || 0)} players)</p>
          <p style="margin:0 0 4px;font-size:13px;color:#111827;">${team.captainName} (Captain) — ${team.captainMobile}${team.captainBgmiId ? ` — BGMI: ${team.captainBgmiId}` : ''}</p>
          ${(team.players || []).map((p) => `<p style="margin:0 0 4px;font-size:13px;color:#374151;">${p.name} — ${p.mobile}${p.bgmiId ? ` — BGMI: ${p.bgmiId}` : ''}</p>`).join('')}
        </div>` : ''}
        <div style="background:#f0fdf4;border:1px dashed #4ade80;border-radius:10px;padding:16px;text-align:center;margin:16px 0;">
          <p style="margin:0 0 4px;font-size:11px;color:#16a34a;text-transform:uppercase;letter-spacing:1px;">Ticket ID</p>
          <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:2px;color:#111827;">${ticketId}</p>
          ${isTeam ? `<p style="margin:6px 0 0;font-size:12px;color:#16a34a;">Covers your whole team</p>` : (quantity > 1 ? `<p style="margin:6px 0 0;font-size:12px;color:#16a34a;">Covers ${quantity} people</p>` : '')}
        </div>
        <p style="font-size:13px;color:#6b7280;">Show this ticket ID at the entrance — it'll be looked up to check you in. No app or download needed.</p>
      </div>
    </div>
  `;
  return sendMail({ to: user.email, subject: `Your ticket for "${displayTitle}" — ${ticketId}`, html });
};

// Gym trial confirmation — same visual pattern as the event ticket email,
// just pointed at a venue with a 2-day expiry instead of a fixed date.
const sendVenueTrialEmail = async (user, venue, ticketId, expiresAt) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background:#0d1117;color:#4ade80;padding:20px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="margin:0;font-size:20px;letter-spacing:1px;">🎟️ YOUR FREE TRIAL IS CONFIRMED</h1>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
        <p style="font-size:15px;color:#111827;">Hi ${user.name},</p>
        <p style="font-size:14px;color:#374151;">You've claimed a 2-day free trial at:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Venue</td><td style="padding:6px 0;font-weight:600;text-align:right;">${venue.name}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Address</td><td style="padding:6px 0;text-align:right;">${venue.address}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Valid until</td><td style="padding:6px 0;text-align:right;">${new Date(expiresAt).toLocaleString()}</td></tr>
        </table>
        <div style="background:#f0fdf4;border:1px dashed #4ade80;border-radius:10px;padding:16px;text-align:center;margin:16px 0;">
          <p style="margin:0 0 4px;font-size:11px;color:#16a34a;text-transform:uppercase;letter-spacing:1px;">Ticket ID</p>
          <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:2px;color:#111827;">${ticketId}</p>
        </div>
        <p style="font-size:13px;color:#6b7280;">Show this ticket ID at the venue — staff will look it up to check you in. No app or download needed.</p>
      </div>
    </div>
  `;
  return sendMail({ to: user.email, subject: `Your free trial at "${venue.name}" — ${ticketId}`, html });
};

// Swimming pool booking confirmation — same visual pattern as the event
// ticket email, with the pool/slot/membership details and, if the slot is
// girls-only, the same no-refund notice shown in the booking popup.
const sendPoolBookingEmail = async (user, ground, booking) => {
  const categoryLine = booking.slotCategory === 'girls_only'
    ? `<p style="font-size:12px;color:#db2777;background:#fdf2f8;border:1px solid #fbcfe8;border-radius:8px;padding:10px;margin:12px 0;">👧 Girls-only session — entry is restricted accordingly. No refund is given if this is not followed.</p>`
    : '';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background:#0d1117;color:#4ade80;padding:20px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="margin:0;font-size:20px;letter-spacing:1px;">🎟️ YOUR POOL BOOKING IS CONFIRMED</h1>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
        <p style="font-size:15px;color:#111827;">Hi ${user.name},</p>
        <p style="font-size:14px;color:#374151;">Your swimming pool session is booked and paid in full:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Venue</td><td style="padding:6px 0;font-weight:600;text-align:right;">${ground.name}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Pool</td><td style="padding:6px 0;text-align:right;">${booking.poolName}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Date</td><td style="padding:6px 0;text-align:right;">${booking.date}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Time</td><td style="padding:6px 0;text-align:right;">${booking.startTime} – ${booking.endTime}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Membership</td><td style="padding:6px 0;text-align:right;">${booking.membershipPlanName}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Party size</td><td style="padding:6px 0;text-align:right;">${booking.partySize}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Amount paid</td><td style="padding:6px 0;font-weight:600;text-align:right;">₹${booking.totalPrice}</td></tr>
        </table>
        ${categoryLine}
        <div style="background:#f0fdf4;border:1px dashed #4ade80;border-radius:10px;padding:16px;text-align:center;margin:16px 0;">
          <p style="margin:0 0 4px;font-size:11px;color:#16a34a;text-transform:uppercase;letter-spacing:1px;">Ticket ID</p>
          <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:2px;color:#111827;">${booking.ticketId}</p>
        </div>
        <p style="font-size:13px;color:#6b7280;">Show this ticket ID at the pool. Cancellations/refunds are only issued in case of a payment issue — contact support for that.</p>
      </div>
    </div>
  `;
  return sendMail({ to: user.email, subject: `Your pool booking at "${ground.name}" — ${booking.ticketId}`, html });
};

export default sendOTPEmail;
export { sendMail, sendOTPEmail, sendEventTicketEmail, sendVenueTrialEmail, sendPoolBookingEmail };
