// server/routes/users.js
const express = require('express');
const router = express.Router();

// Пример: GET /api/users
router.get('/', (req, res) => {
  res.json({ message: 'Users route is working!' });
});

// Пример: GET /api/users/:id
router.get('/:id', (req, res) => {
  res.json({ message: `User with ID ${req.params.id} accessed` });
});

module.exports = router;
