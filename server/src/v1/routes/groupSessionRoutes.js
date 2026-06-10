const express = require('express');
const router = express.Router();
const {
  listSessions, getMyJoinedSessions, createSession,
  updateSession, cancelSession, joinSession, leaveSession
} = require('../controllers/groupSessionController');

router.get('/', listSessions);
router.get('/mine', getMyJoinedSessions);
router.post('/', createSession);
router.patch('/:id', updateSession);
router.delete('/:id/cancel', cancelSession);
router.post('/:id/join', joinSession);
router.delete('/:id/leave', leaveSession);

module.exports = router;
