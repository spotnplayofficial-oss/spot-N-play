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
const sendEventTicketEmail = async (user, event, ticketId) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background:#0d1117;color:#4ade80;padding:20px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="margin:0;font-size:20px;letter-spacing:1px;">🎟️ YOUR TICKET IS CONFIRMED</h1>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
        <p style="font-size:15px;color:#111827;">Hi ${user.name},</p>
        <p style="font-size:14px;color:#374151;">You're confirmed for the following event:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Event</td><td style="padding:6px 0;font-weight:600;text-align:right;">${event.title}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Venue</td><td style="padding:6px 0;text-align:right;">${event.venue}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Date</td><td style="padding:6px 0;text-align:right;">${event.date}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Time</td><td style="padding:6px 0;text-align:right;">${event.startTime} – ${event.endTime}</td></tr>
        </table>
        <div style="background:#f0fdf4;border:1px dashed #4ade80;border-radius:10px;padding:16px;text-align:center;margin:16px 0;">
          <p style="margin:0 0 4px;font-size:11px;color:#16a34a;text-transform:uppercase;letter-spacing:1px;">Ticket ID</p>
          <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:2px;color:#111827;">${ticketId}</p>
        </div>
        <p style="font-size:13px;color:#6b7280;">Show this ticket ID at the entrance — the organizer will look it up to check you in. No app or download needed.</p>
      </div>
    </div>
  `;
  return sendMail({ to: user.email, subject: `Your ticket for "${event.title}" — ${ticketId}`, html });
};

export default sendOTPEmail;
export { sendMail, sendOTPEmail, sendEventTicketEmail };
