// server/routes/flashcards.js
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

/**
 * @swagger
 * tags:
 *   name: Flashcards
 *   description: Управление учебными карточками
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Flashcard:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         question:
 *           type: string
 *         answer:
 *           type: string
 *         hint:
 *           type: string
 *         subjectId:
 *           type: string
 *         authorId:
 *           $ref: '#/components/schemas/User'
 *         groupId:
 *           type: string
 *         difficulty:
 *           type: string
 *           enum: [easy, medium, hard]
 *         knowCount:
 *           type: number
 *         dontKnowCount:
 *           type: number
 *         lastReviewed:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /flashcards:
 *   post:
 *     summary: Создать новую карточку
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - answer
 *               - subjectId
 *             properties:
 *               question:
 *                 type: string
 *               answer:
 *                 type: string
 *               hint:
 *                 type: string
 *               subjectId:
 *                 type: string
 *               groupId:
 *                 type: string
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *                 default: medium
 *     responses:
 *       201:
 *         description: Карточка создана
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 flashcard:
 *                   $ref: '#/components/schemas/Flashcard'
 */
router.post('/',
  auth,
  sanitizeInput,
  flashcardValidation,
  catchAsync(async (req, res) => {
    const { question, answer, hint, subjectId, groupId, difficulty } = req.body;

    // Проверяем существование предмета
    const Subject = require('../models/Subject');
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      throw new AppError('Предмет не найден', 404);
    }

    // Если карточка для группы, проверяем доступ
    if (groupId) {
      const Group = require('../models/Group');
      const group = await Group.findOne({
        _id: groupId,
        'members.user': req.user.id
      });

      if (!group) {
        throw new AppError('Группа не найдена или доступ запрещен', 404);
      }
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

    const populatedFlashcard = await Flashcard.findById(flashcard._id)
      .populate('authorId', 'name email avatarUrl')
      .select('-__v');

    res.status(201).json({
      success: true,
      message: 'Карточка успешно создана',
      flashcard: {
        id: populatedFlashcard._id,
        question: populatedFlashcard.question,
        answer: populatedFlashcard.answer,
        hint: populatedFlashcard.hint,
        subjectId: populatedFlashcard.subjectId,
        authorId: {
          id: populatedFlashcard.authorId._id,
          name: populatedFlashcard.authorId.name,
          email: populatedFlashcard.authorId.email,
          avatarUrl: populatedFlashcard.authorId.avatarUrl
        },
        groupId: populatedFlashcard.groupId,
        difficulty: populatedFlashcard.difficulty,
        knowCount: populatedFlashcard.knowCount,
        dontKnowCount: populatedFlashcard.dontKnowCount,
        lastReviewed: populatedFlashcard.lastReviewed,
        createdAt: populatedFlashcard.createdAt,
        updatedAt: populatedFlashcard.updatedAt
      }
    });
  })
);

/**
 * @swagger
 * /flashcards/subject/{subjectId}:
 *   get:
 *     summary: Получить карточки по предмету
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID предмета
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [easy, medium, hard, all]
 *       - in: query
 *         name: reviewed
 *         schema:
 *           type: string
 *           enum: [true, false, all]
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Список карточек
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 pagination:
 *                   type: object
 *                 count:
 *                   type: integer
 *                 flashcards:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Flashcard'
 */
