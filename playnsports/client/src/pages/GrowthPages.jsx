import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Briefcase, CheckCircle2, GraduationCap, Handshake, Loader2, Mail, MapPin, MessageCircle, Play, Send, Trophy, Users, X } from 'lucide-react';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import SearchableSportSelect from '../components/SearchableSportSelect';
import { useAuth } from '../context/AuthContext';
import { whatsappHref } from '../components/WhatsAppCTA';

const Page = ({ eyebrow, title, text, icon: Icon, children, cta }) => (
  <div className="min-h-screen bg-[#fcfcfc] text-gray-900 dark:bg-[#060606] dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
    <Navbar />
    <main>
      <section className="relative overflow-hidden border-b border-black/5 px-4 py-16 dark:border-white/5 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(74,222,128,0.18),transparent_32%)]" />
        <div className="relative mx-auto max-w-6xl">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.28em] text-green-500">{eyebrow}</p>
          <div className="max-w-3xl">
            <h1 className="font-bebas text-6xl leading-none tracking-wide md:text-8xl">{title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-400">{text}</p>
            {cta && <div className="mt-7 flex flex-wrap gap-3">{cta}</div>}
          </div>
          {Icon && <Icon className="absolute right-0 top-0 hidden text-green-400/20 md:block" size={180} strokeWidth={1} />}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-12">{children}</section>
    </main>
    <Footer />
  </div>
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
};

// Shared control styling for every public growth form.
const controlClass = (error, extra = '') =>
  `rounded-xl border bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:ring-4 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-gray-500 ${
    error
      ? 'border-red-400 focus:border-red-400 focus:ring-red-400/15'
      : 'border-black/10 focus:border-green-400 focus:ring-green-400/15 dark:border-white/10'
  }${extra ? ` ${extra}` : ''}`;

const inputClass = (error) => controlClass(error, 'w-full');

const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-2xl bg-green-400 px-5 py-3 text-sm font-black text-black transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-60';
const btnGhost = 'inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 px-5 py-3 text-sm font-bold text-gray-800 transition hover:border-green-400/50 hover:text-green-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-gray-200';
const btnSubmit = 'inline-flex items-center justify-center gap-2 rounded-xl bg-green-400 px-6 py-3.5 text-sm font-black text-black transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-60';
const btnCancel = 'inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 px-5 py-3.5 text-sm font-bold text-gray-800 transition hover:border-green-400/50 hover:text-green-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-gray-200';

const Field = ({ id, label, required, error, hint, children }) => (
  <div>
    <label htmlFor={id} className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
      {label}
      {required && <span className="ml-1 text-green-500" aria-hidden="true">*</span>}
    </label>
    {children}
    {error ? (
      <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500">
        <AlertCircle size={12} aria-hidden="true" /> {error}
      </p>
    ) : hint ? (
      <p id={`${id}-hint`} className="mt-1.5 text-xs text-gray-400">{hint}</p>
    ) : null}
  </div>
);

