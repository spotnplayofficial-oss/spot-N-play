import { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import InstagramIcon from '../components/icons/InstagramIcon.jsx';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// TODO: fill in your real details — keep in sync with Footer.jsx.
const CONTACT_EMAIL = 'spotnplayofficial@gmail.com';
const CONTACT_PHONE = '+91 95712 10994';
const CONTACT_ADDRESS = 'Phagwara, Punjab, 144401 — India';
const SUPPORT_HOURS = 'Mon – Sat, 10:00 AM – 7:00 PM IST';
const INSTAGRAM_URL = 'https://instagram.com/spotnplayofficial';

const NAV_ITEMS = [
  { id: 'about', label: 'About Us' },
  { id: 'contact-us', label: 'Contact Us' },
  { id: 'privacy-policy', label: 'Privacy Policy' },
  { id: 'terms-and-conditions', label: 'Terms & Conditions' },
  { id: 'refund-policy', label: 'Refund & Cancellation' },
];

const Section = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24 pt-2 pb-12 border-b border-black/5 dark:border-white/5 last:border-b-0">
    <h2 className="font-bebas text-3xl tracking-wide text-gray-900 dark:text-white mb-6">{title}</h2>
    <div className="flex flex-col gap-6">{children}</div>
  </section>
);

const Sub = ({ title, children }) => (
  <div>
    {title && <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">{title}</h3>}
    <div className="flex flex-col gap-3">{children}</div>
  </div>
);

const P = ({ children }) => (
  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{children}</p>
);

const UL = ({ items }) => (
  <ul className="list-disc list-outside ml-5 flex flex-col gap-1.5">
    {items.map((item, i) => (
      <li key={i} className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{item}</li>
    ))}
  </ul>
);

const Note = ({ children }) => (
  <div className="p-4 rounded-2xl border border-amber-400/20 bg-amber-400/[0.04]">
    <p className="text-amber-400/90 text-xs leading-relaxed">{children}</p>
  </div>
);

const ContactRow = ({ icon: Icon, label, value, href }) => (
  <div className="flex items-start gap-4 p-4 rounded-2xl border border-black/5 dark:border-white/5 bg-black/[0.015] dark:bg-white/[0.015]">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-green-400/10 border border-green-400/20 text-green-400">
      <Icon size={17} />
    </div>
    <div className="min-w-0">
      <p className="text-gray-500 text-xs uppercase tracking-wider mb-0.5">{label}</p>
      {href ? (
        <a href={href} className="text-gray-900 dark:text-white text-sm font-medium hover:text-green-400 transition-colors break-words">
          {value}
        </a>
      ) : (
        <p className="text-gray-900 dark:text-white text-sm font-medium">{value}</p>
      )}
    </div>
  </div>
);

const InfoPage = () => {
  const [activeId, setActiveId] = useState('about');

  // Highlight whichever section is currently in view in the side nav.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 pt-10 pb-4">
        <p className="text-green-400 text-xs uppercase tracking-[0.3em] mb-2">spotNplay</p>
        <h1 className="font-bebas text-4xl md:text-5xl tracking-wide">About, Legal &amp; Support</h1>
        <p className="text-gray-500 text-sm mt-2">Everything about who we are, how to reach us, and the policies that govern using spotNplay.</p>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-20 grid grid-cols-1 md:grid-cols-[180px_1fr] gap-10">
        {/* Side nav */}
        <nav className="hidden md:flex flex-col gap-1 sticky top-24 self-start">
          {NAV_ITEMS.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className={`text-sm px-3 py-2 rounded-lg transition-colors ${
                activeId === id
                  ? 'text-green-400 bg-green-400/10 font-medium'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Mobile quick nav */}
        <div className="flex md:hidden gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {NAV_ITEMS.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex-shrink-0 text-xs px-3 py-2 rounded-full border border-black/8 dark:border-white/8 text-gray-500 whitespace-nowrap"
            >
              {label}
            </a>
          ))}
        </div>

        {/* Content */}
        <div className="flex flex-col">
          <Section id="about" title="About Us">
            {/* TODO: replace with your actual registered business name and a
                couple of real sentences about the company/founders. */}
            <P>
              spotNplay is a sports social platform built to help players find games, book grounds, and connect with
              a local sports community. Whether it's a casual five-a-side football match or a full-scale tournament, spotNplay makes it easy to discover, join, and pay for sports events near you.
            </P>
            <P>
              spotNplay is owned and operated by CHAOSFYR Private Limited, registered in India. Our goal is simple:
              make it effortless for players and organizers to run and join sports events, without the usual
              back-and-forth of spreadsheets, cash collection, and group chats.
            </P>
            <Sub title="What We Do">
              <UL
                items={[
                  'Event discovery & booking — browse upcoming sports events and tournaments, including multi-activity events made up of several independent sub-events.',
                  'Online ticketing — secure ticket booking and payment for paid events, powered by Razorpay.',
                  'Ground & venue booking — find and reserve sports grounds, courts and venues.',
                  'Player & coach network — connect with other players, join groups, and find coaches near you.',
                ]}
              />
            </Sub>
            <Sub>
              <P>
                Follow us on{' '}
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline inline-flex items-center gap-1">
                  <InstagramIcon size={13} /> Instagram
                </a>{' '}
                for updates on upcoming events and tournaments.
              </P>
            </Sub>
          </Section>

          <Section id="contact-us" title="Contact Us">
            <P>
              Got a question about an event, a booking, a payment, or anything else? We're happy to help — reach out
              through any of the channels below.
            </P>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ContactRow icon={Mail} label="Email" value={CONTACT_EMAIL} href={`mailto:${CONTACT_EMAIL}`} />
              <ContactRow icon={Phone} label="Phone" value={CONTACT_PHONE} href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`} />
              <ContactRow icon={MapPin} label="Registered Address" value={CONTACT_ADDRESS} />
              <ContactRow icon={Clock} label="Support Hours" value={SUPPORT_HOURS} />
            </div>
            <P>
              For issues with a specific payment or booking, please email us with your registered mobile
              number/email, the event name, and the payment/ticket ID so we can look into it quickly. Logged-in
              users can also send feedback directly from the "Get in Touch" section at the bottom of the home page.
            </P>
          </Section>

          <Section id="privacy-policy" title="Privacy Policy">
            <P>
              This Privacy Policy explains how spotNplay ("we", "us", "our") collects, uses, stores and protects your
              information when you use our website and services (the "Platform"). By using the Platform, you agree
              to the collection and use of information in accordance with this policy.
            </P>

            <Sub title="1. Information We Collect">
              <UL
                items={[
                  'Account information — name, email address, phone number, password (stored encrypted), profile photo, and role (player, ground owner, coach, etc.).',
                  'Profile & activity data — sports preferences, groups joined, events created or joined, streaks, badges, and in-app activity.',
                  'Location data — approximate or precise location (with your permission) to show nearby players, grounds and venues on the map.',
                  'Booking & payment data — event/ground/court booking details, ticket purchases, and transaction status. Card, UPI and net-banking details are collected and processed directly by our payment partner, Razorpay, and are never stored on our servers.',
                  'Communications — messages sent through in-app chat, group chat, and any support/contact messages you send us.',
                  'Technical data — IP address, device/browser type, and usage logs, collected automatically for security and analytics.',
                ]}
              />
            </Sub>

            <Sub title="2. How We Use Your Information">
              <UL
                items={[
                  'To create and manage your account, and to authenticate you (including OTP-based email/phone verification).',
                  'To let you discover, join, book and pay for events, grounds, and coaching sessions.',
                  'To process payments securely through Razorpay and send you booking confirmations, tickets and receipts.',
                  'To show you relevant nearby players, grounds, coaches and events based on your location.',
                  'To send booking confirmations, reminders, tickets and important account notifications by email, SMS and in-app notification.',
                  'To detect, prevent and investigate fraud, abuse, or violations of our Terms & Conditions.',
                  'To respond to your support requests and improve the Platform.',
                ]}
              />
            </Sub>

            <Sub title="3. How We Share Your Information">
              <P>We do not sell your personal information. We share information only in the following circumstances:</P>
              <UL
                items={[
                  'With Razorpay, our payment gateway partner, to process payments and refunds securely.',
                  'With the organizer of an event or the owner of a ground/venue you book, limited to the details needed to identify and manage your booking (e.g., name, contact number, ticket status).',
                  'With other users, limited to what you choose to make visible on your profile (e.g., name, avatar) as part of the social/community features.',
                  'With service providers who help us operate the Platform (e.g., hosting, email/SMS delivery), under confidentiality obligations.',
                  'When required by law, court order, or to protect the rights, safety or property of spotNplay, our users, or the public.',
                ]}
              />
            </Sub>

            <Sub title="4. Data Storage & Security">
              <P>
                We take reasonable technical and organizational measures — including encryption of passwords and
                secure transmission (HTTPS) — to protect your information from unauthorized access, alteration,
                disclosure or destruction. However, no method of transmission or storage is 100% secure, and we
                cannot guarantee absolute security.
              </P>
            </Sub>

            <Sub title="5. Your Rights & Choices">
              <UL
                items={[
                  'You can access and update your profile information at any time from your account settings.',
                  'You can request deletion of your account and associated personal data by contacting us — see Contact Us above.',
                  'You can withdraw location permission at any time from your device/browser settings; some features (like nearby search) may not work without it.',
                  'You can opt out of non-essential email/SMS communications; we may still send essential transactional messages (e.g., booking confirmations, OTPs).',
                ]}
              />
            </Sub>

            <Sub title="6. Data Retention">
              <P>
                We retain your personal information for as long as your account is active or as needed to provide
                you services, comply with our legal obligations, resolve disputes, and enforce our agreements. You
                may request earlier deletion, subject to any legal retention requirements (e.g., transaction
                records).
              </P>
            </Sub>

            <Sub title="7. Children's Privacy">
              <P>
                The Platform is not intended for children under 13. If you believe a child has provided us with
                personal information without parental consent, please contact us so we can remove it.
              </P>
            </Sub>

            <Sub title="8. Changes to This Policy">
              <P>
                We may update this Privacy Policy from time to time. We will notify you of material changes by
                posting the updated policy on this page with a new "Last updated" date.
              </P>
            </Sub>

            {/* <Note>
              Note: This is a general-purpose template intended as a starting point for Razorpay/payment-gateway
              verification and everyday use. It is not legal advice. Please have it reviewed by a lawyer familiar
              with India's Digital Personal Data Protection Act, 2023 and IT Rules before relying on it, especially
              around consent, grievance-officer details, and data-retention timelines specific to your business.
            </Note> */}
          </Section>

          <Section id="terms-and-conditions" title="Terms & Conditions">
            <P>
              These Terms & Conditions ("Terms") govern your access to and use of spotNplay (the "Platform"),
              operated by [Your Company Legal Name]. By creating an account or using the Platform, you agree to be
              bound by these Terms. If you do not agree, please do not use the Platform.
            </P>

            <Sub title="1. Eligibility">
              <P>
                You must be at least 13 years old to create an account. By using the Platform, you confirm that the
                information you provide is accurate and that you have the legal capacity to enter into these Terms.
              </P>
            </Sub>

            <Sub title="2. Account Responsibility">
              <UL
                items={[
                  'You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.',
                  'You agree to provide accurate contact details (email/phone) — these are used to verify bookings and deliver tickets.',
                  'We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent activity.',
                ]}
              />
            </Sub>

            <Sub title="3. Events, Bookings & Tickets">
              <UL
                items={[
                  'Events (including multi-activity events made up of several sub-events) may be created by verified organizers and are reviewed for approval before appearing publicly.',
                  'When you join a free event or book a paid ticket, you receive a unique ticket ID, which may be checked at the venue by the organizer for entry.',
                  'Organizers are responsible for the accuracy of their event details (venue, timing, pricing, capacity) and for honoring bookings made through the Platform.',
                  'spotNplay acts as a platform connecting organizers and players, and is not itself the organizer of user-created events unless explicitly stated.',
                  'Ground/venue bookings are subject to the availability and policies of the respective venue/ground owner.',
                ]}
              />
            </Sub>

            <Sub title="4. Payments">
              <UL
                items={[
                  'All payments on the Platform are processed securely through our payment partner, Razorpay. We do not store your card, UPI or net-banking details.',
                  'Prices shown for paid events, sub-events and bookings are inclusive of applicable fees unless stated otherwise.',
                  'Refunds and cancellations are governed by the Refund & Cancellation Policy below.',
                ]}
              />
            </Sub>

            <Sub title="5. User Conduct">
              <P>You agree not to:</P>
              <UL
                items={[
                  'Use the Platform for any unlawful purpose or to harass, abuse or harm other users.',
                  'Create fake events, fake bookings, or misrepresent event details to solicit payments.',
                  "Attempt to bypass, disrupt, or reverse-engineer the Platform's security or payment systems.",
                  'Post false, defamatory, or infringing content in your profile, chats, or event listings.',
                ]}
              />
            </Sub>

            <Sub title="6. Content">
              <P>
                You retain ownership of content you upload (e.g., profile photos, event banners, chat messages), but
                grant spotNplay a limited license to display it on the Platform for the purpose of operating our
                services. We may remove content that violates these Terms.
              </P>
            </Sub>

            <Sub title="7. Limitation of Liability">
              <P>
                spotNplay is provided on an "as is" basis. To the maximum extent permitted by law, we are not liable
                for any indirect, incidental, or consequential damages arising from your use of the Platform,
                including disputes between users, organizers, and venue owners. Our total liability for any claim
                shall not exceed the amount you paid us in the preceding 3 months, if any.
              </P>
            </Sub>

            <Sub title="8. Termination">
              <P>
                We may suspend or terminate your access to the Platform at any time for violation of these Terms,
                fraudulent activity, or at our discretion with reasonable notice where practicable.
              </P>
            </Sub>

            <Sub title="9. Governing Law">
              <P>
                These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive
                jurisdiction of the courts of [Your City], India.
              </P>
            </Sub>

            <Sub title="10. Changes to These Terms">
              <P>
                We may update these Terms from time to time. Continued use of the Platform after changes take
                effect constitutes acceptance of the revised Terms.
              </P>
            </Sub>

            {/* <Note>
              Note: This is a general-purpose template intended as a starting point for Razorpay/payment-gateway
              verification and everyday use. It is not legal advice — please have a lawyer review it before relying
              on it, particularly the liability, governing-law and jurisdiction clauses.
            </Note> */}
          </Section>

          <Section id="refund-policy" title="Refund & Cancellation Policy">
            <P>
              This policy explains how cancellations and refunds work for paid events, sub-event tickets, and
              ground/venue bookings made through spotNplay. All payments are processed via Razorpay; refunds (where
              applicable) are issued to your original payment method.
            </P>

            <Sub title="1. Event & Sub-Event Ticket Cancellations (by you)">
              <UL
                items={[
                  'You can cancel a free or paid booking any time before the event starts from the event/sub-event page ("Leave Event" / "Cancel Booking").',
                  "If you cancel a paid ticket more than 24 hours before the event's scheduled start time, you are eligible for a full refund, minus any payment gateway charges already incurred.",
                  'Cancellations made less than 24 hours before the event start time are not eligible for a refund, since organizers plan capacity and logistics based on confirmed bookings.',
                  'No refunds are issued for no-shows (not attending an event you booked and did not cancel in advance).',
                ]}
              />
            </Sub>

            <Sub title="2. Event Cancelled or Rescheduled by the Organizer">
              <UL
                items={[
                  'If an event or sub-event is cancelled by its organizer or by spotNplay (e.g., due to a policy violation), all participants with a paid ticket receive a full refund automatically initiated by our team.',
                  'If an event is rescheduled, your existing ticket remains valid for the new date/time. If the new date does not work for you, you may request a full refund by contacting us within 48 hours of the reschedule notice.',
                ]}
              />
            </Sub>

            <Sub title="3. Ground & Venue Bookings">
              <UL
                items={[
                  'Cancellation windows and refund eligibility for ground/venue/court bookings may vary by venue and are shown at the time of booking.',
                  'Bookings cancelled within the allowed window receive a full or partial refund as specified on the booking page; bookings cancelled after that window, or no-shows, are not eligible for a refund.',
                ]}
              />
            </Sub>

            <Sub title="4. Refund Processing Time">
              <P>
                Once a refund is approved, it is initiated within 2 business days. Depending on your bank or payment
                method, it typically takes 5–7 business days for the amount to reflect in your account, in line
                with Razorpay's standard refund timelines. You will receive an email confirmation once the refund
                is initiated.
              </P>
            </Sub>

            <Sub title="5. How to Request a Refund">
              <P>
                For cancellations within the eligible window, use the "Leave Event" / "Cancel Booking" option in the
                app — this is the fastest way and does not require contacting support. For all other refund
                requests (organizer cancellations, disputes, or issues with a booking), email us using the details
                in Contact Us above with your registered email/phone, the event name, and your ticket ID or payment
                reference.
              </P>
            </Sub>

            <Sub title="6. Failed / Duplicate Payments">
              <P>
                If an amount was debited from your account but your booking was not confirmed, or you were charged
                more than once for the same booking, please contact us with your payment reference — such amounts
                are refunded in full once verified, typically within 5–7 business days.
              </P>
            </Sub>

            <Sub title="7. Delivery of Tickets">
              <P>
                Tickets are a digital service — your ticket ID is issued instantly on successful payment/booking and
                is also emailed to your registered, verified email address. There is no physical shipping involved.
              </P>
            </Sub>

            {/* <Note>
              Note: This is a general-purpose template intended as a starting point for Razorpay/payment-gateway
              verification. Review and adjust the specific windows (24 hours, 5–7 business days, etc.) to match what
              your team can actually operationally support, and have it reviewed by a professional before relying
              on it.
            </Note> */}
          </Section>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default InfoPage;
