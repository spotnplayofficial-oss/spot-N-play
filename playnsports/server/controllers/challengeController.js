import asyncHandler from 'express-async-handler';
import Challenge from '../models/Challenge.js';
import ChallengeParticipant from '../models/ChallengeParticipant.js';
import ChallengeSubmission from '../models/ChallengeSubmission.js';
import { requireSafeHttpUrl } from '../utils/safeUrl.js';

const todayStr = () => new Date().toISOString().split('T')[0];

const recalculateRanks = async (challengeId) => {
  const participants = await ChallengeParticipant.find({
    challenge: challengeId,
    status: { $in: ['submitted', 'approved'] },
  }).sort({ score: -1, updatedAt: 1 });
  await Promise.all(participants.map((p, index) => {
    p.rank = index + 1;
    return p.save();
  }));
};

const shapeChallenge = async (challenge, userId = null) => {
  const participants = await ChallengeParticipant.find({ challenge: challenge._id })
    .populate('user', 'name avatar lpuVerified')
    .sort({ rank: 1, score: -1, createdAt: 1 });
  const obj = challenge.toObject();
  obj.participants = participants;
  obj.participantCount = participants.length;
  obj.myParticipant = userId ? participants.find((p) => String(p.user?._id) === String(userId)) || null : null;
  return obj;
};

const validateChallengeBody = (body) => {
  if (!body.title || !body.description || !body.startDate || !body.endDate) {
    const err = new Error('Title, description, start date and end date are required');
    err.status = 400;
    throw err;
  }
  if (body.endDate < body.startDate) {
    const err = new Error('End date cannot be before start date');
    err.status = 400;
    throw err;
  }
  requireSafeHttpUrl(body.streamUrl, 'Stream URL');
};

const getChallenges = asyncHandler(async (req, res) => {
  const { category, status, lpuOnly, streaming } = req.query;
  const query = { approvalStatus: 'approved' };
  if (['sports', 'esports'].includes(category)) query.category = category;
  if (['open', 'live', 'completed'].includes(status)) query.status = status;
  else query.status = { $in: ['open', 'live', 'completed'] };
  if (lpuOnly === 'true') query.lpuOnly = true;
  if (streaming === 'true') query.streamUrl = { $ne: '' };
  const challenges = await Challenge.find(query)
    .populate('organizer', 'name avatar lpuVerified')
    .sort({ startDate: 1, createdAt: -1 });
  const counts = await ChallengeParticipant.aggregate([
    { $match: { challenge: { $in: challenges.map((c) => c._id) } } },
    { $group: { _id: '$challenge', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
  res.json(challenges.map((c) => ({ ...c.toObject(), participantCount: countMap[String(c._id)] || 0 })));
});

const getChallengeById = asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id).populate('organizer', 'name avatar lpuVerified');
  if (!challenge) { res.status(404); throw new Error('Challenge not found'); }
  if (challenge.approvalStatus !== 'approved' && String(challenge.organizer?._id) !== String(req.user?._id) && req.user?.role !== 'admin') {
    res.status(404); throw new Error('Challenge not found');
  }
  res.json(await shapeChallenge(challenge, req.user?._id));
});

const createChallenge = asyncHandler(async (req, res) => {
  validateChallengeBody(req.body);
  const challenge = await Challenge.create({
    title: req.body.title,
    category: req.body.category === 'esports' ? 'esports' : 'sports',
    sport: req.body.sport || '',
    gameTitle: req.body.gameTitle || '',
    description: req.body.description,
    rules: req.body.rules || '',
    challengeType: ['solo', 'team'].includes(req.body.challengeType) ? req.body.challengeType : 'solo',
    scoringType: ['manual', 'time', 'points'].includes(req.body.scoringType) ? req.body.scoringType : 'manual',
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    registrationDeadline: req.body.registrationDeadline || '',
    maxParticipants: Math.max(0, Number(req.body.maxParticipants) || 0),
    entryFee: Math.max(0, Number(req.body.entryFee) || 0),
    prizePool: Math.max(0, Number(req.body.prizePool) || 0),
    streamUrl: req.body.streamUrl || '',
    lpuOnly: !!req.body.lpuOnly,
    status: ['draft', 'open', 'live'].includes(req.body.status) ? req.body.status : 'open',
    approvalStatus: req.user.role === 'admin' ? 'approved' : 'pending',
    organizer: req.user._id,
  });
  res.status(201).json(challenge);
});

const updateChallenge = asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) { res.status(404); throw new Error('Challenge not found'); }
  if (String(challenge.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
    res.status(403); throw new Error('Only organizer or admin can update this challenge');
  }
  if (req.body.streamUrl !== undefined) requireSafeHttpUrl(req.body.streamUrl, 'Stream URL');
  ['title', 'sport', 'gameTitle', 'description', 'rules', 'startDate', 'endDate', 'registrationDeadline', 'streamUrl'].forEach((field) => {
    if (req.body[field] !== undefined) challenge[field] = req.body[field];
  });
  ['category', 'challengeType', 'scoringType', 'status'].forEach((field) => {
    if (req.body[field] !== undefined) challenge[field] = req.body[field];
  });
  ['maxParticipants', 'entryFee', 'prizePool'].forEach((field) => {
    if (req.body[field] !== undefined) challenge[field] = Math.max(0, Number(req.body[field]) || 0);
  });
  if (req.body.lpuOnly !== undefined) challenge.lpuOnly = !!req.body.lpuOnly;
  if (challenge.endDate < challenge.startDate) { res.status(400); throw new Error('End date cannot be before start date'); }
  await challenge.save();
  res.json(challenge);
});

