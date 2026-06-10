const progressService = require('../services/progressService');

const getGoals = async (req, res) => {
  try {
    const goals = await progressService.getGoals(req.user.id);
    return res.json({ success: true, data: goals });
  } catch (err) {
    console.error('[Progress] getGoals error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch goals.' });
  }
};

const createGoal = async (req, res) => {
  try {
    const goal = await progressService.createGoal(req.user.id, req.body);
    return res.status(201).json({ success: true, data: goal });
  } catch (err) {
    console.error('[Progress] createGoal error:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to create goal.' });
  }
};

const updateGoal = async (req, res) => {
  try {
    const goal = await progressService.updateGoal(req.params.id, req.user.id, req.body);
    return res.json({ success: true, data: goal });
  } catch (err) {
    console.error('[Progress] updateGoal error:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to update goal.' });
  }
};

const deleteGoal = async (req, res) => {
  try {
    await progressService.deleteGoal(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Goal deleted.' });
  } catch (err) {
    console.error('[Progress] deleteGoal error:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to delete goal.' });
  }
};

const toggleMilestone = async (req, res) => {
  try {
    const milestone = await progressService.toggleMilestone(req.params.mid, req.user.id);
    return res.json({ success: true, data: milestone });
  } catch (err) {
    console.error('[Progress] toggleMilestone error:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to update milestone.' });
  }
};

const getMoodTrend = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const trend = await progressService.getMoodTrend(req.user.id, days);
    return res.json({ success: true, data: trend });
  } catch (err) {
    console.error('[Progress] getMoodTrend error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch mood trend.' });
  }
};

module.exports = { getGoals, createGoal, updateGoal, deleteGoal, toggleMilestone, getMoodTrend };
