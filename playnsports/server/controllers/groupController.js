import asyncHandler from 'express-async-handler';
import Group from '../models/Group.js';
import Player from '../models/Player.js';
import Conversation from '../models/Conversation.js';
import { getIO } from '../socket/io.js';
import { scrubNestedPhone } from '../utils/phonePrivacy.js';

// Broadcasts a group's latest state so any connected client can refresh
// its group list without polling. Wrapped defensively — getIO() can
// legitimately return null (e.g. very early in boot) and a socket emit
// failure should never take down the actual API response.
const emitGroupUpdate = (group) => {
  try {
    const io = getIO();
    if (io) io.emit('group_updated', group);
  } catch (err) {
    console.error('Error emitting group_updated socket event:', err);
  }
};

const createGroup = asyncHandler(async (req, res) => {
  const { name, sport, maxMembers, joiningDeadline, coordinates } = req.body;

  const group = await Group.create({
    name,
    sport,
    createdBy: req.user._id,
    members: [req.user._id],
    maxMembers: maxMembers || 10,
    joiningDeadline: new Date(joiningDeadline),
    location: { type: 'Point', coordinates },
    isOpen: true,
  });

  // Auto-create the group's chat conversation up front so it's ready the
  // moment someone opens the group — getOrCreateGroupChat in
  // chatController.js already does this lazily, this just avoids the
  // first-open delay/race.
  await Conversation.create({
    type: 'group',
    group: group._id,
    participants: [req.user._id],
  }).catch(() => {}); // best-effort — lazy creation in chatController is still the fallback

  const populatedGroup = await Group.findById(group._id)
    .populate('createdBy', 'name avatar')
    .populate('members', 'name avatar')
    .populate('invitations.user', 'name avatar');

  emitGroupUpdate(populatedGroup);

  res.status(201).json(populatedGroup);
});

const getMyGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find({
    $or: [{ createdBy: req.user._id }, { members: req.user._id }],
  })
    .populate('createdBy', 'name avatar')
    .populate('members', 'name avatar')
    .sort({ createdAt: -1 });

  res.json(groups);
});

const getNearbyGroups = asyncHandler(async (req, res) => {
  const { longitude, latitude, radius = 5000, sport } = req.query;

  const query = {
    isOpen: true,
    joiningDeadline: { $gt: new Date() },
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        $maxDistance: parseFloat(radius),
      },
    },
  };

  if (sport) query.sport = sport;

  const groups = await Group.find(query)
    .populate('createdBy', 'name avatar')
    .populate('members', 'name avatar');

  res.json(groups);
});

const invitePlayer = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  const group = await Group.findById(req.params.id);

  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  if (group.createdBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Only group creator can invite players');
  }

  const alreadyInvited = group.invitations.find(
    (inv) => inv.user && inv.user.toString() === userId
  );

  if (alreadyInvited) {
    res.status(400);
    throw new Error('Player already invited');
  }

  const alreadyMember = group.members.find(
    (m) => m && m.toString() === userId
  );

  if (alreadyMember) {
    res.status(400);
    throw new Error('Player already a member');
  }

  group.invitations.push({ user: userId, status: 'pending' });
  await group.save();

  res.json({ message: 'Invitation sent ✅' });
});

const respondToInvitation = asyncHandler(async (req, res) => {
  const { response } = req.body;

  const group = await Group.findById(req.params.id);

  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  const invitation = group.invitations.find(
    (inv) => inv.user.toString() === req.user._id.toString()
  );

  if (!invitation) {
    res.status(404);
    throw new Error('Invitation not found');
  }

  invitation.status = response;

  if (response === 'accepted') {
    if (group.members.length >= group.maxMembers) {
      res.status(400);
      throw new Error('Group is full');
    }
    group.members.push(req.user._id);
  }

  await group.save();

  res.json({ message: `Invitation ${response} ✅` });
});

const joinGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) { res.status(404); throw new Error('Group not found'); }
  if (!group.isOpen) { res.status(400); throw new Error('Group is closed'); }

  // ← DUPLICATE CHECK
  const alreadyMember = group.members.some(
    (m) => m.toString() === req.user._id.toString()
  );
  if (alreadyMember) {
    res.status(400);
    throw new Error('You are already a member of this group');
  }

  if (group.members.length >= group.maxMembers) {
    res.status(400);
    throw new Error('Group is full');
  }

  group.members.push(req.user._id);
  await group.save();
  res.json({ message: 'Joined group successfully!' });
});

const leaveGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);

  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  group.members = group.members.filter(
    (m) => m.toString() !== req.user._id.toString()
  );

  await group.save();

  res.json({ message: 'Left group ✅' });
});

const closeGroup = asyncHandler(async (req, res) => {
  const group = await Group.findOne({ _id: req.params.id, createdBy: req.user._id });

  if (!group) {
    res.status(404);
    throw new Error('Group not found or unauthorized');
  }

  group.isOpen = false;
  await group.save();

  res.json({ message: 'Group closed ✅' });
});

const getMyInvitations = asyncHandler(async (req, res) => {
  const groups = await Group.find({
    'invitations.user': req.user._id,
    'invitations.status': 'pending',
  }).populate('createdBy', 'name avatar');

  res.json(groups);
});

// Add new controller function
const getInvitablePlayers = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) { res.status(404); throw new Error('Group not found'); }
  if (group.createdBy.toString() !== req.user._id.toString()) {
    res.status(403); throw new Error('Only creator can invite');
  }

  // Get all players except already members and already invited
  const excludeIds = [
    ...group.members.map(m => m.toString()),
    ...group.invitations.map(i => i.user.toString()),
  ];

  const players = await Player.find({
    user: { $nin: excludeIds },
    isAvailable: true,
  }).populate('user', 'name avatar phone hidePhoneNumber');

  res.json(scrubNestedPhone(players, 'user', req.user._id));
});

const removeMember = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const group = await Group.findById(req.params.id);
  if (!group) { res.status(404); throw new Error('Group not found'); }
  if (group.createdBy.toString() !== req.user._id.toString()) {
    res.status(403); throw new Error('Only creator can remove members');
  }
  if (userId === group.createdBy.toString()) {
    res.status(400); throw new Error('Cannot remove group creator');
  }
  group.members = group.members.filter(m => m.toString() !== userId);
  await group.save();
  res.json({ message: 'Member removed ✅' });
});


export {
  createGroup,
  getMyGroups,
  getNearbyGroups,
  invitePlayer,
  respondToInvitation,
  joinGroup,
  leaveGroup,
  closeGroup,
  getMyInvitations,
  getInvitablePlayers,
  removeMember
};