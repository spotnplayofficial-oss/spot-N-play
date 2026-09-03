import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Briefcase, CheckCircle2, Gamepad2, GraduationCap, MessageCircle, Play, Trophy, Users } from 'lucide-react';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
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

const PrimaryLink = ({ to, href, children }) => {
  const cls = 'inline-flex items-center gap-2 rounded-2xl bg-green-400 px-5 py-3 text-sm font-black text-black transition hover:bg-green-300';
  return to ? <Link to={to} className={cls}>{children}</Link> : <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>;
};

const GhostLink = ({ to, href, children }) => {
  const cls = 'inline-flex items-center gap-2 rounded-2xl border border-black/10 px-5 py-3 text-sm font-bold text-gray-800 transition hover:border-green-400/50 hover:text-green-500 dark:border-white/10 dark:text-gray-200';
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

const LpuVerificationPage = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ email: user?.lpuEmail || '', registrationNumber: user?.lpuRegistrationNumber || '', otp: '' });
  const [stage, setStage] = useState('idle');
  const [message, setMessage] = useState('');
  const send = async () => {
    const { data } = await API.post('/lpu/send-otp', { email: form.email, registrationNumber: form.registrationNumber });
    setMessage(data.message); setStage('sent');
  };
  const verify = async () => {
    const { data } = await API.post('/lpu/verify-otp', form);
    updateUser?.(data); setMessage(data.message); setStage('verified');
  };
  return (
    <>
      <SEO title="LPU Verification" description="Verify your LPU email to unlock campus-only challenges, badges and trusted community access on spotNplay." canonical="/lpu-verification" noindex />
      <Page eyebrow="LPU verification" title="Verify your LPU community access." text="Use your institutional email to unlock LPU-only challenges, badges and campus trust signals." icon={GraduationCap}>
      <div className="max-w-xl rounded-3xl border border-black/10 p-6 dark:border-white/10">
        {user?.lpuVerified || stage === 'verified' ? <p className="rounded-2xl bg-green-400/10 p-4 font-bold text-green-500">LPU Verified ✓</p> : (
          <div className="space-y-3">
            <input className="g-input" placeholder="yourname@lpu.in" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="g-input" placeholder="Registration number" value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} />
            {stage === 'sent' && <input className="g-input" placeholder="6-digit OTP" value={form.otp} onChange={(e) => setForm({ ...form, otp: e.target.value })} />}
            <button className="btn-primary w-full" onClick={stage === 'sent' ? verify : send}>{stage === 'sent' ? 'Verify OTP' : 'Send LPU OTP'}</button>
          </div>
        )}
        {message && <p className="mt-3 text-sm text-green-500">{message}</p>}
      </div>
      </Page>
    </>
  );
};

