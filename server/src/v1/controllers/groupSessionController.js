const groupSessionService = require('../services/groupSessionService');

const STAFF_ROLES = ['Admin', 'SuperAdmin', 'Counselor'];

const listSessions = async (req, res) => {
  try {
    const { category, status, page, limit } = req.query;
    const result = await groupSessionService.listSessions({
      category, status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[GroupSession] listSessions error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch sessions.' });
  }
};

const getMyJoinedSessions = async (req, res) => {
  try {
    const sessions = await groupSessionService.getMyJoinedSessions(req.user.id);
    return res.json({ success: true, data: sessions });
  } catch (err) {
    console.error('[GroupSession] getMyJoinedSessions error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch your sessions.' });
  }
};

const createSession = async (req, res) => {
  if (!STAFF_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Not authorised.' });
  }
  try {
    const session = await groupSessionService.createSession(req.user.id, req.body);
    return res.status(201).json({ success: true, data: session });
  } catch (err) {
    console.error('[GroupSession] createSession error:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to create session.' });
  }
};

const updateSession = async (req, res) => {
  if (!STAFF_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Not authorised.' });
  }
  try {
    const session = await groupSessionService.updateSession(
      req.params.id, req.user.id, req.user.role, req.body
    );
    return res.json({ success: true, data: session });
  } catch (err) {
    console.error('[GroupSession] updateSession error:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to update session.' });
  }
};

const cancelSession = async (req, res) => {
  if (!STAFF_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Not authorised.' });
  }
  try {
    await groupSessionService.cancelSession(req.params.id, req.user.id, req.user.role);
    return res.json({ success: true, message: 'Session cancelled.' });
  } catch (err) {
    console.error('[GroupSession] cancelSession error:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to cancel session.' });
  }
};

const joinSession = async (req, res) => {
  try {
    const session = await groupSessionService.joinSession(req.params.id, req.user.id);
    return res.json({ success: true, data: session });
  } catch (err) {
    console.error('[GroupSession] joinSession error:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to join session.' });
  }
};

const leaveSession = async (req, res) => {
  try {
    const result = await groupSessionService.leaveSession(req.params.id, req.user.id);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('[GroupSession] leaveSession error:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to leave session.' });
  }
};

module.exports = {
  listSessions, getMyJoinedSessions, createSession,
  updateSession, cancelSession, joinSession, leaveSession
};
