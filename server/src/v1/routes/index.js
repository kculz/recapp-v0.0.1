const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');
const authRoutes = require('./authRoutes');
const journalRoutes = require('./journalRoutes');
const appointmentRoutes = require('./appointmentRoutes');
const messageRoutes = require('./messageRoutes');
const feedRoutes = require('./feedRoutes');
const alertRoutes = require('./alertRoutes');
const libraryRoutes = require('./libraryRoutes');
const progressRoutes = require('./progressRoutes');
const groupSessionRoutes = require('./groupSessionRoutes');
const familyRoutes = require('./familyRoutes');
const { protect } = require('../middlewares/auth');

router.use('/auth', authRoutes);
router.use('/users', protect, userRoutes);
router.use('/journals', protect, journalRoutes);
router.use('/appointments', protect, appointmentRoutes);
router.use('/messages', protect, messageRoutes);
router.use('/feed', protect, feedRoutes);
router.use('/alerts', protect, alertRoutes);
router.use('/library', protect, libraryRoutes);
router.use('/progress', protect, progressRoutes);
router.use('/group-sessions', protect, groupSessionRoutes);
router.use('/family', protect, familyRoutes);

module.exports = router;