router.get('/subject/:subjectId',
  auth,
  subjectIdValidation,
  [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Номер страницы должен быть положительным числом'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Лимит должен быть от 1 до 100'),
    
    query('difficulty')
      .optional()
      .isIn(['easy', 'medium', 'hard', 'all']).withMessage('Сложность должна быть: easy, medium, hard или all'),
    
    query('reviewed')
      .optional()
      .isIn(['true', 'false', 'all']).withMessage('Параметр reviewed должен быть: true, false или all'),
    
    query('groupId')
      .optional()
      .isMongoId().withMessage('Некорректный ID группы')
  ],
  catchAsync(async (req, res) => {
    const { 
      page = 1, 
      limit = 20, 
      difficulty = 'all',
      reviewed = 'all',
      groupId 
    } = req.query;
    
    const skip = (page - 1) * limit;

    const filter = {
      subjectId: req.params.subjectId,
      $or: [
        { authorId: req.user.id },
        { groupId: { $in: await getUsersGroups(req.user.id) } }
      ]
    };

    // Фильтр по группе
    if (groupId) {
      filter.groupId = groupId;
    } else {
      // Если группа не указана, показываем только личные карточки
      filter.authorId = req.user.id;
    }

    // Фильтр по сложности
    if (difficulty !== 'all') {
      filter.difficulty = difficulty;
    }

    // Фильтр по просмотренным
    if (reviewed === 'true') {
      filter.lastReviewed = { $exists: true };
    } else if (reviewed === 'false') {
      filter.lastReviewed = { $exists: false };
    }

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
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      count: flashcards.length,
      flashcards: flashcards.map(flashcard => ({
        id: flashcard._id,
        question: flashcard.question,
        answer: flashcard.answer,
        hint: flashcard.hint,
        subjectId: flashcard.subjectId,
        authorId: {
          id: flashcard.authorId._id,
          name: flashcard.authorId.name,
          email: flashcard.authorId.email,
          avatarUrl: flashcard.authorId.avatarUrl
        },
        groupId: flashcard.groupId,
        difficulty: flashcard.difficulty,
        knowCount: flashcard.knowCount,
        dontKnowCount: flashcard.dontKnowCount,
        lastReviewed: flashcard.lastReviewed,
        createdAt: flashcard.createdAt,
        updatedAt: flashcard.updatedAt
      }))
    });
  })
);

/**
 * @swagger
 * /flashcards/study/{subjectId}:
 *   get:
 *     summary: Получить карточки для изучения
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID предмета
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [easy, medium, hard, mixed]
 *     responses:
 *       200:
 *         description: Карточки для изучения
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 flashcards:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Flashcard'
 */
router.get('/study/:subjectId',
  auth,
  subjectIdValidation,
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 }).withMessage('Лимит должен быть от 1 до 50'),
    
    query('difficulty')
      .optional()
      .isIn(['easy', 'medium', 'hard', 'mixed']).withMessage('Сложность должна быть: easy, medium, hard или mixed')
  ],
  catchAsync(async (req, res) => {
    const { limit = 20, difficulty = 'mixed' } = req.query;

    const filter = {
      subjectId: req.params.subjectId,
      authorId: req.user.id
    };

    // Выборка для изучения: не просмотренные или просмотренные более суток назад
    filter.$or = [
      { lastReviewed: { $exists: false } },
      { lastReviewed: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
    ];

    // Фильтр по сложности
    if (difficulty !== 'mixed') {
      filter.difficulty = difficulty;
    }

    // Сортировка: сначала карточки, которые не знаем
    const flashcards = await Flashcard.find(filter)
      .sort({ 
        dontKnowCount: -1,
        lastReviewed: 1,
        createdAt: 1 
      })
      .limit(parseInt(limit))
      .select('-__v');

    res.json({
      success: true,
      count: flashcards.length,
      flashcards: flashcards.map(flashcard => ({
        id: flashcard._id,
        question: flashcard.question,
        answer: flashcard.answer,
        hint: flashcard.hint,
        difficulty: flashcard.difficulty,
        knowCount: flashcard.knowCount,
        dontKnowCount: flashcard.dontKnowCount,
        lastReviewed: flashcard.lastReviewed
      }))
    });
  })
);

/**
 * @swagger
 * /flashcards/{id}/know:
 *   put:
 *     summary: Отметить карточку как "знаю"
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID карточки
 *     responses:
 *       200:
 *         description: Статистика обновлена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 flashcard:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     knowCount:
 *                       type: number
 *                     dontKnowCount:
 *                       type: number
 *                     difficulty:
 *                       type: string
 *                     lastReviewed:
 *                       type: string
 *                       format: date-time
 */
