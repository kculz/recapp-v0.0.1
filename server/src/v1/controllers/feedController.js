const feedService = require('../services/feedService');

/**
 * Fetch feed posts for a specific channel
 */
exports.getFeed = async (req, res, next) => {
  try {
    const { channel } = req.query;
    if (!channel) {
      return res.status(400).json({ success: false, error: 'Channel query parameter is required.' });
    }

    const posts = await feedService.findPostsByChannel(channel, req.user.id);
    
    res.json({
      success: true,
      count: posts.length,
      data: posts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new feed post
 */
exports.createPost = async (req, res, next) => {
  try {
    const post = await feedService.createPost(req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: 'Post created successfully.',
      data: post
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Toggle like/unlike status for a post
 */
exports.toggleLike = async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID parameter.' });
    }

    const result = await feedService.togglePostLike(req.user.id, postId);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Fetch comment threads for a post
 */
exports.getComments = async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID parameter.' });
    }

    const comments = await feedService.getComments(postId);
    res.json({
      success: true,
      count: comments.length,
      data: comments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Append a comment to a post
 */
exports.addComment = async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const { content } = req.body;

    if (isNaN(postId)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID parameter.' });
    }

    const comment = await feedService.addComment(req.user.id, postId, content);
    res.status(201).json({
      success: true,
      message: 'Comment added successfully.',
      data: comment
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
