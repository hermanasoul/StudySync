const express = require('express');
const Subject = require('../models/Subject');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const subjects = await Subject.find({
      $or: [
        { createdBy: req.user._id },
        { isPublic: true }
      ]
    }).sort({ name: 1 });

    const formattedSubjects = subjects.map(subject => ({
      id: subject._id,
      name: subject.name,
      description: subject.description,
      color: subject.color,
      icon: subject.icon,
      progress: 0
    }));

    res.json({
      success: true,
      subjects: formattedSubjects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const subject = await Subject.findOne({
      _id: req.params.id,
      $or: [
        { createdBy: req.user._id },
        { isPublic: true }
      ]
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }

    res.json({
      success: true,
      subject: {
        id: subject._id,
        name: subject.name,
        description: subject.description,
        color: subject.color,
        icon: subject.icon
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const subject = new Subject({
      ...req.body,
      createdBy: req.user._id
    });

    await subject.save();
    res.status(201).json({
      success: true,
      subject: {
        id: subject._id,
        name: subject.name,
        description: subject.description,
        color: subject.color,
        icon: subject.icon
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;