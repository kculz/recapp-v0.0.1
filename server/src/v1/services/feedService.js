const { Post, Comment, PostLike, User } = require('../../models');
const { scanText } = require('../utils/crisisScanner');
const { broadcastCrisisAlert } = require('../utils/socket');

/**
 * Fetch all posts in a specific channel, decorated with like status and comment count
 * @param {string} channel
 * @param {number} currentUserId
 * @returns {Array<object>} decoratedPosts
 */
exports.findPostsByChannel = async (channel, currentUserId) => {
  const posts = await Post.findAll({
    where: { channel },
    include: [
      { model: User, as: 'author', attributes: ['id', 'name', 'role'] }
    ],
    order: [['createdAt', 'DESC']]
  });

  const decorated = [];

  for (const post of posts) {
    // Check if current user has liked the post
    const like = await PostLike.findOne({
      where: { postId: post.id, userId: currentUserId }
    });

    // Count comments
    const commentCount = await Comment.count({
      where: { postId: post.id }
    });

    decorated.push({
      id: post.id,
      userId: post.userId,
      channel: post.channel,
      title: post.title,
      content: post.content,
      likesCount: post.likesCount,
      flagged: post.flagged,
      createdAt: post.createdAt,
      author: post.author,
      commentCount,
      userHasLiked: !!like
    });
  }

  return decorated;
};

/**
 * Create a new community post, scanning for crisis triggers
 * @param {number} userId
 * @param {object} postData
 * @returns {Post}
 */
exports.createPost = async (userId, postData) => {
  const { channel, title, content } = postData;

  if (!channel || !title || !content) {
    throw new Error('Channel, title, and content are required.');
  }

  // Scan for crisis keywords
  const isCrisis = scanText(title) || scanText(content);
  if (isCrisis) {
    console.warn(`\n==================================================`);
    console.warn(`[CRISIS WARNING] User #${userId} posted flagged content!`);
    console.warn(`[CRISIS WARNING] Content: "${content}"`);
    console.warn(`==================================================\n`);
  }

  const post = await Post.create({
    userId,
    channel,
    title,
    content,
    flagged: isCrisis
  });

  // Emit crisis alert if flagged
  if (isCrisis) {
    const author = await User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'role']
    });
    broadcastCrisisAlert({
      type: 'post',
      id: post.id,
      title: post.title,
      content: post.content,
      createdAt: post.createdAt,
      author
    });
  }

  return post;
};

/**
 * Toggle like status for a post
 * @param {number} userId
 * @param {number} postId
 * @returns {object} result
 */
exports.togglePostLike = async (userId, postId) => {
  const post = await Post.findByPk(postId);
  if (!post) {
    throw new Error('Post not found.');
  }

  const existingLike = await PostLike.findOne({
    where: { postId, userId }
  });

  if (existingLike) {
    // Unlike
    await existingLike.destroy();
    post.likesCount = Math.max(0, post.likesCount - 1);
    await post.save();
    return { liked: false, likesCount: post.likesCount };
  } else {
    // Like
    await PostLike.create({ postId, userId });
    post.likesCount += 1;
    await post.save();
    return { liked: true, likesCount: post.likesCount };
  }
};

/**
 * Get all comments for a post
 * @param {number} postId
 * @returns {Array<Comment>}
 */
exports.getComments = async (postId) => {
  return await Comment.findAll({
    where: { postId },
    include: [
      { model: User, as: 'author', attributes: ['id', 'name', 'role'] }
    ],
    order: [['createdAt', 'ASC']]
  });
};

/**
 * Add a comment to a post, scanning for crisis triggers
 * @param {number} userId
 * @param {number} postId
 * @param {string} content
 * @returns {Comment}
 */
exports.addComment = async (userId, postId, content) => {
  if (!content || !content.trim()) {
    throw new Error('Comment content is required.');
  }

  // Confirm post exists
  const post = await Post.findByPk(postId);
  if (!post) {
    throw new Error('Post not found.');
  }

  // Scan comment content for crisis triggers
  const isCrisis = scanText(content);
  if (isCrisis) {
    console.warn(`\n==================================================`);
    console.warn(`[CRISIS WARNING] User #${userId} commented flagged content on post #${postId}!`);
    console.warn(`[CRISIS WARNING] Comment: "${content}"`);
    console.warn(`==================================================\n`);
  }

  const comment = await Comment.create({
    postId,
    userId,
    content: content.trim(),
    flagged: isCrisis
  });

  // Emit crisis alert if flagged
  if (isCrisis) {
    const author = await User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'role']
    });
    broadcastCrisisAlert({
      type: 'comment',
      id: comment.id,
      postId,
      content: comment.content,
      createdAt: comment.createdAt,
      author,
      post: { id: post.id, title: post.title }
    });
  }

  return comment;
};