router.put('/:id/know',
  auth,
  idValidation,
  catchAsync(async (req, res) => {
    const flashcard = await Flashcard.findOne({
      _id: req.params.id,
      authorId: req.user.id
    });

    if (!flashcard) {
      throw new AppError('Карточка не найдена', 404);
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
      message: 'Карточка отмечена как "Знаю"',
      flashcard: {
        id: flashcard._id,
        knowCount: flashcard.knowCount,
        dontKnowCount: flashcard.dontKnowCount,
        difficulty: flashcard.difficulty,
        lastReviewed: flashcard.lastReviewed
      }
    });
  })
);

/**
 * @swagger
 * /flashcards/{id}/unknown:
 *   put:
 *     summary: Отметить карточку как "не знаю"
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID карточки
 *     responses:
 *       200:
 *         description: Статистика обновлена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 flashcard:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     knowCount:
 *                       type: number
 *                     dontKnowCount:
 *                       type: number
 *                     difficulty:
 *                       type: string
 *                     lastReviewed:
 *                       type: string
 *                       format: date-time
 */
router.put('/:id/unknown',
  auth,
  idValidation,
  catchAsync(async (req, res) => {
    const flashcard = await Flashcard.findOne({
      _id: req.params.id,
      authorId: req.user.id
    });

    if (!flashcard) {
      throw new AppError('Карточка не найдена', 404);
    }

    flashcard.dontKnowCount += 1;
    flashcard.lastReviewed = new Date();
    flashcard.difficulty = 'hard';
    
    await flashcard.save();

    res.json({
      success: true,
      message: 'Карточка отмечена как "Не знаю"',
      flashcard: {
        id: flashcard._id,
        knowCount: flashcard.knowCount,
        dontKnowCount: flashcard.dontKnowCount,
        difficulty: flashcard.difficulty,
        lastReviewed: flashcard.lastReviewed
      }
    });
  })
);

/**
 * @swagger
 * /flashcards/{id}:
 *   put:
 *     summary: Обновить карточку
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID карточки
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *               answer:
 *                 type: string
 *               hint:
 *                 type: string
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *     responses:
 *       200:
 *         description: Карточка обновлена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 flashcard:
 *                   $ref: '#/components/schemas/Flashcard'
 */
router.put('/:id',
  auth,
  idValidation,
  sanitizeInput,
  [
    body('question')
      .optional()
      .trim()
      .isLength({ min: 3, max: 500 }).withMessage('Вопрос должен быть от 3 до 500 символов'),
    
    body('answer')
      .optional()
      .trim()
      .isLength({ min: 1, max: 1000 }).withMessage('Ответ должен быть от 1 до 1000 символов'),
    
    body('hint')
      .optional()
      .trim()
      .isLength({ max: 200 }).withMessage('Подсказка не должна превышать 200 символов'),
    
    body('difficulty')
      .optional()
      .isIn(['easy', 'medium', 'hard']).withMessage('Сложность должна быть: easy, medium или hard')
  ],
  catchAsync(async (req, res) => {
    const { question, answer, hint, difficulty } = req.body;

    const flashcard = await Flashcard.findOne({
      _id: req.params.id,
      authorId: req.user.id
    });

    if (!flashcard) {
      throw new AppError('Карточка не найдена', 404);
    }

    if (question !== undefined) flashcard.question = question.trim();
    if (answer !== undefined) flashcard.answer = answer.trim();
    if (hint !== undefined) flashcard.hint = hint.trim();
    if (difficulty !== undefined) flashcard.difficulty = difficulty;

    await flashcard.save();

    const updatedFlashcard = await Flashcard.findById(flashcard._id)
      .populate('authorId', 'name email avatarUrl')
      .select('-__v');

    res.json({
      success: true,
      message: 'Карточка успешно обновлена',
      flashcard: {
        id: updatedFlashcard._id,
        question: updatedFlashcard.question,
        answer: updatedFlashcard.answer,
        hint: updatedFlashcard.hint,
        difficulty: updatedFlashcard.difficulty,
        knowCount: updatedFlashcard.knowCount,
        dontKnowCount: updatedFlashcard.dontKnowCount,
        lastReviewed: updatedFlashcard.lastReviewed,
        updatedAt: updatedFlashcard.updatedAt
      }
    });
  })
);

