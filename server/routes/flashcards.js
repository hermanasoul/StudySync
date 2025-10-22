const express = require('express');
const Flashcard = require('../models/Flashcard');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const flashcard = new Flashcard({
      ...req.body,
      authorId: req.user.id
    });

    await flashcard.save();
    res.status(201).json({
      success: true,
      flashcard: await flashcard.populate('authorId', 'name email')
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
    const flashcards = await Flashcard.find({
      subjectId: req.params.subjectId,
      $or: [
        { authorId: req.user.id },
        { groupId: { $in: await getUsersGroups(req.user.id) } }
      ]
    }).populate('authorId', 'name email').sort({ createdAt: -1 });

    res.json({
      success: true,
      flashcards
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/study/:subjectId', auth, async (req, res) => {
  try {
    const dueCards = await Flashcard.find({
      subjectId: req.params.subjectId,
      authorId: req.user.id,
      $or: [
        { lastReviewed: { $exists: false } },
        { lastReviewed: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      ]
    }).limit(20);

    res.json({
      success: true,
      flashcards: dueCards
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.put('/:id/know', auth, async (req, res) => {
  try {
    const flashcard = await Flashcard.findOne({
      _id: req.params.id,
      authorId: req.user.id
    });

    if (!flashcard) {
      return res.status(404).json({
        success: false,
        error: 'Flashcard not found'
      });
    }

    flashcard.knowCount += 1;
    flashcard.lastReviewed = new Date();
    
    if (flashcard.knowCount >= 3) {
      flashcard.difficulty = 'easy';
    } else if (flashcard.knowCount >= 1) {
      flashcard.difficulty = 'medium';
    }

    await flashcard.save();

    res.json({
      success: true,
      flashcard
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.put('/:id/dont-know', auth, async (req, res) => {
  try {
    const flashcard = await Flashcard.findOne({
      _id: req.params.id,
      authorId: req.user.id
    });

    if (!flashcard) {
      return res.status(404).json({
        success: false,
        error: 'Flashcard not found'
      });
    }

    flashcard.dontKnowCount += 1;
    flashcard.lastReviewed = new Date();
    flashcard.difficulty = 'hard';
    await flashcard.save();

    res.json({
      success: true,
      flashcard
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const flashcard = await Flashcard.findOne({
      _id: req.params.id,
      authorId: req.user.id
    });

    if (!flashcard) {
      return res.status(404).json({
        success: false,
        error: 'Flashcard not found'
      });
    }

    Object.assign(flashcard, req.body);
    await flashcard.save();

    res.json({
      success: true,
      flashcard: await flashcard.populate('authorId', 'name email')
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
    const flashcard = await Flashcard.findOneAndDelete({
      _id: req.params.id,
      authorId: req.user.id
    });

    if (!flashcard) {
      return res.status(404).json({
        success: false,
        error: 'Flashcard not found'
      });
    }

    res.json({
      success: true,
      message: 'Flashcard deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

async function getUsersGroups(userId) {
  return [];
}

module.exports = router;
