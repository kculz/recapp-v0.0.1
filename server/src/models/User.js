const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true // Allow null for invited clients who haven't activated yet
  },
  role: {
    type: DataTypes.ENUM('Client', 'Counselor', 'Admin', 'SuperAdmin', 'SupportPerson'),
    defaultValue: 'Client',
    allowNull: false
  },
  clientType: {
    type: DataTypes.ENUM('Rehab', 'Counseling'),
    allowNull: true // Only relevant for Client role
  },
  assignedCounselorId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Active', 'Deactivated'),
    defaultValue: 'Pending',
    allowNull: false
  },
  activationToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  activationExpires: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  hooks: {
    beforeSave: async (user) => {
      if (user.changed('password') && user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  },
  defaultScope: {
    attributes: { exclude: ['password', 'activationToken', 'activationExpires'] }
  },
  scopes: {
    withPassword: {
      attributes: {}
    }
  }
});

// Compare password method
User.prototype.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
