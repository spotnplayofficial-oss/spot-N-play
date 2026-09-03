import nodemailer from "nodemailer";
import 'dotenv/config';

const getTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER?.trim(),
      pass: process.env.EMAIL_PASS?.trim(),
    },
  });
};

// Generic sender — every other email helper in this file goes through this
const sendMail = async ({ to, subject, html }) => {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"spotNplay" <${process.env.EMAIL_USER?.trim()}>`,
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
  if (!sent) {
    console.log(`\n========================================`);
    console.log(`📧 [DEV FALLBACK] LOGIN OTP for ${email}: ${otp}`);
    console.log(`⚠️ Email sending failed. Check your Gmail App Password in .env.`);
    console.log(`========================================\n`);
    if (process.env.NODE_ENV === 'production') {
      throw new Error("Email sending failed");
    }
  }
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

const sendPasswordResetEmail = async (email, otp, name = 'Player') => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #070c18; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
      <div style="background:#091124; padding: 28px 24px; text-align: center; border-bottom: 1px solid rgba(179,244,6,0.2);">
        <h1 style="margin:0; font-size: 22px; color: #b3f406; letter-spacing: 1px;">SPOTNPLAY</h1>
        <p style="margin: 6px 0 0; font-size: 13px; color: #8c9bb5; text-transform: uppercase; letter-spacing: 1.5px;">Password Reset Request</p>
      </div>
      <div style="padding: 28px 24px; color: #f0f2f5;">
        <p style="font-size: 15px; margin: 0 0 14px;">Hi ${name},</p>
        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0 0 20px;">
          We received a request to reset the password for your spotNplay account. Use the 6-digit verification code below to set your new password:
        </p>
        <div style="background: rgba(179,244,6,0.08); border: 1px dashed #b3f406; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
          <p style="margin: 0 0 6px; font-size: 11px; color: #8c9bb5; text-transform: uppercase; letter-spacing: 1.5px;">Verification Code</p>
          <p style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #b3f406;">${otp}</p>
          <p style="margin: 8px 0 0; font-size: 12px; color: #94a3b8;">Valid for 10 minutes</p>
        </div>
        <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 20px 0 0;">
          If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
        </p>
      </div>
      <div style="background: #050810; padding: 14px 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06);">
        <p style="margin: 0; font-size: 11px; color: #64748b;">© 2026 spotNplay Active Sports Network</p>
      </div>
    </div>
  `;
  const sent = await sendMail({
    to: email,
    subject: `spotNplay — Password Reset Code: ${otp}`,
    html,
  });
  if (!sent) {
    console.log(`\n========================================`);
    console.log(`🔐 [DEV FALLBACK] PASSWORD RESET OTP for ${email}: ${otp}`);
    console.log(`⚠️ Email sending failed. Check your Gmail App Password in .env.`);
    console.log(`========================================\n`);
    if (process.env.NODE_ENV === 'production') {
      throw new Error("Failed to send password reset email. Please try again.");
    }
  }
};

export default sendOTPEmail;
export { sendMail, sendOTPEmail, sendPasswordResetEmail, sendEventTicketEmail, sendVenueTrialEmail, sendPoolBookingEmail };
