const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const GroupSessionMember = sequelize.define('GroupSessionMember', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  groupSessionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'GroupSessions', key: 'id' },
    onDelete: 'CASCADE'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onDelete: 'CASCADE'
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false,
  indexes: [
    // Prevent a user from joining the same session twice
    { unique: true, fields: ['groupSessionId', 'userId'] }
  ]
});

module.exports = GroupSessionMember;
