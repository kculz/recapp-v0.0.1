const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const GoalMilestone = sequelize.define('GoalMilestone', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  goalId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Goals', key: 'id' },
    onDelete: 'CASCADE'
  },
  label: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: true
});

module.exports = GoalMilestone;
