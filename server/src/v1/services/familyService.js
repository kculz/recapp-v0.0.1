const { v4: uuidv4 } = require('uuid');
const { SupportPerson, User, Goal, GoalMilestone, Journal } = require('../../models');
const emailQueue = require('../utils/emailQueue');
const { Op } = require('sequelize');

const MOOD_SCORE = { Happy: 6, Calm: 5, Hopeful: 4, Anxious: 3, Sad: 2, Angry: 1 };

/**
 * List the support network for a client.
 */
const getSupportNetwork = async (clientId) => {
  return await SupportPerson.findAll({
    where: { clientId },
    include: [{ model: User, as: 'supporter', attributes: ['id', 'name', 'email', 'status'] }],
    order: [['createdAt', 'DESC']]
  });
};

/**
 * Invite a support person (creates pending User + SupportPerson record + queues email).
 */
const inviteSupportPerson = async (clientId, { name, email }) => {
  // Check client's own info
  const client = await User.findByPk(clientId);
  if (!client) throw new Error('Client not found.');

  // Prevent duplicate pending/active invite for same email and client
  const existing = await SupportPerson.findOne({
    where: { clientId, email, status: { [Op.in]: ['Pending', 'Active'] } }
  });
  if (existing) throw new Error('A support person with this email is already in your network.');

  const inviteToken = uuidv4();

  // Check if a User with this email already exists (returning supporter)
  let supportUser = await User.unscoped().findOne({ where: { email } });

  if (!supportUser) {
    // Create a new pending SupportPerson account
    supportUser = await User.create({
      name,
      email,
      role: 'SupportPerson',
      status: 'Pending',
      activationToken: inviteToken,
      activationExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
  }

  const supportPerson = await SupportPerson.create({
    clientId,
    userId: supportUser.id,
    name,
    email,
    inviteToken,
    status: 'Pending'
  });

  // Queue invite email
  await emailQueue.addEmailJob({
    type: 'support-invite',
    email,
    name,
    clientName: client.name,
    token: inviteToken
  });

  return supportPerson;
};

/**
 * Accept a support invite (sets up password, activates account, links SupportPerson).
 */
const acceptSupportInvite = async (token, password) => {
  const sp = await SupportPerson.findOne({ where: { inviteToken: token, status: 'Pending' } });
  if (!sp) throw new Error('Invalid or expired invite link.');

  const user = await User.unscoped().findByPk(sp.userId);
  if (!user) throw new Error('Support person account not found.');

  // Activate the User account
  await user.update({
    password,
    status: 'Active',
    activationToken: null,
    activationExpires: null
  });

  // Activate the SupportPerson record
  await sp.update({ status: 'Active', inviteToken: null });

  return user;
};

/**
 * Revoke a support person (deactivates their account and marks record Revoked).
 */
const revokeSupportPerson = async (clientId, supportPersonId) => {
  const sp = await SupportPerson.findOne({ where: { id: supportPersonId, clientId } });
  if (!sp) throw new Error('Support person not found in your network.');

  await sp.update({ status: 'Revoked' });

  // Deactivate the linked user account if it exists
  if (sp.userId) {
    await User.update({ status: 'Deactivated' }, { where: { id: sp.userId } });
  }

  return { message: 'Support person has been removed from your network.' };
};

/**
 * Get the client data visible to a support person (goals + mood trend).
 */
const getSupportedClientData = async (supportUserId) => {
  // Find which client this support person is linked to
  const sp = await SupportPerson.findOne({
    where: { userId: supportUserId, status: 'Active' },
    include: [{ model: User, as: 'client', attributes: ['id', 'name'] }]
  });
  if (!sp) throw new Error('No active client linked to this account.');

  const clientId = sp.clientId;

  // Goals with milestones
  const goals = await Goal.findAll({
    where: { userId: clientId },
    include: [{ model: GoalMilestone, as: 'milestones', order: [['sortOrder', 'ASC']] }],
    order: [['createdAt', 'DESC']]
  });

  // Mood trend (last 14 days)
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const journalEntries = await Journal.findAll({
    where: { userId: clientId, entryDate: { [Op.gte]: since } },
    attributes: ['entryDate', 'mood'],
    order: [['entryDate', 'ASC']]
  });

  const moodTrend = journalEntries.map((e) => ({
    date: e.entryDate,
    mood: e.mood,
    score: MOOD_SCORE[e.mood] || 0
  }));

  return {
    client: sp.client,
    goals,
    moodTrend
  };
};

module.exports = {
  getSupportNetwork,
  inviteSupportPerson,
  acceptSupportInvite,
  revokeSupportPerson,
  getSupportedClientData
};
