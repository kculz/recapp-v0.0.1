const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const GroupSession = sequelize.define('GroupSession', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.ENUM('Rehab', 'Mental Health', 'Mindfulness', 'Life Skills', 'Crisis Support'),
    allowNull: false,
    defaultValue: 'Mental Health'
  },
  sessionDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  timeSlot: {
    type: DataTypes.STRING,
    allowNull: false
  },
  maxCapacity: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Open', 'Full', 'Completed', 'Cancelled'),
    defaultValue: 'Open',
    allowNull: false
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' }
  }
}, {
  timestamps: true
});

module.exports = GroupSession;