const CareersPage = () => {
  const [jobs, setJobs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', resumeUrl: '', message: '' });
  const [done, setDone] = useState('');
  useEffect(() => { API.get('/site/careers').then(({ data }) => setJobs(data)).catch(() => setJobs([])); }, []);
  const apply = async () => {
    await API.post(`/site/careers/${selected._id}/apply`, form);
    setDone('Application submitted.'); setSelected(null); setForm({ name: '', email: '', phone: '', resumeUrl: '', message: '' });
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
      {done && <p className="mb-4 text-green-500">{done}</p>}
      <div className="grid gap-4">
        {jobs.length === 0 ? <p className="text-gray-500">No open roles right now. Check back soon.</p> : jobs.map((job) => (
          <div key={job._id} className="flex flex-col gap-4 border-t border-black/10 py-5 dark:border-white/10 md:flex-row md:items-center md:justify-between">
            <div><p className="text-2xl font-black">{job.title}</p><p className="text-sm text-gray-500">{job.department} · {job.location} · {job.type}</p><p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">{job.description}</p></div>
            <button className="btn-primary" onClick={() => setSelected(job)}>Apply</button>
          </div>
        ))}
      </div>
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 dark:bg-[#101010]">
            <h2 className="mb-4 text-2xl font-black">Apply for {selected.title}</h2>
            {['name', 'email', 'phone', 'resumeUrl'].map((f) => <input key={f} className="g-input mb-3" placeholder={f} value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />)}
            <textarea className="g-input mb-3" placeholder="Message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            <div className="flex gap-3"><button className="btn-primary flex-1" onClick={apply}>Submit</button><button className="flex-1 rounded-xl border border-white/10 py-3" onClick={() => setSelected(null)}>Cancel</button></div>
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

const CollaboratePage = () => {
  const settings = useSettings();
  const [form, setForm] = useState({ name: '', organization: '', email: '', phone: '', inquiryType: 'Partnership', message: '' });
  const [done, setDone] = useState('');
  const submit = async () => {
    await API.post('/site/collaborate', form);
    setDone('Request sent.'); setForm({ name: '', organization: '', email: '', phone: '', inquiryType: 'Partnership', message: '' });
  };
  return (
    <>
      <SEO title="Collaborate with spotNplay" description="Partner with spotNplay — sponsorships, college events, venue onboarding and brand collaborations. Let's build the sports network together." canonical="/collaborate" />
      <Page eyebrow="Collaborate" title="Partner with spotNplay." text="For sponsors, colleges, sports organizers, brands and venue partners." icon={Users}
      cta={<GhostLink href={whatsappHref(settings)}><MessageCircle size={17} /> Chat on WhatsApp</GhostLink>}>
      <div className="grid gap-3 md:grid-cols-2">
        {['name', 'organization', 'email', 'phone'].map((f) => <input key={f} className="g-input" placeholder={f} value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />)}
        <select className="g-input" value={form.inquiryType} onChange={(e) => setForm({ ...form, inquiryType: e.target.value })}><option>Partnership</option><option>Sponsorship</option><option>College event</option><option>Venue onboarding</option></select>
        <textarea className="g-input md:col-span-2" rows={5} placeholder="Tell us what you want to build together" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      </div>
      <button className="btn-primary mt-4" onClick={submit}>Send enquiry</button>
      {done && <p className="mt-3 text-green-500">{done}</p>}
      </Page>
    </>
  );
};

const ChallengesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState({ category: '', status: '', lpuOnly: false });
  const [form, setForm] = useState({ title: '', category: 'sports', sport: '', gameTitle: '', description: '', rules: '', challengeType: 'solo', scoringType: 'points', startDate: '', endDate: '', registrationDeadline: '', maxParticipants: 0, prizePool: 0, streamUrl: '', lpuOnly: false });
  const load = () => {
    const params = new URLSearchParams();
    if (filter.category) params.set('category', filter.category);
    if (filter.status) params.set('status', filter.status);
    if (filter.lpuOnly) params.set('lpuOnly', 'true');
    API.get(`/challenges?${params.toString()}`).then(({ data }) => setItems(data)).catch(() => setItems([]));
  };
  useEffect(load, [filter.category, filter.status, filter.lpuOnly]);
  const create = async () => { await API.post('/challenges', form); setForm({ ...form, title: '', description: '', rules: '' }); load(); };
  return (
    <Page eyebrow="Challenge mode" title="Compete, score, rank." text="Standalone sports and esports challenges with registrations, submissions, leaderboards and winners." icon={Trophy}>
      <div className="mb-8 flex flex-wrap gap-3">
        <select className="g-input w-auto" value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}><option value="">All</option><option value="sports">Sports</option><option value="esports">Esports</option></select>
        <select className="g-input w-auto" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}><option value="">All status</option><option value="open">Open</option><option value="live">Live</option><option value="completed">Completed</option></select>
        <button className={`rounded-xl border px-4 text-sm font-bold ${filter.lpuOnly ? 'border-green-400 text-green-500' : 'border-black/10 dark:border-white/10'}`} onClick={() => setFilter({ ...filter, lpuOnly: !filter.lpuOnly })}>LPU only</button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((c) => <button key={c._id} onClick={() => navigate(`/challenges/${c._id}`)} className="rounded-3xl border border-black/10 p-5 text-left transition hover:border-green-400/50 dark:border-white/10"><p className="text-xs font-black uppercase tracking-[0.18em] text-green-500">{c.category} · {c.status}{c.lpuOnly ? ' · LPU only' : ''}</p><h2 className="mt-2 text-2xl font-black">{c.title}</h2><p className="mt-2 text-sm text-gray-500">{c.participantCount || 0} participants · Prize ₹{c.prizePool || 0}</p></button>)}
      </div>
      {user && <div className="mt-12 rounded-3xl border border-black/10 p-6 dark:border-white/10"><h2 className="mb-4 text-2xl font-black">Create a challenge</h2><div className="grid gap-3 md:grid-cols-2">{['title', 'sport', 'gameTitle', 'startDate', 'endDate', 'registrationDeadline', 'streamUrl'].map((f) => <input key={f} type={f.includes('Date') || f === 'registrationDeadline' ? 'date' : 'text'} className="g-input" placeholder={f} value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />)}<select className="g-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="sports">Sports</option><option value="esports">Esports</option></select><select className="g-input" value={form.challengeType} onChange={(e) => setForm({ ...form, challengeType: e.target.value })}><option value="solo">Solo</option><option value="team">Team</option></select><textarea className="g-input md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /><textarea className="g-input md:col-span-2" placeholder="Rules" value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} /></div><label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.lpuOnly} onChange={(e) => setForm({ ...form, lpuOnly: e.target.checked })} /> LPU-only</label><button className="btn-primary mt-4" onClick={create}>Submit for approval</button></div>}
    </Page>
  );
};

const ChallengeDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [challenge, setChallenge] = useState(null);
  const [score, setScore] = useState('');
  const load = () => API.get(`/challenges/${id}`).then(({ data }) => setChallenge(data));
  useEffect(() => { load().catch(() => {}); }, [id]);
  const join = async () => { await API.post(`/challenges/${id}/join`); load(); };
  const submit = async () => { await API.post(`/challenges/${id}/submit`, { score }); setScore(''); load(); };
  if (!challenge) return <Page eyebrow="Challenge" title="Loading..." text="" />;
  return (
    <Page eyebrow={`${challenge.category} challenge`} title={challenge.title} text={challenge.description} icon={Trophy}
      cta={<>{challenge.streamUrl && <PrimaryLink href={challenge.streamUrl}><Play size={17} /> Watch stream</PrimaryLink>}{user && !challenge.myParticipant && <button className="btn-primary" onClick={join}>Join challenge</button>}</>}>
      <div className="grid gap-8 md:grid-cols-[1fr_340px]">
        <div><h2 className="text-2xl font-black">Rules</h2><p className="mt-3 whitespace-pre-wrap text-gray-600 dark:text-gray-400">{challenge.rules || 'Rules will be announced by the organizer.'}</p><h2 className="mt-8 text-2xl font-black">Leaderboard</h2>{challenge.participants?.map((p) => <div key={p._id} className="flex items-center justify-between border-t border-black/10 py-3 dark:border-white/10"><span>{p.rank || '-'} · {p.user?.name}{p.user?.lpuVerified ? ' · LPU ✓' : ''}</span><strong>{p.score}</strong></div>)}</div>
        <aside className="rounded-3xl border border-black/10 p-5 dark:border-white/10"><p className="text-sm text-gray-500">Status: {challenge.status}</p><p className="text-sm text-gray-500">Prize: ₹{challenge.prizePool || 0}</p>{challenge.myParticipant && <div className="mt-5"><input className="g-input mb-3" placeholder="Score" value={score} onChange={(e) => setScore(e.target.value)} /><button className="btn-primary w-full" onClick={submit}>Submit score</button></div>}</aside>
      </div>
    </Page>
  );
};

export { LivePage, LpuVerificationPage, CareersPage, FAQPage, CollaboratePage, ChallengesPage, ChallengeDetailPage };
