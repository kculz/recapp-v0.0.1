const { Post, Comment, Message, User } = require('../../models');

/**
 * Fetch all unresolved flagged posts, comments, and messages
 */
exports.getFlaggedAlerts = async (req, res, next) => {
  try {
    // 1. Fetch flagged posts
    const posts = await Post.findAll({
      where: { flagged: true, resolved: false },
      include: [
        { model: User, as: 'author', attributes: ['id', 'name', 'email', 'role'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // 2. Fetch flagged comments
    const comments = await Comment.findAll({
      where: { flagged: true, resolved: false },
      include: [
        { model: User, as: 'author', attributes: ['id', 'name', 'email', 'role'] },
        { model: Post, as: 'post', attributes: ['id', 'title'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // 3. Fetch flagged messages
    const messages = await Message.findAll({
      where: { flagged: true, resolved: false },
      include: [
        { model: User, as: 'Sender', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'Receiver', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        posts,
        comments,
        messages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resolve a flagged safety alert
 */
exports.resolveAlert = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const itemId = parseInt(id, 10);

    if (isNaN(itemId)) {
      return res.status(400).json({ success: false, error: 'Invalid item ID parameter.' });
    }

    let item;
    if (type === 'post') {
      item = await Post.findByPk(itemId);
    } else if (type === 'comment') {
      item = await Comment.findByPk(itemId);
    } else if (type === 'message') {
      item = await Message.findByPk(itemId);
    } else {
      return res.status(400).json({ success: false, error: 'Invalid alert type. Must be post, comment, or message.' });
    }

    if (!item) {
      return res.status(404).json({ success: false, error: 'Alert item not found.' });
    }

    // Set resolved to true
    item.resolved = true;
    await item.save();

    res.json({
      success: true,
      message: 'Alert resolved successfully.',
      data: { id: item.id, type, resolved: item.resolved }
    });
  } catch (error) {
    next(error);
  }
};
