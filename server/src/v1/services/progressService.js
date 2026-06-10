const { Goal, GoalMilestone, Journal } = require('../../models');
const { Op, fn, col } = require('sequelize');

// Mood to numeric score for trend charting
const MOOD_SCORE = {
  Happy: 6,
  Calm: 5,
  Hopeful: 4,
  Anxious: 3,
  Sad: 2,
  Angry: 1
};

/**
 * Fetch all goals (with milestones) for a user.
 */
const getGoals = async (userId) => {
  const goals = await Goal.findAll({
    where: { userId },
    include: [{ model: GoalMilestone, as: 'milestones', order: [['sortOrder', 'ASC']] }],
    order: [['createdAt', 'DESC']]
  });
  return goals;
};

/**
 * Create a new goal with optional milestones.
 */
const createGoal = async (userId, { title, description, category, targetDate, milestones = [] }) => {
  const goal = await Goal.create({ userId, title, description, category, targetDate });

  if (milestones.length > 0) {
    const milestoneData = milestones.map((label, i) => ({
      goalId: goal.id,
      label,
      sortOrder: i
    }));
    await GoalMilestone.bulkCreate(milestoneData);
  }

  // Re-fetch with milestones included
  return await Goal.findByPk(goal.id, {
    include: [{ model: GoalMilestone, as: 'milestones', order: [['sortOrder', 'ASC']] }]
  });
};

/**
 * Update an existing goal (title, description, targetDate, isCompleted).
 */
const updateGoal = async (goalId, userId, data) => {
  const goal = await Goal.findOne({ where: { id: goalId, userId } });
  if (!goal) throw new Error('Goal not found.');
  await goal.update(data);
  return await Goal.findByPk(goal.id, {
    include: [{ model: GoalMilestone, as: 'milestones', order: [['sortOrder', 'ASC']] }]
  });
};

/**
 * Delete a goal and its milestones.
 */
const deleteGoal = async (goalId, userId) => {
  const goal = await Goal.findOne({ where: { id: goalId, userId } });
  if (!goal) throw new Error('Goal not found.');
  await GoalMilestone.destroy({ where: { goalId } });
  await goal.destroy();
};

/**
 * Toggle a milestone's completion state.
 */
const toggleMilestone = async (milestoneId, userId) => {
  // Validate ownership via the goal
  const milestone = await GoalMilestone.findByPk(milestoneId, {
    include: [{ model: Goal, as: 'goal' }]
  });
  if (!milestone || milestone.goal.userId !== userId) {
    throw new Error('Milestone not found.');
  }

  const newState = !milestone.isCompleted;
  await milestone.update({
    isCompleted: newState,
    completedAt: newState ? new Date() : null
  });

  return milestone;
};

/**
 * Get mood trend data from the last N days of journal entries.
 * Returns an array of { date, mood, score } sorted by date ascending.
 */
const getMoodTrend = async (userId, days = 30) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const entries = await Journal.findAll({
    where: {
      userId,
      entryDate: { [Op.gte]: since }
    },
    attributes: ['entryDate', 'mood'],
    order: [['entryDate', 'ASC']]
  });

  return entries.map((e) => ({
    date: e.entryDate,
    mood: e.mood,
    score: MOOD_SCORE[e.mood] || 0
  }));
};

module.exports = { getGoals, createGoal, updateGoal, deleteGoal, toggleMilestone, getMoodTrend };
