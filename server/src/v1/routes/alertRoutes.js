const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { restrictTo } = require('../middlewares/auth');

router.route('/')
  .get(restrictTo('Admin', 'SuperAdmin', 'Counselor'), alertController.getFlaggedAlerts);

router.route('/:type/:id/resolve')
  .patch(restrictTo('Admin', 'SuperAdmin', 'Counselor'), alertController.resolveAlert);

module.exports = router;
