const messageService = require('../services/messageService');

/**
 * Fetch chronological chat history with a specific user
 */
exports.getChatLog = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const contactId = parseInt(req.params.userId, 10);

    if (isNaN(contactId)) {
      return res.status(400).json({ success: false, error: 'Invalid user parameter.' });
    }

    const messages = await messageService.getChatLog(currentUserId, contactId);
    
    res.json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a new direct message
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const senderId = req.user.id;
    const { receiverId, messageText } = req.body;

    if (!receiverId || !messageText) {
      return res.status(400).json({
        success: false,
        error: 'Receiver ID and message text are required.'
      });
    }

    const message = await messageService.saveMessage(
      senderId,
      parseInt(receiverId, 10),
      messageText
    );

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Fetch list of active conversations
 */
exports.getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const list = await messageService.getConversationsList(userId);
    
    res.json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    next(error);
  }
};
