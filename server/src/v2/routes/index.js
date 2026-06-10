const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Welcome to RecApp API Version 2 (Beta)' });
});

module.exports = router;
