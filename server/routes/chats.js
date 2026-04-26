const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// Временный маршрут для чатов – возвращает пустой массив
router.get('/', auth, (req, res) => {
  res.json({ success: true, chats: [] });
});

module.exports = router;