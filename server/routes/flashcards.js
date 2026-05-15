const { body, param, query } = require('express-validator');
const express = require('express');
const Flashcard = require('../models/Flashcard');
const { auth } = require('../middleware/auth');
const mongoose = require('mongoose');
const { 
  flashcardValidation, 
  idValidation, 
  subjectIdValidation,
  sanitizeInput 
} = require('../middleware/validation');
const { AppError, catchAsync } = require('../middleware/errorHandler');

const router = express.Router();

// Вспомогательная функция для получения групп пользователя
async function getUsersGroups(userId) {
  const Group = require('../models/Group');
  const groups = await Group.find({ 'members.user': userId }).select('_id');
  return groups.map(g => g._id);
}

// ---------- СОЗДАНИЕ ----------
router.post('/', auth, sanitizeInput, flashcardValidation, catchAsync(async (req, res) => {
  const { question, answer, hint, subjectId, groupId, difficulty } = req.body;
  const Subject = require('../models/Subject');
  const subject = await Subject.findById(subjectId);
  if (!subject) throw new AppError('Предмет не найден', 404);

  if (groupId) {
    const Group = require('../models/Group');
    const group = await Group.findOne({ _id: groupId, 'members.user': req.user.id });
    if (!group) throw new AppError('Группа не найдена или доступ запрещен', 404);
  }

  const flashcard = await Flashcard.create({
    question: question.trim(),
    answer: answer.trim(),
    hint: hint ? hint.trim() : '',
    subjectId,
    authorId: req.user.id,
    groupId: groupId || null,
    difficulty: difficulty || 'medium',
    knowCount: 0,
    dontKnowCount: 0
  });

  const populated = await Flashcard.findById(flashcard._id)
    .populate('authorId', 'name email avatarUrl')
    .select('-__v');

  console.log('✅ Карточка создана:', populated._id); // лог

  res.status(201).json({
    success: true,
    message: 'Карточка успешно создана',
    flashcard: {
      _id: populated._id,
      question: populated.question,
      answer: populated.answer,
      hint: populated.hint,
      subjectId: populated.subjectId,
      authorId: {
        _id: populated.authorId._id,
        name: populated.authorId.name,
        email: populated.authorId.email,
        avatarUrl: populated.authorId.avatarUrl
      },
      groupId: populated.groupId,
      difficulty: populated.difficulty,
      knowCount: populated.knowCount,
      dontKnowCount: populated.dontKnowCount,
      lastReviewed: populated.lastReviewed,
      createdAt: populated.createdAt,
      updatedAt: populated.updatedAt
    }
  });
}));

// ---------- ПОЛУЧЕНИЕ ПО ПРЕДМЕТУ ----------
router.get('/subject/:subjectId', auth, subjectIdValidation, catchAsync(async (req, res) => {
  const { page = 1, limit = 20, difficulty = 'all', reviewed = 'all', groupId } = req.query;
  const skip = (page - 1) * limit;

  const filter = {
    subjectId: req.params.subjectId,
    $or: [
      { authorId: req.user.id },
      { groupId: { $in: await getUsersGroups(req.user.id) } }
    ]
  };

  if (groupId) filter.groupId = groupId;
  else filter.authorId = req.user.id;

  if (difficulty !== 'all') filter.difficulty = difficulty;
  if (reviewed === 'true') filter.lastReviewed = { $exists: true };
  else if (reviewed === 'false') filter.lastReviewed = { $exists: false };

  const [flashcards, total] = await Promise.all([
    Flashcard.find(filter)
      .populate('authorId', 'name email avatarUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v'),
    Flashcard.countDocuments(filter)
  ]);

  res.json({
    success: true,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    count: flashcards.length,
    flashcards: flashcards.map(f => ({
      _id: f._id,
      question: f.question,
      answer: f.answer,
      hint: f.hint,
      subjectId: f.subjectId,
      authorId: {
        _id: f.authorId._id,
        name: f.authorId.name,
        email: f.authorId.email,
        avatarUrl: f.authorId.avatarUrl
      },
      groupId: f.groupId,
      difficulty: f.difficulty,
      knowCount: f.knowCount,
      dontKnowCount: f.dontKnowCount,
      lastReviewed: f.lastReviewed,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt
    }))
  });
}));

