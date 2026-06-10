const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { restrictTo } = require('../middlewares/auth');

router.route('/')
  .get(restrictTo('Admin', 'SuperAdmin', 'Counselor'), userController.getAllUsers)
  .post(restrictTo('Admin', 'SuperAdmin'), userController.createUser);

router.route('/:id')
  .patch(restrictTo('Admin', 'SuperAdmin'), userController.updateUser);

module.exports = router;
