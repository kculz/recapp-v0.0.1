const { GroupSession, GroupSessionMember, User } = require('../../models');
const { Op } = require('sequelize');

const STAFF_ROLES = ['Admin', 'SuperAdmin', 'Counselor'];
const TIME_SLOTS = [
  '09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM',
  '01:00 PM - 02:00 PM', '02:00 PM - 03:00 PM', '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM'
];

// Common include for fetching sessions with member count and host info
const sessionInclude = (userId = null) => {
  const includes = [
    { model: User, as: 'host', attributes: ['id', 'name', 'email'] },
    { model: GroupSessionMember, as: 'members', attributes: ['id', 'userId', 'joinedAt'] }
  ];
  return includes;
};

/**
 * List group sessions (optionally filtered by category/status).
 */
const listSessions = async ({ category, status, page = 1, limit = 20 }) => {
  const where = {};
  if (category && category !== 'All') where.category = category;
  if (status && status !== 'All') where.status = status;

  const offset = (page - 1) * limit;
  const { rows, count } = await GroupSession.findAndCountAll({
    where,
    include: sessionInclude(),
    order: [['sessionDate', 'ASC'], ['timeSlot', 'ASC']],
    limit,
    offset
  });

  return { sessions: rows, total: count, page, limit };
};

/**
 * Get sessions the current user has joined.
 */
const getMyJoinedSessions = async (userId) => {
  const memberships = await GroupSessionMember.findAll({
    where: { userId },
    include: [{
      model: GroupSession,
      as: 'session',
      include: [
        { model: User, as: 'host', attributes: ['id', 'name'] },
        { model: GroupSessionMember, as: 'members', attributes: ['id', 'userId'] }
      ]
    }],
    order: [[{ model: GroupSession, as: 'session' }, 'sessionDate', 'ASC']]
  });

  return memberships.map((m) => m.session);
};

/**
 * Create a new group session (staff only).
 */
const createSession = async (createdBy, data) => {
  const { title, description, category, sessionDate, timeSlot, maxCapacity } = data;

  if (!title || !sessionDate || !timeSlot) {
    throw new Error('Title, session date, and time slot are required.');
  }

  const session = await GroupSession.create({
    title, description, category, sessionDate, timeSlot,
    maxCapacity: maxCapacity || 10, createdBy, status: 'Open'
  });

  return await GroupSession.findByPk(session.id, { include: sessionInclude() });
};

/**
 * Update a session (host or admin).
 */
const updateSession = async (sessionId, userId, role, data) => {
  const session = await GroupSession.findByPk(sessionId);
  if (!session) throw new Error('Group session not found.');

  const isOwner = session.createdBy === userId;
  const isAdmin = ['Admin', 'SuperAdmin'].includes(role);
  if (!isOwner && !isAdmin) throw new Error('Not authorised to update this session.');

  await session.update(data);
  return await GroupSession.findByPk(session.id, { include: sessionInclude() });
};

/**
 * Cancel a session.
 */
const cancelSession = async (sessionId, userId, role) => {
  const session = await GroupSession.findByPk(sessionId);
  if (!session) throw new Error('Group session not found.');

  const isOwner = session.createdBy === userId;
  const isAdmin = ['Admin', 'SuperAdmin'].includes(role);
  if (!isOwner && !isAdmin) throw new Error('Not authorised to cancel this session.');

  await session.update({ status: 'Cancelled' });
  return session;
};

/**
 * Join a session (clients + counselors).
 */
const joinSession = async (sessionId, userId) => {
  const session = await GroupSession.findByPk(sessionId, {
    include: [{ model: GroupSessionMember, as: 'members', attributes: ['userId'] }]
  });
  if (!session) throw new Error('Group session not found.');
  if (session.status === 'Cancelled') throw new Error('This session has been cancelled.');
  if (session.status === 'Completed') throw new Error('This session has already ended.');
  if (session.status === 'Full') throw new Error('This session is full. Please join another.');

  // Duplicate check
  const alreadyJoined = session.members.some((m) => m.userId === userId);
  if (alreadyJoined) throw new Error('You have already joined this session.');

  await GroupSessionMember.create({ groupSessionId: sessionId, userId });

  // Check if now full
  const memberCount = session.members.length + 1;
  if (memberCount >= session.maxCapacity) {
    await session.update({ status: 'Full' });
  }

  return await GroupSession.findByPk(sessionId, { include: sessionInclude() });
};

/**
 * Leave a session.
 */
const leaveSession = async (sessionId, userId) => {
  const membership = await GroupSessionMember.findOne({
    where: { groupSessionId: sessionId, userId }
  });
  if (!membership) throw new Error('You are not a member of this session.');

  await membership.destroy();

  // Re-open if it was Full
  const session = await GroupSession.findByPk(sessionId, {
    include: [{ model: GroupSessionMember, as: 'members', attributes: ['userId'] }]
  });
  if (session && session.status === 'Full' && session.members.length < session.maxCapacity) {
    await session.update({ status: 'Open' });
  }

  return { message: 'Left session successfully.' };
};

module.exports = {
  listSessions, getMyJoinedSessions, createSession,
  updateSession, cancelSession, joinSession, leaveSession
};