// ---------- ДЛЯ ИЗУЧЕНИЯ ----------
router.get('/study/:subjectId', auth, subjectIdValidation, catchAsync(async (req, res) => {
  const { limit = 20, difficulty = 'mixed' } = req.query;

  const filter = {
    subjectId: req.params.subjectId,
    authorId: req.user.id,
    $or: [
      { lastReviewed: { $exists: false } },
      { lastReviewed: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
    ]
  };

  if (difficulty !== 'mixed') filter.difficulty = difficulty;

  const flashcards = await Flashcard.find(filter)
    .sort({ dontKnowCount: -1, lastReviewed: 1, createdAt: 1 })
    .limit(parseInt(limit))
    .select('-__v');

  res.json({
    success: true,
    count: flashcards.length,
    flashcards: flashcards.map(f => ({
      _id: f._id,
      question: f.question,
      answer: f.answer,
      hint: f.hint,
      difficulty: f.difficulty,
      knowCount: f.knowCount,
      dontKnowCount: f.dontKnowCount,
      lastReviewed: f.lastReviewed
    }))
  });
}));

// ---------- ОТМЕТКИ ЗНАЮ / НЕ ЗНАЮ (оставлены с привязкой к автору) ----------
router.put('/:id/know', auth, idValidation, catchAsync(async (req, res) => {
  const flashcard = await Flashcard.findOne({ _id: req.params.id, authorId: req.user.id });
  if (!flashcard) throw new AppError('Карточка не найдена', 404);

  flashcard.knowCount += 1;
  flashcard.lastReviewed = new Date();
  if (flashcard.knowCount >= 3) flashcard.difficulty = 'easy';
  else if (flashcard.knowCount >= 1) flashcard.difficulty = 'medium';
  await flashcard.save();

  res.json({
    success: true,
    message: 'Карточка отмечена как "Знаю"',
    flashcard: {
      _id: flashcard._id,
      knowCount: flashcard.knowCount,
      dontKnowCount: flashcard.dontKnowCount,
      difficulty: flashcard.difficulty,
      lastReviewed: flashcard.lastReviewed
    }
  });
}));

router.put('/:id/unknown', auth, idValidation, catchAsync(async (req, res) => {
  const flashcard = await Flashcard.findOne({ _id: req.params.id, authorId: req.user.id });
  if (!flashcard) throw new AppError('Карточка не найдена', 404);

  flashcard.dontKnowCount += 1;
  flashcard.lastReviewed = new Date();
  flashcard.difficulty = 'hard';
  await flashcard.save();

  res.json({
    success: true,
    message: 'Карточка отмечена как "Не знаю"',
    flashcard: {
      _id: flashcard._id,
      knowCount: flashcard.knowCount,
      dontKnowCount: flashcard.dontKnowCount,
      difficulty: flashcard.difficulty,
      lastReviewed: flashcard.lastReviewed
    }
  });
}));

// ========== РЕДАКТИРОВАНИЕ (БЕЗ ПРОВЕРКИ АВТОРА) ==========
router.put('/:id', auth, idValidation, sanitizeInput, [
  body('question').optional().trim().isLength({ min: 3, max: 500 }),
  body('answer').optional().trim().isLength({ min: 1, max: 1000 }),
  body('hint').optional().trim().isLength({ max: 200 }),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard'])
], catchAsync(async (req, res) => {
  const { question, answer, hint, difficulty } = req.body;

  const flashcard = await Flashcard.findById(req.params.id);
  if (!flashcard) throw new AppError('Карточка не найдена', 404);

  if (question !== undefined) flashcard.question = question.trim();
  if (answer !== undefined) flashcard.answer = answer.trim();
  if (hint !== undefined) flashcard.hint = hint.trim();
  if (difficulty !== undefined) flashcard.difficulty = difficulty;

  await flashcard.save();

  console.log('✏️ Карточка обновлена:', flashcard._id); // лог

  const updated = await Flashcard.findById(flashcard._id)
    .populate('authorId', 'name email avatarUrl')
    .select('-__v');

  res.json({
    success: true,
    message: 'Карточка успешно обновлена',
    flashcard: {
      _id: updated._id,
      question: updated.question,
      answer: updated.answer,
      hint: updated.hint,
      difficulty: updated.difficulty,
      knowCount: updated.knowCount,
      dontKnowCount: updated.dontKnowCount,
      lastReviewed: updated.lastReviewed,
      updatedAt: updated.updatedAt
    }
  });
}));

// ========== УДАЛЕНИЕ (БЕЗ ПРОВЕРКИ АВТОРА) ==========
router.delete('/:id', auth, idValidation, catchAsync(async (req, res) => {
  const flashcard = await Flashcard.findByIdAndDelete(req.params.id);
  if (!flashcard) throw new AppError('Карточка не найдена', 404);

  console.log('🗑️ Карточка удалена:', req.params.id); // лог

  res.json({ success: true, message: 'Карточка успешно удалена' });
}));

// ---------- СТАТИСТИКА ----------
router.get('/stats/:subjectId', auth, subjectIdValidation, catchAsync(async (req, res) => {
  const stats = await Flashcard.aggregate([
    {
      $match: {
        subjectId: new mongoose.Types.ObjectId(req.params.subjectId),
        authorId: new mongoose.Types.ObjectId(req.user.id)
      }
    },
    {
      $group: {
        _id: null,
        totalCards: { $sum: 1 },
        easyCards: { $sum: { $cond: [{ $eq: ["$difficulty", "easy"] }, 1, 0] } },
        mediumCards: { $sum: { $cond: [{ $eq: ["$difficulty", "medium"] }, 1, 0] } },
        hardCards: { $sum: { $cond: [{ $eq: ["$difficulty", "hard"] }, 1, 0] } },
        totalKnowCount: { $sum: "$knowCount" },
        totalDontKnowCount: { $sum: "$dontKnowCount" },
        lastReviewed: { $max: "$lastReviewed" }
      }
    },
    {
      $project: {
        totalCards: 1,
        easyCards: 1,
        mediumCards: 1,
        hardCards: 1,
        totalKnowCount: 1,
        totalDontKnowCount: 1,
        successRate: {
          $cond: [
            { $gt: [{ $add: ["$totalKnowCount", "$totalDontKnowCount"] }, 0] },
            {
              $multiply: [
                { $divide: ["$totalKnowCount", { $add: ["$totalKnowCount", "$totalDontKnowCount"] }] },
                100
              ]
            },
            0
          ]
        },
        lastReviewed: 1
      }
    }
  ]);

  const result = stats[0] || {
    totalCards: 0, easyCards: 0, mediumCards: 0, hardCards: 0,
    totalKnowCount: 0, totalDontKnowCount: 0, successRate: 0, lastReviewed: null
  };

  res.json({ success: true, stats: result });
}));

router.put('/:id/reset', auth, idValidation, catchAsync(async (req, res) => {
  const flashcard = await Flashcard.findOne({ _id: req.params.id, authorId: req.user.id });
  if (!flashcard) throw new AppError('Карточка не найдена', 404);

  flashcard.knowCount = 0;
  flashcard.dontKnowCount = 0;
  flashcard.difficulty = 'medium';
  flashcard.lastReviewed = null;
  await flashcard.save();

  res.json({
    success: true,
    message: 'Статистика карточки сброшена',
    flashcard: {
      _id: flashcard._id,
      knowCount: flashcard.knowCount,
      dontKnowCount: flashcard.dontKnowCount,
      difficulty: flashcard.difficulty,
      lastReviewed: flashcard.lastReviewed
    }
  });
}));

module.exports = router;