/**
 * @swagger
 * /flashcards/{id}:
 *   delete:
 *     summary: Удалить карточку
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID карточки
 *     responses:
 *       200:
 *         description: Карточка удалена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.delete('/:id',
  auth,
  idValidation,
  catchAsync(async (req, res) => {
    const flashcard = await Flashcard.findOneAndDelete({
      _id: req.params.id,
      authorId: req.user.id
    });

    if (!flashcard) {
      throw new AppError('Карточка не найдена', 404);
    }

    res.json({
      success: true,
      message: 'Карточка успешно удалена'
    });
  })
);

/**
 * @swagger
 * /flashcards/stats/{subjectId}:
 *   get:
 *     summary: Получить статистику по карточкам предмета
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID предмета
 *     responses:
 *       200:
 *         description: Статистика
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalCards:
 *                       type: number
 *                     easyCards:
 *                       type: number
 *                     mediumCards:
 *                       type: number
 *                     hardCards:
 *                       type: number
 *                     totalKnowCount:
 *                       type: number
 *                     totalDontKnowCount:
 *                       type: number
 *                     successRate:
 *                       type: number
 *                     lastReviewed:
 *                       type: string
 *                       format: date-time
 */
router.get('/stats/:subjectId',
  auth,
  subjectIdValidation,
  catchAsync(async (req, res) => {
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
          easyCards: { 
            $sum: { $cond: [{ $eq: ["$difficulty", "easy"] }, 1, 0] }
          },
          mediumCards: { 
            $sum: { $cond: [{ $eq: ["$difficulty", "medium"] }, 1, 0] }
          },
          hardCards: { 
            $sum: { $cond: [{ $eq: ["$difficulty", "hard"] }, 1, 0] }
          },
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
                  { 
                    $divide: [
                      "$totalKnowCount", 
                      { $add: ["$totalKnowCount", "$totalDontKnowCount"] }
                    ]
                  },
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
      totalCards: 0,
      easyCards: 0,
      mediumCards: 0,
      hardCards: 0,
      totalKnowCount: 0,
      totalDontKnowCount: 0,
      successRate: 0,
      lastReviewed: null
    };

    res.json({
      success: true,
      stats: result
    });
  })
);

/**
 * @swagger
 * /flashcards/{id}/reset:
 *   put:
 *     summary: Сбросить статистику карточки
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID карточки
 *     responses:
 *       200:
 *         description: Статистика сброшена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 flashcard:
 *                   type: object
 */
router.put('/:id/reset',
  auth,
  idValidation,
  catchAsync(async (req, res) => {
    const flashcard = await Flashcard.findOne({
      _id: req.params.id,
      authorId: req.user.id
    });

    if (!flashcard) {
      throw new AppError('Карточка не найдена', 404);
    }

    flashcard.knowCount = 0;
    flashcard.dontKnowCount = 0;
    flashcard.difficulty = 'medium';
    flashcard.lastReviewed = null;
    
    await flashcard.save();

    res.json({
      success: true,
      message: 'Статистика карточки сброшена',
      flashcard: {
        id: flashcard._id,
        knowCount: flashcard.knowCount,
        dontKnowCount: flashcard.dontKnowCount,
        difficulty: flashcard.difficulty,
        lastReviewed: flashcard.lastReviewed
      }
    });
  })
);

module.exports = router;