import asyncHandler from 'express-async-handler';
import SiteSetting from '../models/SiteSetting.js';
import FAQ from '../models/FAQ.js';
import CareerPosition from '../models/CareerPosition.js';
import CareerApplication from '../models/CareerApplication.js';
import CollaborationInquiry from '../models/CollaborationInquiry.js';
import Event from '../models/Event.js';
import Challenge from '../models/Challenge.js';
import { requireSafeHttpUrl } from '../utils/safeUrl.js';

const getSettingsDoc = async () => (
  SiteSetting.findOneAndUpdate(
    { key: 'platform' },
    { $setOnInsert: { key: 'platform' } },
    { new: true, upsert: true }
  )
);

const getPublicSettings = asyncHandler(async (req, res) => {
  res.json(await getSettingsDoc());
});

const getPublicLiveStreams = asyncHandler(async (req, res) => {
  const [events, challenges] = await Promise.all([
    Event.find({ approvalStatus: 'approved', status: 'upcoming', streamUrl: { $ne: '' } })
      .select('title sport eventCategory gameTitle streamUrl date startTime')
      .sort({ date: 1, startTime: 1 })
      .limit(20),
    Challenge.find({ approvalStatus: 'approved', status: { $in: ['open', 'live'] }, streamUrl: { $ne: '' } })
      .select('title category sport gameTitle streamUrl startDate status')
      .sort({ startDate: 1 })
      .limit(20),
  ]);
  res.json({
    events: events.map((e) => ({ ...e.toObject(), type: 'Event' })),
    challenges: challenges.map((c) => ({ ...c.toObject(), type: 'Challenge' })),
  });
});

const updateSettings = asyncHandler(async (req, res) => {
  const fields = ['androidUrl', 'iosUrl', 'whatsappNumber', 'whatsappMessage', 'contactEmail', 'collaborationEmail', 'instagramUrl'];
  const update = {};
  fields.forEach((field) => {
    if (req.body[field] !== undefined) update[field] = String(req.body[field] || '').trim();
  });
  ['androidUrl', 'iosUrl', 'instagramUrl'].forEach((field) => requireSafeHttpUrl(update[field], field));
  const doc = await SiteSetting.findOneAndUpdate({ key: 'platform' }, { $set: update }, { new: true, upsert: true });
  res.json(doc);
});

const getPublicFaqs = asyncHandler(async (req, res) => {
  const faqs = await FAQ.find({ active: true }).sort({ order: 1, createdAt: -1 });
  res.json(faqs);
});

const getAdminFaqs = asyncHandler(async (req, res) => {
  const faqs = await FAQ.find({}).sort({ order: 1, createdAt: -1 });
  res.json(faqs);
});

const createFaq = asyncHandler(async (req, res) => {
  const { question, answer, category, order, active } = req.body;
  if (!question || !answer) { res.status(400); throw new Error('Question and answer are required'); }
  const faq = await FAQ.create({ question, answer, category, order: Number(order) || 0, active: active !== false });
  res.status(201).json(faq);
});

const updateFaq = asyncHandler(async (req, res) => {
  const faq = await FAQ.findById(req.params.id);
  if (!faq) { res.status(404); throw new Error('FAQ not found'); }
  ['question', 'answer', 'category'].forEach((field) => {
    if (req.body[field] !== undefined) faq[field] = req.body[field];
  });
  if (req.body.order !== undefined) faq.order = Number(req.body.order) || 0;
  if (req.body.active !== undefined) faq.active = !!req.body.active;
  await faq.save();
  res.json(faq);
});

const deleteFaq = asyncHandler(async (req, res) => {
  await FAQ.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

const getPublicCareers = asyncHandler(async (req, res) => {
  const jobs = await CareerPosition.find({ active: true }).sort({ createdAt: -1 });
  res.json(jobs);
});

const getAdminCareers = asyncHandler(async (req, res) => {
  const [jobs, applications] = await Promise.all([
    CareerPosition.find({}).sort({ createdAt: -1 }),
    CareerApplication.find({}).populate('position', 'title').sort({ createdAt: -1 }),
  ]);
  res.json({ jobs, applications });
});

const createCareer = asyncHandler(async (req, res) => {
  const { title, department, location, type, description, requirements, active } = req.body;
  if (!title || !description) { res.status(400); throw new Error('Title and description are required'); }
  const job = await CareerPosition.create({ title, department, location, type, description, requirements, active: active !== false });
  res.status(201).json(job);
});

const updateCareer = asyncHandler(async (req, res) => {
  const job = await CareerPosition.findById(req.params.id);
  if (!job) { res.status(404); throw new Error('Position not found'); }
  ['title', 'department', 'location', 'type', 'description', 'requirements'].forEach((field) => {
    if (req.body[field] !== undefined) job[field] = req.body[field];
  });
  if (req.body.active !== undefined) job.active = !!req.body.active;
  await job.save();
  res.json(job);
});

const submitCareerApplication = asyncHandler(async (req, res) => {
  const { name, email, phone, resumeUrl, message } = req.body;
  if (!name || !email) { res.status(400); throw new Error('Name and email are required'); }
  requireSafeHttpUrl(resumeUrl, 'Resume/Profile link');
  const position = req.params.id ? await CareerPosition.findById(req.params.id) : null;
  const app = await CareerApplication.create({
    position: position?._id || null,
    positionTitle: position?.title || req.body.positionTitle || '',
    name, email, phone, resumeUrl, message,
  });
  res.status(201).json({ message: 'Application received', application: app });
});

const getAdminCollaborations = asyncHandler(async (req, res) => {
  const items = await CollaborationInquiry.find({}).sort({ createdAt: -1 });
  res.json(items);
});

const submitCollaboration = asyncHandler(async (req, res) => {
  const { name, organization, email, phone, inquiryType, message } = req.body;
  if (!name || !email || !message) { res.status(400); throw new Error('Name, email and message are required'); }
  const inquiry = await CollaborationInquiry.create({ name, organization, email, phone, inquiryType, message });
  res.status(201).json({ message: 'Collaboration request received', inquiry });
});

const updateCollaborationStatus = asyncHandler(async (req, res) => {
  const inquiry = await CollaborationInquiry.findById(req.params.id);
  if (!inquiry) { res.status(404); throw new Error('Inquiry not found'); }
  if (['new', 'read', 'closed'].includes(req.body.status)) inquiry.status = req.body.status;
  await inquiry.save();
  res.json(inquiry);
});

const updateCareerApplicationStatus = asyncHandler(async (req, res) => {
  const application = await CareerApplication.findById(req.params.id);
  if (!application) { res.status(404); throw new Error('Application not found'); }
  if (['new', 'reviewing', 'shortlisted', 'rejected'].includes(req.body.status)) application.status = req.body.status;
  await application.save();
  res.json(application);
});

export {
  getPublicSettings, updateSettings,
  getPublicLiveStreams,
  getPublicFaqs, getAdminFaqs, createFaq, updateFaq, deleteFaq,
  getPublicCareers, getAdminCareers, createCareer, updateCareer, submitCareerApplication, updateCareerApplicationStatus,
  getAdminCollaborations, submitCollaboration, updateCollaborationStatus,
};
