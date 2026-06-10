const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { restrictTo } = require('../middlewares/auth');

router.get('/', appointmentController.getAppointments);
router.get('/counselors', appointmentController.getCounselors);
router.get('/available-slots', appointmentController.getAvailableSlots);
router.post('/', appointmentController.createAppointment);
router.put('/:id/approve', restrictTo('Admin', 'SuperAdmin'), appointmentController.approveAppointment);
router.put('/:id/reject', restrictTo('Admin', 'SuperAdmin'), appointmentController.rejectAppointment);
router.put('/:id/cancel', appointmentController.cancelAppointment);

module.exports = router;
