const { User } = require('../../models');

exports.findAllUsers = async () => {
  return await User.findAll();
};

exports.createUser = async (userData) => {
  return await User.create(userData);
};
