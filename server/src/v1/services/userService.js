const { User } = require('../../models');

exports.findAllUsers = async () => {
  return await User.findAll({
    include: [
      { model: User, as: 'Counselor', attributes: ['id', 'name', 'email'] }
    ],
    order: [['role', 'ASC'], ['createdAt', 'DESC']]
  });
};

exports.createUser = async (userData) => {
  return await User.create(userData);
};

exports.updateUser = async (userId, updateData) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found.');
  }

  const fieldsToUpdate = {};
  if (updateData.assignedCounselorId !== undefined) {
    if (updateData.assignedCounselorId !== null) {
      const counselor = await User.findOne({
        where: { id: updateData.assignedCounselorId, role: 'Counselor' }
      });
      if (!counselor) {
        throw new Error('Selected counselor does not exist or does not have the Counselor role.');
      }
    }
    fieldsToUpdate.assignedCounselorId = updateData.assignedCounselorId;
  }

  if (updateData.clientType !== undefined) {
    fieldsToUpdate.clientType = updateData.clientType;
  }

  if (updateData.status !== undefined) {
    fieldsToUpdate.status = updateData.status;
  }

  await user.update(fieldsToUpdate);

  return await User.findByPk(userId, {
    include: [
      { model: User, as: 'Counselor', attributes: ['id', 'name', 'email'] }
    ]
  });
};
