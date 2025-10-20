const express = require('express');
const router = express.Router();

// GET /api/subjects - получить все предметы
router.get('/', (req, res) => {
  res.json({
    message: 'List of all subjects',
    subjects: [
      {
        id: 1,
        name: 'Biology',
        description: 'Study of living organisms',
        color: 'green-500',
        progress: 75
      },
      {
        id: 2, 
        name: 'Chemistry',
        description: 'Study of matter and its properties',
        color: 'blue-500',
        progress: 40
      },
      {
        id: 3,
        name: 'Mathematics', 
        description: 'Study of numbers and calculations',
        color: 'purple-500',
        progress: 20
      }
    ]
  });
});

// GET /api/subjects/:id - получить предмет по ID
router.get('/:id', (req, res) => {
  res.json({
    message: `Subject details for ID: ${req.params.id}`,
    subject: {
      id: req.params.id,
      name: 'Biology',
      description: 'Study of living organisms'
    }
  });
});

module.exports = router;