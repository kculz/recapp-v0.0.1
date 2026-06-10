const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');

router.get('/', feedController.getFeed);
router.post('/', feedController.createPost);
router.post('/:id/like', feedController.toggleLike);
router.get('/:id/comments', feedController.getComments);
router.post('/:id/comments', feedController.addComment);

module.exports = router;
