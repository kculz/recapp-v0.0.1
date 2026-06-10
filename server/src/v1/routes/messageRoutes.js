const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

router.get('/conversations', messageController.getConversations);
router.get('/chat/:userId', messageController.getChatLog);
router.post('/', messageController.sendMessage);

module.exports = router;
