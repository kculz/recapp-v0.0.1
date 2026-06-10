const express = require('express');
const router = express.Router();
const {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  toggleMilestone,
  getMoodTrend
} = require('../controllers/progressController');

// Goals CRUD
router.get('/goals', getGoals);
router.post('/goals', createGoal);
router.patch('/goals/:id', updateGoal);
router.delete('/goals/:id', deleteGoal);

// Milestone toggle
router.patch('/goals/:id/milestones/:mid/toggle', toggleMilestone);

// Mood trend data
router.get('/mood-trend', getMoodTrend);

module.exports = router;
