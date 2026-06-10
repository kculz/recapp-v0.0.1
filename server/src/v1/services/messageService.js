const { Message, User } = require('../../models');
const { Op } = require('sequelize');
const { scanText } = require('../utils/crisisScanner');
const { sendDirectMessage, broadcastCrisisAlert } = require('../utils/socket');

/**
 * Send a new direct message
 * @param {number} senderId
 * @param {number} receiverId
 * @param {string} text
 * @returns {Message}
 */
exports.saveMessage = async (senderId, receiverId, text) => {
  if (!receiverId || !text || !text.trim()) {
    throw new Error('Receiver ID and message text are required.');
  }

  // Confirm receiver exists
  const receiver = await User.findByPk(receiverId);
  if (!receiver) {
    throw new Error('Receiver user account not found.');
  }

  // Scan text for crisis keywords
  const isCrisis = scanText(text);
  if (isCrisis) {
    console.warn(`\n==================================================`);
    console.warn(`[CRISIS WARNING] User #${senderId} sent flagged DM to User #${receiverId}!`);
    console.warn(`[CRISIS WARNING] Content: "${text}"`);
    console.warn(`==================================================\n`);
  }

  const savedMessage = await Message.create({
    senderId,
    receiverId,
    messageText: text.trim(),
    isRead: false,
    flagged: isCrisis
  });

  const sender = await User.findByPk(senderId, {
    attributes: ['id', 'name', 'email', 'role']
  });

  // Emit direct message to receiver room in real-time
  sendDirectMessage(receiverId, {
    id: savedMessage.id,
    senderId,
    receiverId,
    messageText: savedMessage.messageText,
    isRead: false,
    flagged: isCrisis,
    createdAt: savedMessage.createdAt,
    Sender: sender
  });

  // Emit alert to admin alerts room in real-time if crisis keyword triggers
  if (isCrisis) {
    const receiverDetails = await User.findByPk(receiverId, {
      attributes: ['id', 'name', 'email']
    });
    broadcastCrisisAlert({
      type: 'message',
      id: savedMessage.id,
      messageText: savedMessage.messageText,
      createdAt: savedMessage.createdAt,
      Sender: sender,
      Receiver: receiverDetails
    });
  }

  return savedMessage;
};

/**
 * Fetch chat log between two users and mark received messages as read
 * @param {number} userAId - Current user ID
 * @param {number} userBId - Contact user ID
 * @returns {Array<Message>}
 */
exports.getChatLog = async (userAId, userBId) => {
  // Mark received messages from userB as read
  await Message.update(
    { isRead: true },
    {
      where: {
        receiverId: userAId,
        senderId: userBId,
        isRead: false
      }
    }
  );

  // Fetch chronological chat log
  return await Message.findAll({
    where: {
      [Op.or]: [
        { senderId: userAId, receiverId: userBId },
        { senderId: userBId, receiverId: userAId }
      ]
    },
    order: [['createdAt', 'ASC']]
  });
};

/**
 * Get active conversations list with unread counts and last message details
 * @param {number} userId
 * @returns {Array<object>} conversations
 */
exports.getConversationsList = async (userId) => {
  // Find all messages sent/received by this user
  const messages = await Message.findAll({
    where: {
      [Op.or]: [{ senderId: userId }, { receiverId: userId }]
    },
    attributes: ['senderId', 'receiverId'],
    raw: true
  });

  // Extract list of unique contact IDs
  const contactIds = new Set();
  messages.forEach(msg => {
    if (msg.senderId !== userId) contactIds.add(msg.senderId);
    if (msg.receiverId !== userId) contactIds.add(msg.receiverId);
  });

  const conversations = [];

  for (const contactId of contactIds) {
    const contactUser = await User.findByPk(contactId, {
      attributes: ['id', 'name', 'email', 'role']
    });

    if (!contactUser) continue;

    // Get unread count
    const unreadCount = await Message.count({
      where: {
        receiverId: userId,
        senderId: contactId,
        isRead: false
      }
    });

    // Get last message details
    const lastMessage = await Message.findOne({
      where: {
        [Op.or]: [
          { senderId: userId, receiverId: contactId },
          { senderId: contactId, receiverId: userId }
        ]
      },
      order: [['createdAt', 'DESC']]
    });

    conversations.push({
      contact: contactUser,
      unreadCount,
      lastMessage: lastMessage ? {
        id: lastMessage.id,
        messageText: lastMessage.messageText,
        senderId: lastMessage.senderId,
        createdAt: lastMessage.createdAt
      } : null
    });
  }

  // Sort conversations by last message timestamp (newest first)
  return conversations.sort((a, b) => {
    const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return timeB - timeA;
  });
};
