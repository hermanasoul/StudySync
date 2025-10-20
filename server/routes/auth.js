const express = require('express');
const router = express.Router();

// тест
router.post('/register', (req, res) => {
  res.json({ 
    message: 'User registration endpoint',
    data: req.body 
  });
});

router.post('/login', (req, res) => {
  res.json({ 
    message: 'User login endpoint',
    data: req.body 
  });
});

module.exports = router;