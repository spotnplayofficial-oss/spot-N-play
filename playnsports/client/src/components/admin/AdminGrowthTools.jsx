import { useEffect, useState } from 'react';
import API from '../../api/axios';

const emptyFaq = { question: '', answer: '', category: 'General', order: 0, active: true };
const emptyJob = { title: '', department: 'Team', location: 'Phagwara / Remote', type: 'Internship', description: '', requirements: '', active: true };

const AdminGrowthTools = ({ flash = () => {} }) => {
  const [settings, setSettings] = useState({});
  const [faqs, setFaqs] = useState([]);
  const [careers, setCareers] = useState({ jobs: [], applications: [] });
  const [collabs, setCollabs] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [faqForm, setFaqForm] = useState(emptyFaq);
  const [jobForm, setJobForm] = useState(emptyJob);

  const load = async () => {
    const [settingsRes, faqsRes, careersRes, collabRes, challengeRes] = await Promise.all([
      API.get('/site/settings'),
      API.get('/admin/site/faqs'),
      API.get('/admin/site/careers'),
      API.get('/admin/site/collaborations'),
      API.get('/admin/challenges?status=all'),
    ]);
    setSettings(settingsRes.data);
    setFaqs(faqsRes.data);
    setCareers(careersRes.data);
    setCollabs(collabRes.data);
    setChallenges(challengeRes.data);
  };

  useEffect(() => { load().catch(() => flash('Failed to load growth tools', 'error')); }, []);

  const saveSettings = async () => {
    const { data } = await API.patch('/admin/site/settings', settings);
    setSettings(data); flash('Settings saved');
  };

  const createFaq = async () => {
    await API.post('/admin/site/faqs', faqForm);
    setFaqForm(emptyFaq); await load(); flash('FAQ added');
  };

  const toggleFaq = async (faq) => {
    await API.patch(`/admin/site/faqs/${faq._id}`, { active: !faq.active });
    await load();
  };

  const createJob = async () => {
    await API.post('/admin/site/careers', jobForm);
    setJobForm(emptyJob); await load(); flash('Position added');
  };

  const toggleJob = async (job) => {
    await API.patch(`/admin/site/careers/${job._id}`, { active: !job.active });
    await load();
  };

  const updateApplication = async (id, status) => {
    await API.patch(`/admin/site/career-applications/${id}`, { status });
    await load();
  };

  const updateCollab = async (id, status) => {
    await API.patch(`/admin/site/collaborations/${id}`, { status });
    await load();
  };

  const moderateChallenge = async (id, action) => {
    await API.patch(`/admin/challenges/${id}/${action}`);
    await load(); flash(`Challenge ${action}d`);
  };

  return (
    <div className="space-y-6 anim-cardIn">
      <section className="card">
        <h2 className="text-xl font-bold mb-4">App Links / WhatsApp</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {['androidUrl', 'iosUrl', 'whatsappNumber', 'whatsappMessage', 'contactEmail', 'collaborationEmail', 'instagramUrl'].map((field) => (
            <input key={field} className="select-field w-full" placeholder={field} value={settings[field] || ''} onChange={(e) => setSettings({ ...settings, [field]: e.target.value })} />
          ))}
        </div>
        <button className="mt-4 px-4 py-2 rounded-xl bg-green-400 text-black text-sm font-bold" onClick={saveSettings}>Save settings</button>
      </section>

      <section className="card">
        <h2 className="text-xl font-bold mb-4">FAQs</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <input className="select-field" placeholder="Question" value={faqForm.question} onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })} />
          <input className="select-field" placeholder="Answer" value={faqForm.answer} onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })} />
          <input className="select-field" placeholder="Category" value={faqForm.category} onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })} />
          <button className="rounded-xl bg-green-400 text-black text-sm font-bold" onClick={createFaq}>Add FAQ</button>
        </div>
        {faqs.map((faq) => (
          <div key={faq._id} className="flex items-center justify-between border-t border-white/10 py-3">
            <div><p className="font-semibold">{faq.question}</p><p className="text-xs text-gray-500">{faq.category} · {faq.active ? 'Active' : 'Hidden'}</p></div>
            <button className="text-xs text-green-400" onClick={() => toggleFaq(faq)}>{faq.active ? 'Hide' : 'Show'}</button>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="text-xl font-bold mb-4">Careers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {['title', 'department', 'location', 'type', 'description', 'requirements'].map((field) => (
            <input key={field} className="select-field" placeholder={field} value={jobForm[field]} onChange={(e) => setJobForm({ ...jobForm, [field]: e.target.value })} />
          ))}
          <button className="rounded-xl bg-green-400 text-black text-sm font-bold" onClick={createJob}>Add position</button>
        </div>
        {careers.jobs?.map((job) => (
          <div key={job._id} className="flex items-center justify-between border-t border-white/10 py-3">
            <div><p className="font-semibold">{job.title}</p><p className="text-xs text-gray-500">{job.location} · {job.active ? 'Active' : 'Hidden'}</p></div>
            <button className="text-xs text-green-400" onClick={() => toggleJob(job)}>{job.active ? 'Hide' : 'Show'}</button>
          </div>
        ))}
        <h3 className="mt-6 mb-2 text-sm font-bold uppercase tracking-wider text-gray-500">Applications</h3>
        {careers.applications?.map((app) => (
          <div key={app._id} className="flex flex-col md:flex-row md:items-center justify-between border-t border-white/10 py-3 gap-2">
            <div><p className="font-semibold">{app.name} · {app.positionTitle || app.position?.title || 'General'}</p><p className="text-xs text-gray-500">{app.email} · {app.phone} · {app.status}</p></div>
            <select className="select-field" value={app.status} onChange={(e) => updateApplication(app._id, e.target.value)}><option>new</option><option>reviewing</option><option>shortlisted</option><option>rejected</option></select>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="text-xl font-bold mb-4">Collaboration enquiries</h2>
        {collabs.map((item) => (
          <div key={item._id} className="flex flex-col md:flex-row md:items-center justify-between border-t border-white/10 py-3 gap-2">
            <div><p className="font-semibold">{item.organization || item.name} · {item.inquiryType}</p><p className="text-xs text-gray-500">{item.email} · {item.phone}</p><p className="text-sm text-gray-400 mt-1">{item.message}</p></div>
            <select className="select-field" value={item.status} onChange={(e) => updateCollab(item._id, e.target.value)}><option>new</option><option>read</option><option>closed</option></select>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="text-xl font-bold mb-4">Challenge moderation</h2>
        {challenges.map((challenge) => (
          <div key={challenge._id} className="flex flex-col md:flex-row md:items-center justify-between border-t border-white/10 py-3 gap-2">
            <div><p className="font-semibold">{challenge.title}</p><p className="text-xs text-gray-500">{challenge.category} · {challenge.status} · {challenge.approvalStatus}</p></div>
            {challenge.approvalStatus === 'pending' && <div className="flex gap-2"><button className="px-3 py-1 rounded-lg bg-green-400 text-black text-xs font-bold" onClick={() => moderateChallenge(challenge._id, 'approve')}>Approve</button><button className="px-3 py-1 rounded-lg bg-red-400/20 text-red-400 text-xs font-bold" onClick={() => moderateChallenge(challenge._id, 'reject')}>Reject</button></div>}
          </div>
        ))}
      </section>
    </div>
  );
};

export default AdminGrowthTools;
