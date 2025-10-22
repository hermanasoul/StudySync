const express = require('express');
const Note = require('../models/Note');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const note = new Note({
      ...req.body,
      authorId: req.user.id
    });

    await note.save();
    res.status(201).json({
      success: true,
      note: await note.populate('authorId', 'name email')
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/subject/:subjectId', auth, async (req, res) => {
  try {
    const notes = await Note.find({
      subjectId: req.params.subjectId,
      $or: [
        { authorId: req.user.id },
        { isPublic: true }
      ]
    }).populate('authorId', 'name email').sort({ createdAt: -1 });

    res.json({
      success: true,
      notes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    const notes = await Note.find({ authorId: req.user.id })
      .populate('subjectId', 'name')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      notes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      authorId: req.user.id
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        error: 'Note not found'
      });
    }

    Object.assign(note, req.body);
    await note.save();

    res.json({
      success: true,
      note: await note.populate('authorId', 'name email')
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      authorId: req.user.id
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        error: 'Note not found'
      });
    }

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
