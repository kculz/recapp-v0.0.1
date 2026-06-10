const sequelize = require('../config/db');
const User = require('./User');

const db = {
  sequelize,
  Sequelize: require('sequelize'),
  User
};

module.exports = db;