const FormAlert = ({ tone = 'error', onDismiss, children }) => {
  const success = tone === 'success';
  const Icon = success ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={success ? 'status' : 'alert'}
      className={`flex items-start gap-2 rounded-2xl border p-3.5 text-sm ${
        success
          ? 'border-green-400/30 bg-green-400/10 text-green-600 dark:text-green-400'
          : 'border-red-400/30 bg-red-400/10 text-red-500'
      }`}
    >
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span className="flex-1">{children}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 rounded p-0.5 opacity-70 transition hover:opacity-100">
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

const PrimaryLink = ({ to, href, children }) => {
  const cls = btnPrimary;
  return to ? <Link to={to} className={cls}>{children}</Link> : <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>;
};

const GhostLink = ({ to, href, children }) => {
  const cls = btnGhost;
  return to ? <Link to={to} className={cls}>{children}</Link> : <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>;
};

const useSettings = () => {
  const [settings, setSettings] = useState({});
  useEffect(() => { API.get('/site/settings').then(({ data }) => setSettings(data)).catch(() => {}); }, []);
  return settings;
};

const LivePage = () => {
  const [events, setEvents] = useState([]);
  const [challenges, setChallenges] = useState([]);
  useEffect(() => {
    API.get('/site/live').then(({ data }) => {
      setEvents(data.events || []);
      setChallenges(data.challenges || []);
    }).catch(() => { setEvents([]); setChallenges([]); });
  }, []);
  const streams = [
    ...events.map((e) => ({ id: e._id, title: e.title, label: e.gameTitle || e.sport, href: e.streamUrl, type: 'Event', to: `/events/${e._id}` })),
    ...challenges.map((c) => ({ id: c._id, title: c.title, label: c.gameTitle || c.sport || c.category, href: c.streamUrl, type: 'Challenge', to: `/challenges/${c._id}` })),
  ];
  return (
    <Page eyebrow="Live streaming" title="Watch the action live." text="Streams from approved events and active challenges appear here when organizers add a safe stream link." icon={Play}
      cta={<PrimaryLink to="/challenges"><Trophy size={17} /> Join challenges</PrimaryLink>}>
      <div className="grid gap-4 md:grid-cols-2">
        {streams.length === 0 ? <p className="text-gray-500">No live stream links are active right now.</p> : streams.map((s) => (
          <div key={`${s.type}-${s.id}`} className="rounded-3xl border border-black/10 p-5 dark:border-white/10">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-green-500">{s.type} · {s.label}</p>
            <h2 className="mt-2 text-2xl font-black">{s.title}</h2>
            <div className="mt-5 flex gap-3"><PrimaryLink href={s.href}><Play size={16} /> Watch</PrimaryLink><GhostLink to={s.to}>Details</GhostLink></div>
          </div>
        ))}
      </div>
    </Page>
  );
};

const LPU_DOMAINS = ['lpu.in', 'student.lpu.in'];
const LPU_EMAIL_HINT = `Use your LPU email, e.g. yourname@${LPU_DOMAINS[0]} or yourname@${LPU_DOMAINS[1]}.`;

const LpuVerificationPage = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    email: user?.lpuEmail || '',
    registrationNumber: user?.lpuRegistrationNumber || '',
    otp: '',
  });
  const [stage, setStage] = useState('idle');
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [serverError, setServerError] = useState('');
  const [notice, setNotice] = useState('');

  const verified = !!user?.lpuVerified || stage === 'verified';
  const busy = status === 'sending' || status === 'verifying';

  const update = (key) => (e) => {
    const { value } = e.target;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
    setServerError('');
  };

  const emailError = () => {
    const email = form.email.trim().toLowerCase();
    if (!email) return 'Enter your LPU email address.';
    if (!EMAIL_RE.test(email)) return 'That email address looks incomplete.';
    if (!LPU_DOMAINS.some((domain) => email.endsWith(`@${domain}`))) {
      return `Use an LPU email ending in @${LPU_DOMAINS.join(' or @')}.`;
    }
    return '';
  };

  const send = async (e) => {
    e?.preventDefault();
    if (busy) return;
    setServerError('');
    setNotice('');
    const error = emailError();
    if (error) {
      setErrors({ email: error });
      document.getElementById('lpu-email')?.focus();
      return;
    }
    setErrors({});
    setStatus('sending');
    try {
      const { data } = await API.post('/lpu/send-otp', {
        email: form.email.trim().toLowerCase(),
        registrationNumber: form.registrationNumber.trim(),
      });
      setForm((f) => ({ ...f, otp: '' }));
      setNotice(data?.message || 'OTP sent to your LPU email.');
      setStage('sent');
      setStatus('idle');
      window.setTimeout(() => document.getElementById('lpu-otp')?.focus(), 0);
    } catch (err) {
      setStatus('idle');
      setServerError(err?.response?.data?.message || 'We could not send the OTP. Please try again.');
    }
  };

  const verify = async (e) => {
    e?.preventDefault();
    if (busy) return;
    setServerError('');
    setNotice('');
    const otp = form.otp.replace(/\D/g, '');
    if (otp.length !== 6) {
      setErrors({ otp: 'Enter the 6-digit code from your email.' });
      document.getElementById('lpu-otp')?.focus();
      return;
    }
    setErrors({});
    setStatus('verifying');
    try {
      const { data } = await API.post('/lpu/verify-otp', {
        email: form.email.trim().toLowerCase(),
        registrationNumber: form.registrationNumber.trim(),
        otp,
      });
      updateUser?.({
        lpuVerified: data?.lpuVerified ?? true,
        lpuEmail: data?.lpuEmail || form.email.trim().toLowerCase(),
        lpuRegistrationNumber: data?.lpuRegistrationNumber || form.registrationNumber.trim(),
        lpuVerificationStatus: data?.lpuVerificationStatus || 'verified',
        lpuVerifiedAt: data?.lpuVerifiedAt,
      });
      setNotice(data?.message || 'LPU verification complete.');
      setStage('verified');
      setStatus('idle');
    } catch (err) {
      setStatus('idle');
      setServerError(err?.response?.data?.message || 'That code did not work. Please try again or resend it.');
    }
  };

  const changeEmail = () => {
    setStage('idle');
    setErrors({});
    setServerError('');
    setNotice('');
    setForm((f) => ({ ...f, otp: '' }));
    window.setTimeout(() => document.getElementById('lpu-email')?.focus(), 0);
  };

  return (
    <>
      <SEO title="LPU Verification" description="Verify your LPU email to unlock campus-only challenges, badges and trusted community access on spotNplay." canonical="/lpu-verification" noindex />
      <Page eyebrow="LPU verification" title="Verify your LPU community access." text="Use your institutional email to unlock LPU-only challenges, badges and campus trust signals." icon={GraduationCap}>
        <div className="max-w-xl rounded-3xl border border-black/10 bg-white p-6 shadow-[0_24px_70px_-55px_rgba(0,0,0,0.6)] dark:border-white/10 dark:bg-white/[0.03] md:p-8">
          {verified ? (
            <div className="rounded-2xl border border-green-400/30 bg-green-400/[0.08] p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-400 text-black">
                  <CheckCircle2 size={22} strokeWidth={2.5} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-black">LPU verified</p>
                  <p className="break-words text-sm text-gray-600 dark:text-gray-300">{user?.lpuEmail || form.email || 'Your campus access is active.'}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
                LPU-only challenges, campus badges and trusted community signals are now unlocked on your account.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <PrimaryLink to="/challenges"><Trophy size={16} /> Browse challenges</PrimaryLink>
                <GhostLink to="/leaderboard">See leaderboard</GhostLink>
              </div>
            </div>
          ) : stage === 'sent' ? (
            <form onSubmit={verify} noValidate className="space-y-5">
              <div>
                <h2 className="text-xl font-black">Enter your verification code</h2>
                <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
                  We sent a 6-digit code to <strong className="break-words text-gray-900 dark:text-white">{form.email.trim().toLowerCase()}</strong>.
                </p>
                <button type="button" onClick={changeEmail} className="mt-1 text-xs font-bold text-green-500 transition hover:underline">
                  Use a different email
                </button>
              </div>

              <Field id="lpu-otp" label="6-digit code" required error={errors.otp} hint="The code expires in 10 minutes.">
                <input
                  id="lpu-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  value={form.otp}
                  onChange={(e) => {
                    const otp = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setForm((f) => ({ ...f, otp }));
                    setErrors((prev) => (prev.otp ? { ...prev, otp: '' } : prev));
                    setServerError('');
                  }}
                  aria-invalid={!!errors.otp}
                  aria-describedby={errors.otp ? 'lpu-otp-error' : 'lpu-otp-hint'}
                  className={`${inputClass(errors.otp)} text-center font-mono text-lg tracking-[0.4em]`}
                />
              </Field>

              {serverError && <FormAlert onDismiss={() => setServerError('')}>{serverError}</FormAlert>}
              {notice && <FormAlert tone="success">{notice}</FormAlert>}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="submit" disabled={busy} className={`${btnSubmit} sm:flex-1`}>
                  {status === 'verifying' ? (
                    <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Verifying...</>
                  ) : (
                    <><CheckCircle2 size={16} aria-hidden="true" /> Verify OTP</>
                  )}
                </button>
                <button type="button" onClick={send} disabled={busy} className={btnCancel}>
                  {status === 'sending' ? (
                    <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Resending...</>
                  ) : (
                    'Resend code'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={send} noValidate className="space-y-5">
              <div>
                <h2 className="text-xl font-black">Verify with your LPU email</h2>
                <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
                  We email a one-time code. Your address is only used for verification and is never shown publicly.
                </p>
              </div>

              <Field id="lpu-email" label="LPU email" required error={errors.email} hint={LPU_EMAIL_HINT}>
                <input
                  id="lpu-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="yourname@lpu.in"
                  maxLength={120}
                  value={form.email}
                  onChange={update('email')}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'lpu-email-error' : 'lpu-email-hint'}
                  className={inputClass(errors.email)}
                />
              </Field>

              <Field id="lpu-registration" label="Registration number" hint="Optional - helps us match campus records.">
                <input
                  id="lpu-registration"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. 12345678"
                  maxLength={40}
                  value={form.registrationNumber}
                  onChange={update('registrationNumber')}
                  aria-describedby="lpu-registration-hint"
                  className={inputClass(false)}
                />
              </Field>

              {serverError && <FormAlert onDismiss={() => setServerError('')}>{serverError}</FormAlert>}
              {notice && <FormAlert tone="success">{notice}</FormAlert>}

              <button type="submit" disabled={busy} className={`${btnSubmit} w-full`}>
                {status === 'sending' ? (
                  <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Sending code...</>
                ) : (
                  <><Send size={16} aria-hidden="true" /> Send verification code</>
                )}
              </button>
            </form>
          )}
        </div>
      </Page>
    </>
  );
};

