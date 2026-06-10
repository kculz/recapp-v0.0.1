const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PostLike = sequelize.define('PostLike', {
  postId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: 'Posts',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  userId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  }
});

module.exports = PostLike;
