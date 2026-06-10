const familyService = require('../services/familyService');

const getSupportNetwork = async (req, res) => {
  try {
    const network = await familyService.getSupportNetwork(req.user.id);
    return res.json({ success: true, data: network });
  } catch (err) {
    console.error('[Family] getSupportNetwork error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch support network.' });
  }
};

const inviteSupportPerson = async (req, res) => {
  if (req.user.role !== 'Client') {
    return res.status(403).json({ success: false, error: 'Only clients can invite support persons.' });
  }
  try {
    const sp = await familyService.inviteSupportPerson(req.user.id, req.body);
    return res.status(201).json({ success: true, data: sp });
  } catch (err) {
    console.error('[Family] inviteSupportPerson error:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to send invite.' });
  }
};

const revokeSupportPerson = async (req, res) => {
  try {
    const result = await familyService.revokeSupportPerson(req.user.id, req.params.id);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Family] revokeSupportPerson error:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to revoke support person.' });
  }
};

const getSupportedClientData = async (req, res) => {
  if (req.user.role !== 'SupportPerson') {
    return res.status(403).json({ success: false, error: 'Access restricted to support persons.' });
  }
  try {
    const data = await familyService.getSupportedClientData(req.user.id);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[Family] getSupportedClientData error:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to fetch client data.' });
  }
};

// Public endpoint — called when support person clicks the link in their email
const acceptSupportInvite = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, error: 'Token and password are required.' });
    }
    const user = await familyService.acceptSupportInvite(token, password);
    return res.json({ success: true, message: 'Invite accepted. You can now log in.' });
  } catch (err) {
    console.error('[Family] acceptSupportInvite error:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to accept invite.' });
  }
};

module.exports = {
  getSupportNetwork, inviteSupportPerson, revokeSupportPerson,
  getSupportedClientData, acceptSupportInvite
};