const joinChallenge = asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) { res.status(404); throw new Error('Challenge not found'); }
  if (challenge.approvalStatus !== 'approved') { res.status(400); throw new Error('This challenge is awaiting admin approval'); }
  if (!['open', 'live'].includes(challenge.status)) { res.status(400); throw new Error('Challenge is not open'); }
  if (challenge.registrationDeadline && challenge.registrationDeadline < todayStr()) { res.status(400); throw new Error('Registration is closed'); }
  if (challenge.lpuOnly && !req.user.lpuVerified) { res.status(403); throw new Error('LPU verification is required'); }
  const count = await ChallengeParticipant.countDocuments({ challenge: challenge._id });
  if (challenge.maxParticipants > 0 && count >= challenge.maxParticipants) { res.status(400); throw new Error('Challenge is full'); }
  const participant = await ChallengeParticipant.findOneAndUpdate(
    { challenge: challenge._id, user: req.user._id },
    { $setOnInsert: { teamName: req.body.teamName || '' } },
    { new: true, upsert: true }
  );
  res.status(201).json(participant);
});

const submitScore = asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) { res.status(404); throw new Error('Challenge not found'); }
  const participant = await ChallengeParticipant.findOne({ challenge: challenge._id, user: req.user._id });
  if (!participant) { res.status(400); throw new Error('Join the challenge before submitting'); }
  requireSafeHttpUrl(req.body.proofUrl, 'Proof URL');
  const submission = await ChallengeSubmission.create({
    challenge: challenge._id,
    participant: participant._id,
    user: req.user._id,
    proofUrl: req.body.proofUrl || '',
    submittedScore: Number(req.body.score) || 0,
    note: req.body.note || '',
  });
  participant.score = Number(req.body.score) || 0;
  participant.status = 'submitted';
  await participant.save();
  await recalculateRanks(challenge._id);
  res.status(201).json({ message: 'Score submitted', submission, participant });
});

const scoreParticipant = asyncHandler(async (req, res) => {
  const participant = await ChallengeParticipant.findById(req.params.participantId);
  if (!participant) { res.status(404); throw new Error('Participant not found'); }
  const challenge = await Challenge.findById(participant.challenge);
  if (String(challenge.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
    res.status(403); throw new Error('Only organizer or admin can score this challenge');
  }
  participant.score = Number(req.body.score) || 0;
  participant.status = req.body.status || 'approved';
  await participant.save();
  await recalculateRanks(challenge._id);
  res.json(participant);
});

const completeChallenge = asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) { res.status(404); throw new Error('Challenge not found'); }
  if (String(challenge.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
    res.status(403); throw new Error('Only organizer or admin can complete this challenge');
  }
  const top = await ChallengeParticipant.find({ challenge: challenge._id, rank: 1 }).limit(1);
  challenge.status = 'completed';
  challenge.winners = top.map((p) => p.user);
  await challenge.save();
  res.json(challenge);
});

const getChallengesForAdmin = asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;
  const query = status === 'all' ? {} : { approvalStatus: status };
  const challenges = await Challenge.find(query).populate('organizer', 'name email avatar lpuVerified').sort({ createdAt: -1 });
  res.json(challenges);
});

const approveChallenge = asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) { res.status(404); throw new Error('Challenge not found'); }
  challenge.approvalStatus = 'approved';
  challenge.rejectionReason = '';
  await challenge.save();
  res.json(challenge);
});

const rejectChallenge = asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) { res.status(404); throw new Error('Challenge not found'); }
  challenge.approvalStatus = 'rejected';
  challenge.rejectionReason = req.body.reason || 'Rejected by admin';
  await challenge.save();
  res.json(challenge);
});

export {
  getChallenges, getChallengeById, createChallenge, updateChallenge, joinChallenge, submitScore, scoreParticipant, completeChallenge,
  getChallengesForAdmin, approveChallenge, rejectChallenge,
};