const EMPTY_APPLICATION = { name: '', email: '', phone: '', resumeUrl: '', message: '' };

const CareersPage = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_APPLICATION);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState('');

  const submitting = status === 'submitting';

  useEffect(() => {
    let alive = true;
    API.get('/site/careers')
      .then(({ data }) => { if (alive) setJobs(Array.isArray(data) ? data : []); })
      .catch(() => { if (alive) setJobs([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const openApplication = (job) => {
    setSelected(job);
    setErrors({});
    setServerError('');
    setStatus('idle');
    setForm({ ...EMPTY_APPLICATION, name: user?.name || '', email: user?.email || '' });
    window.setTimeout(() => document.getElementById('apply-name')?.focus(), 0);
  };

  const closeApplication = () => {
    setSelected(null);
    setErrors({});
    setServerError('');
    setStatus('idle');
  };

  useEffect(() => {
    if (!selected) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closeApplication(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected]);

  const update = (key) => (e) => {
    const { value } = e.target;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
    setServerError('');
  };

  const validate = () => {
    const next = {};
    const digits = form.phone.replace(/\D/g, '');
    if (form.name.trim().length < 2) next.name = 'Please enter your full name.';
    if (!form.email.trim()) next.email = 'We need an email address to reply to you.';
    else if (!EMAIL_RE.test(form.email.trim())) next.email = 'That email address looks incomplete.';
    if (form.phone.trim() && (digits.length < 7 || digits.length > 15)) next.phone = 'Enter a valid phone number, or leave this blank.';
    if (form.resumeUrl.trim() && !isHttpUrl(form.resumeUrl.trim())) next.resumeUrl = 'Use a full link starting with http:// or https://.';
    return next;
  };

  const apply = async (e) => {
    e.preventDefault();
    if (submitting || !selected) return;
    setServerError('');
    const next = validate();
    setErrors(next);
    const firstInvalid = Object.keys(next)[0];
    if (firstInvalid) {
      document.getElementById(`apply-${firstInvalid}`)?.focus();
      return;
    }
    setStatus('submitting');
    try {
      const email = form.email.trim().toLowerCase();
      await API.post(`/site/careers/${selected._id}/apply`, {
        name: form.name.trim(),
        email,
        phone: form.phone.trim(),
        resumeUrl: form.resumeUrl.trim(),
        message: form.message.trim(),
      });
      setDone(`Application received for ${selected.title}. We will reply to ${email}.`);
      setForm(EMPTY_APPLICATION);
      closeApplication();
    } catch (err) {
      setStatus('idle');
      setServerError(err?.response?.data?.message || 'We could not submit your application. Please try again.');
    }
  };

  const careersJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'spotNplay',
    url: 'https://spot-n-play.com',
    hiringOrganization: { '@type': 'Organization', name: 'spotNplay' },
  };

  return (
    <>
      <SEO title="Careers at spotNplay" description="Join spotNplay — build the sports network for campuses. Open roles in product, operations, community and partnerships." canonical="/careers" jsonLd={careersJsonLd} />
      <Page eyebrow="We are hiring" title="Build the sports network for campuses." text="Join spotNplay across product, operations, community and partnerships." icon={Briefcase}>
        {done && (
          <div className="mb-5">
            <FormAlert tone="success" onDismiss={() => setDone('')}>{done}</FormAlert>
          </div>
        )}

        <div className="grid gap-4">
          {loading ? (
            <p className="flex items-center gap-2 text-gray-500"><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Loading open roles...</p>
          ) : jobs.length === 0 ? (
            <div className="rounded-3xl border border-black/10 p-6 dark:border-white/10">
              <p className="font-bold">No open roles right now.</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                We are always happy to meet organizers and builders. Send a note through the collaborate page and we will keep you in mind.
              </p>
              <div className="mt-4"><GhostLink to="/collaborate">Get in touch</GhostLink></div>
            </div>
          ) : jobs.map((job) => (
            <div key={job._id} className="flex flex-col gap-4 border-t border-black/10 py-5 dark:border-white/10 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-2xl font-black">{job.title}</p>
                <p className="text-sm text-gray-500">{[job.department, job.location, job.type].filter(Boolean).join(' · ')}</p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400">{job.description}</p>
              </div>
              <button type="button" className={`${btnPrimary} shrink-0`} onClick={() => openApplication(job)}>
                Apply <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        {selected && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8 md:items-center"
            onMouseDown={(e) => { if (e.target === e.currentTarget) closeApplication(); }}
          >
            <div role="dialog" aria-modal="true" aria-labelledby="apply-title" className="w-full max-w-lg rounded-3xl border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#101010] md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-green-500">Application</p>
                  <h2 id="apply-title" className="mt-1 text-2xl font-black leading-tight">Apply for {selected.title}</h2>
                  <p className="mt-1 text-xs text-gray-500">{[selected.department, selected.location, selected.type].filter(Boolean).join(' · ')}</p>
                </div>
                <button
                  type="button"
                  onClick={closeApplication}
                  aria-label="Close application form"
                  className="shrink-0 rounded-xl border border-black/10 p-2 text-gray-500 transition hover:border-green-400/50 hover:text-green-500 dark:border-white/10"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>

              <form onSubmit={apply} noValidate className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="apply-name" label="Full name" required error={errors.name}>
                    <input
                      id="apply-name"
                      type="text"
                      autoComplete="name"
                      placeholder="e.g. Aarav Sharma"
                      maxLength={80}
                      value={form.name}
                      onChange={update('name')}
                      aria-invalid={!!errors.name}
                      aria-describedby={errors.name ? 'apply-name-error' : undefined}
                      className={inputClass(errors.name)}
                    />
                  </Field>

                  <Field id="apply-email" label="Email" required error={errors.email}>
                    <input
                      id="apply-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      maxLength={120}
                      value={form.email}
                      onChange={update('email')}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? 'apply-email-error' : undefined}
                      className={inputClass(errors.email)}
                    />
                  </Field>
                </div>

                <Field id="apply-phone" label="Phone" error={errors.phone} hint="Optional - fastest way to reach you.">
                  <input
                    id="apply-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                    maxLength={20}
                    value={form.phone}
                    onChange={update('phone')}
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? 'apply-phone-error' : 'apply-phone-hint'}
                    className={inputClass(errors.phone)}
                  />
                </Field>

                <Field id="apply-resumeUrl" label="Resume or profile link" error={errors.resumeUrl} hint="Optional - Google Drive, LinkedIn or portfolio.">
                  <input
                    id="apply-resumeUrl"
                    type="url"
                    inputMode="url"
                    placeholder="https://drive.google.com/..."
                    maxLength={500}
                    value={form.resumeUrl}
                    onChange={update('resumeUrl')}
                    aria-invalid={!!errors.resumeUrl}
                    aria-describedby={errors.resumeUrl ? 'apply-resumeUrl-error' : 'apply-resumeUrl-hint'}
                    className={inputClass(errors.resumeUrl)}
                  />
                </Field>

                <Field id="apply-message" label="Message">
                  <textarea
                    id="apply-message"
                    rows={3}
                    placeholder="Anything we should know? Projects, availability or links."
                    maxLength={1000}
                    value={form.message}
                    onChange={update('message')}
                    className={`${inputClass(false)} resize-y`}
                  />
                </Field>

                {serverError && <FormAlert onDismiss={() => setServerError('')}>{serverError}</FormAlert>}

                <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                  <button type="submit" disabled={submitting} className={`${btnSubmit} sm:flex-1`}>
                    {submitting ? (
                      <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Submitting...</>
                    ) : (
                      <><Send size={16} aria-hidden="true" /> Submit application</>
                    )}
                  </button>
                  <button type="button" onClick={closeApplication} disabled={submitting} className={btnCancel}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </Page>
    </>
  );
};

const FAQPage = () => {
  const [faqs, setFaqs] = useState([]);
  useEffect(() => { API.get('/site/faqs').then(({ data }) => setFaqs(data)).catch(() => setFaqs([])); }, []);
  const groups = useMemo(() => faqs.reduce((acc, f) => ({ ...acc, [f.category || 'General']: [...(acc[f.category || 'General'] || []), f] }), {}), [faqs]);
  const faqJsonLd = faqs.length ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.slice(0, 20).map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
  } : null;
  return (
    <>
      <SEO title="FAQ — Answers before kickoff" description="spotNplay FAQ — how to book grounds, find players, verify LPU, join challenges, stream events and download the Android app." canonical="/faq" jsonLd={faqJsonLd} />
      <Page eyebrow="FAQ" title="Answers before kickoff." text="Platform usage, verification, challenges, streaming and app download questions in one place." icon={CheckCircle2}>
      {Object.keys(groups).length === 0 ? <p className="text-gray-500">FAQs are being prepared.</p> : Object.entries(groups).map(([category, items]) => (
        <div key={category} className="mb-8"><h2 className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-green-500">{category}</h2>{items.map((f) => <details key={f._id} className="border-t border-black/10 py-4 dark:border-white/10"><summary className="cursor-pointer font-bold">{f.question}</summary><p className="mt-3 text-gray-600 dark:text-gray-400">{f.answer}</p></details>)}</div>
      ))}
      </Page>
    </>
  );
};

const INQUIRY_TYPES = [
  { value: 'Partnership', label: 'Partnership', hint: 'Long-term collaboration', icon: Handshake },
  { value: 'Sponsorship', label: 'Sponsorship', hint: 'Events, teams and prizes', icon: Trophy },
  { value: 'College event', label: 'College event', hint: 'Campus tournaments', icon: GraduationCap },
  { value: 'Venue onboarding', label: 'Venue onboarding', hint: 'List your ground or court', icon: MapPin },
];

const EMPTY_ENQUIRY = {
  name: '',
  organization: '',
  email: '',
  phone: '',
  inquiryType: 'Partnership',
  message: '',
};

const CollaboratePage = () => {
  const settings = useSettings();
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_ENQUIRY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [serverError, setServerError] = useState('');
  const [sentTo, setSentTo] = useState('');

  // Signed-in visitors should not have to retype what we already know.
  useEffect(() => {
    if (!user) return;
    setForm((f) => (f.name || f.email ? f : { ...f, name: user.name || '', email: user.email || '' }));
  }, [user]);

  const update = (key) => (e) => {
    const { value } = e.target;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const validate = () => {
    const next = {};
    const digits = form.phone.replace(/\D/g, '');
    if (form.name.trim().length < 2) next.name = 'Please enter your full name.';
    if (!form.email.trim()) next.email = 'We need an email address to reply to you.';
    else if (!EMAIL_RE.test(form.email.trim())) next.email = 'That email address looks incomplete.';
    if (form.phone.trim() && (digits.length < 7 || digits.length > 15)) next.phone = 'Enter a valid phone number, or leave this blank.';
    if (form.message.trim().length < 10) next.message = 'Please add at least 10 characters so we can help.';
    return next;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (status === 'sending') return;

    const next = validate();
    setErrors(next);
    setServerError('');
    const firstInvalid = Object.keys(next)[0];
    if (firstInvalid) {
      document.getElementById(`collab-${firstInvalid}`)?.focus();
      return;
    }

    setStatus('sending');
    try {
      await API.post('/site/collaborate', {
        name: form.name.trim(),
        organization: form.organization.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        inquiryType: form.inquiryType,
        message: form.message.trim(),
      });
      setSentTo(form.email.trim());
      setForm(EMPTY_ENQUIRY);
      setStatus('sent');
    } catch (err) {
      setStatus('failed');
      setServerError(err?.response?.data?.message || 'We could not send your enquiry. Please try again, or email us directly below.');
    }
  };

  const reset = () => {
    setForm({ ...EMPTY_ENQUIRY, name: user?.name || '', email: user?.email || '' });
    setErrors({});
    setServerError('');
    setStatus('idle');
  };

  const whatsapp = settings.whatsappNumber ? whatsappHref(settings) : '';
  const contactEmail = settings.collaborationEmail || 'spotnplayofficial@gmail.com';
  const sending = status === 'sending';
  return (
    <>
      <SEO title="Collaborate with spotNplay" description="Partner with spotNplay — sponsorships, college events, venue onboarding and brand collaborations. Let's build the sports network together." canonical="/collaborate" />
      <Page eyebrow="Collaborate" title="Partner with spotNplay." text="For sponsors, colleges, sports organizers, brands and venue partners." icon={Users}
      cta={whatsapp ? <GhostLink href={whatsapp}><MessageCircle size={17} /> Chat on WhatsApp</GhostLink> : <GhostLink href={`mailto:${contactEmail}`}><Mail size={17} /> Email the team</GhostLink>}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:items-start">
          {status === 'sent' ? (
            <section aria-live="polite" className="rounded-3xl border border-green-400/30 bg-green-400/[0.06] p-8 text-center md:p-12">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-400 text-black">
                <CheckCircle2 size={30} strokeWidth={2.5} aria-hidden="true" />
              </div>
              <h2 className="font-bebas text-4xl tracking-wide">Enquiry sent.</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-600 dark:text-gray-300">
                Thanks for reaching out. Our partnerships team will reply to{' '}
                <span className="font-bold break-words text-gray-900 dark:text-white">{sentTo}</span>{' '}
                within 1-2 business days.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl bg-green-400 px-5 py-3 text-sm font-black text-black transition hover:bg-green-300">
                  Send another enquiry
                </button>
                {whatsapp && (
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-5 py-3 text-sm font-bold text-gray-800 transition hover:border-green-400/50 hover:text-green-500 dark:border-white/10 dark:text-gray-200">
                    <MessageCircle size={16} /> Chat on WhatsApp
                  </a>
                )}
              </div>
            </section>
          ) : (
            <form onSubmit={submit} noValidate className="rounded-3xl border border-black/10 bg-white p-6 shadow-[0_24px_70px_-55px_rgba(0,0,0,0.6)] dark:border-white/10 dark:bg-white/[0.03] md:p-8">
              <h2 className="text-xl font-black">Tell us about you</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Fields marked <span className="text-green-500">*</span> are required.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field id="collab-name" label="Your name" required error={errors.name}>
                  <input
                    id="collab-name"
                    type="text"
                    autoComplete="name"
                    placeholder="e.g. Aarav Sharma"
                    maxLength={80}
                    value={form.name}
                    onChange={update('name')}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'collab-name-error' : undefined}
                    className={inputClass(errors.name)}
                  />
                </Field>

                <Field id="collab-organization" label="Organization" hint="Optional - college, brand or club.">
                  <input
                    id="collab-organization"
                    type="text"
                    autoComplete="organization"
                    placeholder="e.g. LPU Sports Club"
                    maxLength={120}
                    value={form.organization}
                    onChange={update('organization')}
                    aria-describedby="collab-organization-hint"
                    className={inputClass(false)}
                  />
                </Field>

                <Field id="collab-email" label="Email" required error={errors.email}>
                  <input
                    id="collab-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    maxLength={120}
                    value={form.email}
                    onChange={update('email')}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'collab-email-error' : undefined}
                    className={inputClass(errors.email)}
                  />
                </Field>

                <Field id="collab-phone" label="Phone" error={errors.phone} hint="Optional - fastest way to reach you.">
                  <input
                    id="collab-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                    maxLength={20}
                    value={form.phone}
                    onChange={update('phone')}
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? 'collab-phone-error' : 'collab-phone-hint'}
                    className={inputClass(errors.phone)}
                  />
                </Field>
              </div>

              <fieldset className="mt-6">
                <legend className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                  What is this about?<span className="ml-1 text-green-500" aria-hidden="true">*</span>
                </legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {INQUIRY_TYPES.map(({ value, label, hint, icon: Icon }) => {
                    const active = form.inquiryType === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, inquiryType: value }))}
                        aria-pressed={active}
                        className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                          active
                            ? 'border-green-400 bg-green-400/10'
                            : 'border-black/10 hover:border-green-400/50 dark:border-white/10'
                        }`}
                      >
                        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                          active ? 'bg-green-400 text-black' : 'bg-black/[0.04] text-gray-500 dark:bg-white/10 dark:text-gray-300'
                        }`}>
                          <Icon size={16} aria-hidden="true" />
                        </span>
                        <span>
                          <span className={`block text-sm font-bold ${active ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>{label}</span>
                          <span className="block text-xs text-gray-500 dark:text-gray-400">{hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="mt-6">
                <Field id="collab-message" label="Your message" required error={errors.message}>
                  <textarea
                    id="collab-message"
                    rows={5}
                    placeholder="What would you like to build with us? Share dates, scale and anything else useful."
                    maxLength={2000}
                    value={form.message}
                    onChange={update('message')}
                    aria-invalid={!!errors.message}
                    aria-describedby={errors.message ? 'collab-message-error' : undefined}
                    className={`${inputClass(errors.message)} resize-y`}
                  />
                </Field>
                <p className="mt-1.5 text-right text-[11px] text-gray-400">{form.message.length}/2000</p>
              </div>

              {serverError && (
                <div role="alert" className="mt-4 flex items-start gap-2 rounded-2xl border border-red-400/30 bg-red-400/10 p-3.5 text-sm text-red-500">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{serverError}</span>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-400 px-6 py-3.5 text-sm font-black text-black transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Sending...
                    </>
                  ) : (
                    <>
                      Send enquiry <Send size={16} aria-hidden="true" />
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-400">We reply within 1-2 business days.</p>
              </div>
            </form>
          )}

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-3xl border border-black/10 p-6 dark:border-white/10">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-green-500">What happens next</p>
              <ol className="mt-4 space-y-4">
                {[
                  { title: 'We review your enquiry', text: 'Our team reads every message, usually the same day.' },
                  { title: 'We reply', text: 'You will hear from us within 1-2 business days.' },
                  { title: 'We plan it together', text: 'A short call to align on scope, dates and next steps.' },
                ].map((step, i) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-green-400/40 text-xs font-black text-green-500">
                      {i + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-bold">{step.title}</span>
                      <span className="block text-xs leading-5 text-gray-500 dark:text-gray-400">{step.text}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-3xl border border-black/10 p-6 dark:border-white/10">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-green-500">Prefer to talk?</p>
              <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                Message us directly and we will pick it up from there.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {whatsapp && (
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between gap-3 rounded-xl border border-black/10 px-4 py-3 text-sm font-bold transition hover:border-green-400/50 hover:text-green-500 dark:border-white/10">
                    <span className="flex items-center gap-2"><MessageCircle size={16} /> WhatsApp</span>
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </a>
                )}
                <a href={`mailto:${contactEmail}`} className="group flex items-center justify-between gap-3 rounded-xl border border-black/10 px-4 py-3 text-sm font-bold transition hover:border-green-400/50 hover:text-green-500 dark:border-white/10">
                  <span className="flex items-center gap-2 break-words"><Mail size={16} className="shrink-0" /> {contactEmail}</span>
                  <ArrowRight size={15} className="shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </a>
              </div>
            </div>
          </aside>
        </div>
      </Page>
    </>
  );
};

const SCORING_LABELS = { manual: 'Manual review', time: 'Fastest time', points: 'Most points' };

const EMPTY_CHALLENGE = {
  title: '',
  category: 'sports',
  sport: '',
  gameTitle: '',
  description: '',
  rules: '',
  challengeType: 'solo',
  scoringType: 'points',
  startDate: '',
  endDate: '',
  registrationDeadline: '',
  maxParticipants: '',
  entryFee: '',
  prizePool: '',
  streamUrl: '',
  lpuOnly: false,
};

const ChallengesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState({ category: '', status: '', lpuOnly: false });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [form, setForm] = useState(EMPTY_CHALLENGE);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState('');
  const creating = status === 'creating';

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams();
    if (filter.category) params.set('category', filter.category);
    if (filter.status) params.set('status', filter.status);
    if (filter.lpuOnly) params.set('lpuOnly', 'true');
    setLoading(true);
    setLoadError('');
    API.get(`/challenges?${params.toString()}`)
      .then(({ data }) => { if (alive) setItems(Array.isArray(data) ? data : []); })
      .catch(() => { if (alive) { setItems([]); setLoadError('We could not load challenges. Please refresh the page.'); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [filter.category, filter.status, filter.lpuOnly, reloadKey]);

  const update = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
    setServerError('');
    setSuccess('');
  };

  const validate = () => {
    const next = {};
    if (form.title.trim().length < 3) next.title = 'Give your challenge a title (at least 3 characters).';
    if (form.description.trim().length < 10) next.description = 'Add at least 10 characters describing the challenge.';
    if (!form.startDate) next.startDate = 'Pick a start date.';
    if (!form.endDate) next.endDate = 'Pick an end date.';
    else if (form.startDate && form.endDate < form.startDate) next.endDate = 'The end date cannot be before the start date.';
    if (form.registrationDeadline && form.startDate && form.registrationDeadline > form.startDate) {
      next.registrationDeadline = 'Registration must close on or before the start date.';
    }
    if (form.streamUrl.trim() && !isHttpUrl(form.streamUrl.trim())) next.streamUrl = 'Use a full link starting with http:// or https://.';
    ['maxParticipants', 'entryFee', 'prizePool'].forEach((key) => {
      if (form[key] === '') return;
      if (!Number.isFinite(Number(form[key]))) next[key] = 'Enter a number.';
      else if (Number(form[key]) < 0) next[key] = 'Use 0 or a positive number.';
    });
    return next;
  };

  const create = async (e) => {
    e.preventDefault();
    if (creating) return;
    setServerError('');
    setSuccess('');
    const next = validate();
    setErrors(next);
    const firstInvalid = Object.keys(next)[0];
    if (firstInvalid) {
      document.getElementById(`challenge-${firstInvalid}`)?.focus();
      return;
    }
    setStatus('creating');
    try {
      await API.post('/challenges', {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        rules: form.rules.trim(),
        gameTitle: form.gameTitle.trim(),
        streamUrl: form.streamUrl.trim(),
        maxParticipants: Number(form.maxParticipants) || 0,
        entryFee: Number(form.entryFee) || 0,
        prizePool: Number(form.prizePool) || 0,
      });
      setForm(EMPTY_CHALLENGE);
      setErrors({});
      setStatus('idle');
      setSuccess('Challenge submitted for approval. It appears in this list once our team approves it.');
      setReloadKey((k) => k + 1);
    } catch (err) {
      setStatus('idle');
      setServerError(err?.response?.data?.message || 'We could not create the challenge. Please try again.');
    }
  };

  const resetFilters = () => setFilter({ category: '', status: '', lpuOnly: false });

  return (
    <Page eyebrow="Challenge mode" title="Compete, score, rank." text="Standalone sports and esports challenges with registrations, submissions, leaderboards and winners." icon={Trophy}>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <select
          aria-label="Filter by category"
          value={filter.category}
          onChange={(e) => setFilter({ ...filter, category: e.target.value })}
          className={controlClass(false, 'w-auto cursor-pointer')}
        >
          <option value="">All categories</option>
          <option value="sports">Sports</option>
          <option value="esports">Esports</option>
        </select>
        <select
          aria-label="Filter by status"
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className={controlClass(false, 'w-auto cursor-pointer')}
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="live">Live</option>
          <option value="completed">Completed</option>
        </select>
        <button
          type="button"
          aria-pressed={filter.lpuOnly}
          onClick={() => setFilter({ ...filter, lpuOnly: !filter.lpuOnly })}
          className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${
            filter.lpuOnly
              ? 'border-green-400 bg-green-400/10 text-green-600 dark:text-green-400'
              : 'border-black/10 text-gray-700 hover:border-green-400/50 dark:border-white/10 dark:text-gray-300'
          }`}
        >
          LPU only
        </button>
        {loadError && (
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="text-sm font-bold text-green-500 hover:underline">
            Try again
          </button>
        )}
      </div>

      {loadError ? (
        <FormAlert>{loadError}</FormAlert>
      ) : loading ? (
        <p className="flex items-center gap-2 text-gray-500"><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Loading challenges...</p>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-black/10 p-6 dark:border-white/10">
          <p className="font-bold">No challenges match these filters yet.</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {user ? 'Create one below, or widen the filters to see what is already running.' : 'Try widening the filters - new challenges are added regularly.'}
          </p>
          <button type="button" onClick={resetFilters} className={`${btnCancel} mt-4`}>Clear filters</button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((c) => (
            <button
              key={c._id}
              type="button"
              onClick={() => navigate(`/challenges/${c._id}`)}
              className="rounded-3xl border border-black/10 bg-white p-5 text-left transition hover:border-green-400/50 hover:shadow-[0_20px_50px_-40px_rgba(0,0,0,0.5)] dark:border-white/10 dark:bg-white/[0.03]"
            >
              <p className="text-xs font-black uppercase tracking-[0.18em] text-green-500">
                {c.category} · {c.status}{c.lpuOnly ? ' · LPU only' : ''}
              </p>
              <h2 className="mt-2 text-2xl font-black">{c.title}</h2>
              <p className="mt-2 text-sm text-gray-500">
                {c.gameTitle || c.sport || 'Open format'} · {c.participantCount || 0} participants · Prize ₹{c.prizePool || 0}
              </p>
              {(c.startDate || c.endDate) && (
                <p className="mt-3 text-xs text-gray-400">
                  {[c.startDate, c.endDate].filter(Boolean).join(' → ')}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {user && (
        <form onSubmit={create} noValidate className="mt-12 rounded-3xl border border-black/10 bg-white p-6 shadow-[0_24px_70px_-55px_rgba(0,0,0,0.6)] dark:border-white/10 dark:bg-white/[0.03] md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">Create a challenge</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                New challenges are reviewed by our team before they go live.
              </p>
            </div>
          </div>

          {success && <div className="mt-5"><FormAlert tone="success" onDismiss={() => setSuccess('')}>{success}</FormAlert></div>}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field id="challenge-title" label="Challenge title" required error={errors.title}>
                <input
                  id="challenge-title"
                  type="text"
                  placeholder="e.g. Sunday 5-a-side cup"
                  maxLength={120}
                  value={form.title}
                  onChange={update('title')}
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? 'challenge-title-error' : undefined}
                  className={inputClass(errors.title)}
                />
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field id="challenge-description" label="Description" required error={errors.description} hint="What is the challenge, and who is it for?">
                <textarea
                  id="challenge-description"
                  rows={3}
                  placeholder="e.g. 8 teams, knockout format, one day only. Bring your own kit."
                  maxLength={1000}
                  value={form.description}
                  onChange={update('description')}
                  aria-invalid={!!errors.description}
                  aria-describedby={errors.description ? 'challenge-description-error' : 'challenge-description-hint'}
                  className={`${inputClass(errors.description)} resize-y`}
                />
              </Field>
            </div>

            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-green-500 md:col-span-2">Format and scoring</p>

            <Field id="challenge-category" label="Category">
              <select
                id="challenge-category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, sport: '', gameTitle: '' }))}
                className={`${inputClass(false)} cursor-pointer`}
              >
                <option value="sports">Sports</option>
                <option value="esports">Esports</option>
              </select>
            </Field>

            {form.category === 'sports' ? (
              <Field id="challenge-sport" label="Sport" hint="Type to search the full list.">
                <SearchableSportSelect
                  id="challenge-sport"
                  includeAll={false}
                  value={form.sport}
                  onChange={(sport) => setForm((f) => ({ ...f, sport }))}
                  placeholder="Search sports... e.g. cricket"
                />
              </Field>
            ) : (
              <Field id="challenge-gameTitle" label="Game title" hint="e.g. BGMI, Valorant or FIFA.">
                <input
                  id="challenge-gameTitle"
                  type="text"
                  placeholder="e.g. BGMI"
                  maxLength={80}
                  value={form.gameTitle}
                  onChange={update('gameTitle')}
                  aria-describedby="challenge-gameTitle-hint"
                  className={inputClass(false)}
                />
              </Field>
            )}

            <Field id="challenge-challengeType" label="Team size">
              <select id="challenge-challengeType" value={form.challengeType} onChange={update('challengeType')} className={`${inputClass(false)} cursor-pointer`}>
                <option value="solo">Solo</option>
                <option value="team">Team</option>
              </select>
            </Field>

            <Field id="challenge-scoringType" label="Scoring">
              <select id="challenge-scoringType" value={form.scoringType} onChange={update('scoringType')} className={`${inputClass(false)} cursor-pointer`}>
                <option value="points">Most points</option>
                <option value="time">Fastest time</option>
                <option value="manual">Manual review</option>
              </select>
            </Field>

            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-green-500 md:col-span-2">Schedule</p>

            <Field id="challenge-startDate" label="Start date" required error={errors.startDate}>
              <input
                id="challenge-startDate"
                type="date"
                value={form.startDate}
                onChange={update('startDate')}
                aria-invalid={!!errors.startDate}
                aria-describedby={errors.startDate ? 'challenge-startDate-error' : undefined}
                className={inputClass(errors.startDate)}
              />
            </Field>

            <Field id="challenge-endDate" label="End date" required error={errors.endDate}>
              <input
                id="challenge-endDate"
                type="date"
                min={form.startDate || undefined}
                value={form.endDate}
                onChange={update('endDate')}
                aria-invalid={!!errors.endDate}
                aria-describedby={errors.endDate ? 'challenge-endDate-error' : undefined}
                className={inputClass(errors.endDate)}
              />
            </Field>

            <Field id="challenge-registrationDeadline" label="Registration deadline" error={errors.registrationDeadline} hint="Optional - defaults to the start date.">
              <input
                id="challenge-registrationDeadline"
                type="date"
                max={form.startDate || undefined}
                value={form.registrationDeadline}
                onChange={update('registrationDeadline')}
                aria-invalid={!!errors.registrationDeadline}
                aria-describedby={errors.registrationDeadline ? 'challenge-registrationDeadline-error' : 'challenge-registrationDeadline-hint'}
                className={inputClass(errors.registrationDeadline)}
              />
            </Field>

            <Field id="challenge-maxParticipants" label="Max participants" error={errors.maxParticipants} hint="0 means no cap.">
              <input
                id="challenge-maxParticipants"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="0"
                value={form.maxParticipants}
                onChange={update('maxParticipants')}
                aria-invalid={!!errors.maxParticipants}
                aria-describedby={errors.maxParticipants ? 'challenge-maxParticipants-error' : 'challenge-maxParticipants-hint'}
                className={inputClass(errors.maxParticipants)}
              />
            </Field>

            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-green-500 md:col-span-2">Entry and prize</p>

            <Field id="challenge-entryFee" label="Entry fee (₹)" error={errors.entryFee} hint="Leave 0 for a free challenge.">
              <input
                id="challenge-entryFee"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="0"
                value={form.entryFee}
                onChange={update('entryFee')}
                aria-invalid={!!errors.entryFee}
                aria-describedby={errors.entryFee ? 'challenge-entryFee-error' : 'challenge-entryFee-hint'}
                className={inputClass(errors.entryFee)}
              />
            </Field>

            <Field id="challenge-prizePool" label="Prize pool (₹)" error={errors.prizePool} hint="Shown on the challenge card.">
              <input
                id="challenge-prizePool"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="0"
                value={form.prizePool}
                onChange={update('prizePool')}
                aria-invalid={!!errors.prizePool}
                aria-describedby={errors.prizePool ? 'challenge-prizePool-error' : 'challenge-prizePool-hint'}
                className={inputClass(errors.prizePool)}
              />
            </Field>

            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-green-500 md:col-span-2">Stream and rules</p>

            <div className="md:col-span-2">
              <Field id="challenge-streamUrl" label="Stream link" error={errors.streamUrl} hint="Optional - YouTube or another live stream. Must start with http:// or https://.">
                <input
                  id="challenge-streamUrl"
                  type="url"
                  inputMode="url"
                  placeholder="https://youtube.com/live/..."
                  maxLength={500}
                  value={form.streamUrl}
                  onChange={update('streamUrl')}
                  aria-invalid={!!errors.streamUrl}
                  aria-describedby={errors.streamUrl ? 'challenge-streamUrl-error' : 'challenge-streamUrl-hint'}
                  className={inputClass(errors.streamUrl)}
                />
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field id="challenge-rules" label="Rules">
                <textarea
                  id="challenge-rules"
                  rows={4}
                  placeholder="Eligibility, format, timing, kit and anything participants must know."
                  maxLength={2000}
                  value={form.rules}
                  onChange={update('rules')}
                  className={`${inputClass(false)} resize-y`}
                />
              </Field>
            </div>

            <label htmlFor="challenge-lpuOnly" className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/10 p-4 dark:border-white/10 md:col-span-2">
              <input
                id="challenge-lpuOnly"
                type="checkbox"
                checked={form.lpuOnly}
                onChange={update('lpuOnly')}
                className="mt-0.5 h-4 w-4 accent-green-400"
              />
              <span>
                <span className="block text-sm font-bold">LPU students only</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">Only LPU-verified accounts can join this challenge.</span>
              </span>
            </label>
          </div>

          {serverError && <div className="mt-4"><FormAlert onDismiss={() => setServerError('')}>{serverError}</FormAlert></div>}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="submit" disabled={creating} className={btnSubmit}>
              {creating ? (
                <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Submitting...</>
              ) : (
                <><Send size={16} aria-hidden="true" /> Submit for approval</>
              )}
            </button>
            <p className="text-xs text-gray-400">Approved challenges appear publicly and can accept participants.</p>
          </div>
        </form>
      )}
    </Page>
  );
};

const ChallengeDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [challenge, setChallenge] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [score, setScore] = useState('');
  const [scoreError, setScoreError] = useState('');
  const [action, setAction] = useState('idle');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () =>
    API.get(`/challenges/${id}`)
      .then(({ data }) => { setChallenge(data); setLoadError(''); return data; })
      .catch((err) => { setLoadError(err?.response?.data?.message || 'We could not load this challenge.'); return null; });

  useEffect(() => { load(); }, [id]);

  const join = async () => {
    if (action !== 'idle') return;
    setActionError('');
    setNotice('');
    setAction('joining');
    try {
      await API.post(`/challenges/${id}/join`);
      await load();
      setNotice("You're in. Submit your score when you finish.");
    } catch (err) {
      setActionError(err?.response?.data?.message || 'We could not join you to this challenge.');
    } finally {
      setAction('idle');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (action !== 'idle') return;
    setActionError('');
    setNotice('');
    setScoreError('');
    const raw = String(score).trim();
    if (!raw) {
      setScoreError('Enter your score before submitting.');
      document.getElementById('challenge-score')?.focus();
      return;
    }
    if (!Number.isFinite(Number(raw))) {
      setScoreError('Enter a number, e.g. 42.');
      document.getElementById('challenge-score')?.focus();
      return;
    }
    setAction('submitting');
    try {
      await API.post(`/challenges/${id}/submit`, { score: Number(raw) });
      setScore('');
      await load();
      setNotice('Score submitted. The leaderboard is updated.');
    } catch (err) {
      setActionError(err?.response?.data?.message || 'We could not submit your score.');
    } finally {
      setAction('idle');
    }
  };

  if (loadError) {
    return (
      <>
        <SEO title="Challenge unavailable" description="This challenge could not be loaded." canonical={`/challenges/${id}`} noindex />
        <Page eyebrow="Challenge" title="Challenge unavailable." text={loadError} icon={Trophy}
          cta={<PrimaryLink to="/challenges"><Trophy size={17} /> Browse challenges</PrimaryLink>}>
          <p className="text-sm text-gray-500 dark:text-gray-400">It may have been removed, or it may still be waiting for approval.</p>
        </Page>
      </>
    );
  }

  if (!challenge) {
    return (
      <Page eyebrow="Challenge" title="Loading challenge..." text="Fetching the latest rules and scores." icon={Trophy}>
        <p className="flex items-center gap-2 text-gray-500"><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Loading...</p>
      </Page>
    );
  }

  const participants = challenge.participants || [];
  const participantCount = challenge.participantCount ?? participants.length;
  const scoreHint =
    challenge.scoringType === 'time'
      ? 'Enter your best time in seconds.'
      : challenge.scoringType === 'points'
        ? 'Enter your total points.'
        : 'Enter the score our organizers should verify.';
  const submitted = challenge.myParticipant?.status === 'submitted';

  return (
    <Page eyebrow={`${challenge.category} challenge`} title={challenge.title} text={challenge.description} icon={Trophy}
      cta={
        <>
          {challenge.streamUrl && <PrimaryLink href={challenge.streamUrl}><Play size={17} /> Watch stream</PrimaryLink>}
          {challenge.approvalStatus !== 'approved' ? (
            <span className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-5 py-3 text-sm font-black text-amber-600 dark:text-amber-400">
              <AlertCircle size={16} aria-hidden="true" /> Awaiting approval
            </span>
          ) : user && !challenge.myParticipant ? (
            <button type="button" onClick={join} disabled={action === 'joining'} className={btnPrimary}>
              {action === 'joining' ? (
                <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Joining...</>
              ) : (
                <>Join challenge <ArrowRight size={16} aria-hidden="true" /></>
              )}
            </button>
          ) : challenge.myParticipant ? (
            <span className="inline-flex items-center gap-2 rounded-2xl border border-green-400/40 bg-green-400/10 px-5 py-3 text-sm font-black text-green-600 dark:text-green-400">
              <CheckCircle2 size={16} aria-hidden="true" /> Joined
            </span>
          ) : null}
        </>
      }>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0">
          {actionError && <div className="mb-5"><FormAlert onDismiss={() => setActionError('')}>{actionError}</FormAlert></div>}
          {notice && <div className="mb-5"><FormAlert tone="success" onDismiss={() => setNotice('')}>{notice}</FormAlert></div>}

          <h2 className="text-2xl font-black">Rules</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-600 dark:text-gray-400">
            {challenge.rules || 'Rules will be announced by the organizer.'}
          </p>

          <h2 className="mt-8 text-2xl font-black">Leaderboard</h2>
          {participants.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No participants yet. Join and be the first on the board.</p>
          ) : (
            <ol className="mt-3 divide-y divide-black/10 dark:divide-white/10">
              {participants.map((p) => (
                <li key={p._id} className="flex items-center justify-between gap-3 py-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="w-6 shrink-0 text-sm font-black text-gray-400">{p.rank || '-'}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{p.user?.name || 'Player'}</span>
                      <span className="block text-xs text-gray-500">
                        {[p.user?.lpuVerified ? 'LPU verified' : null, p.status].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </span>
                  <strong className="shrink-0 text-lg">{p.score ?? 0}</strong>
                </li>
              ))}
            </ol>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-black/10 p-5 dark:border-white/10">
            <dl className="space-y-3 text-sm">
              {[
                ['Status', challenge.approvalStatus === 'approved' ? challenge.status : 'Awaiting approval'],
                ['Format', challenge.challengeType === 'team' ? 'Team' : 'Solo'],
                ['Scoring', SCORING_LABELS[challenge.scoringType] || 'Manual review'],
                ['Prize pool', `₹${challenge.prizePool || 0}`],
                ['Entry fee', challenge.entryFee ? `₹${challenge.entryFee}` : 'Free'],
                ['Participants', String(participantCount)],
                ['Starts', challenge.startDate || 'TBA'],
                ['Ends', challenge.endDate || 'TBA'],
                ['Registration closes', challenge.registrationDeadline || 'Not specified'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-gray-500 dark:text-gray-400">{label}</dt>
                  <dd className="text-right font-bold capitalize">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {challenge.myParticipant && (
            <form onSubmit={submit} noValidate className="rounded-3xl border border-black/10 p-5 dark:border-white/10">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-green-500">Your submission</p>
              <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                {submitted ? `Last submitted score: ${challenge.myParticipant.score ?? 0}. You can submit an updated score.` : 'Send your score for the organizer to verify.'}
              </p>
              <div className="mt-4">
                <Field id="challenge-score" label="Your score" required error={scoreError} hint={scoreHint}>
                  <input
                    id="challenge-score"
                    type="number"
                    step="any"
                    inputMode="decimal"
                    placeholder="e.g. 42"
                    value={score}
                    onChange={(e) => { setScore(e.target.value); setScoreError(''); }}
                    aria-invalid={!!scoreError}
                    aria-describedby={scoreError ? 'challenge-score-error' : 'challenge-score-hint'}
                    className={inputClass(scoreError)}
                  />
                </Field>
              </div>
              <button type="submit" disabled={action === 'submitting'} className={`${btnSubmit} mt-4 w-full`}>
                {action === 'submitting' ? (
                  <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Submitting...</>
                ) : (
                  <><Send size={16} aria-hidden="true" /> Submit score</>
                )}
              </button>
            </form>
          )}
        </aside>
      </div>
    </Page>
  );
};

export { LivePage, LpuVerificationPage, CareersPage, FAQPage, CollaboratePage, ChallengesPage, ChallengeDetailPage };
