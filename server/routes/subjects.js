// server/routes/subjects.js

const express = require('express');
const { body, query, param } = require('express-validator');   // <-- ДОБАВИТЬ СЮДА
const Subject = require('../models/Subject');
const { auth, restrictTo } = require('../middleware/auth');
const { 
  subjectIdValidation, 
  sanitizeInput 
} = require('../middleware/validation');
const { AppError, catchAsync } = require('../middleware/errorHandler');

const router = express.Router();


// Получение всех предметов пользователя
router.get('/', 
  auth,
  catchAsync(async (req, res) => {
    const subjects = await Subject.find({
      $or: [
        { createdBy: req.user.id },
        { isPublic: true }
      ]
    })
    .sort({ name: 1 })
    .select('-__v');

    // Вычисляем прогресс для каждого предмета
    const subjectsWithProgress = subjects.map(subject => ({
      id: subject._id,
      name: subject.name,
      description: subject.description,
      color: subject.color,
      icon: subject.icon,
      createdBy: subject.createdBy,
      isPublic: subject.isPublic,
      progress: 0, // TODO: Реализовать расчет прогресса
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt
    }));

    res.json({
      success: true,
      count: subjectsWithProgress.length,
      subjects: subjectsWithProgress
    });
  })
);

// Получение конкретного предмета
router.get('/:subjectId',
  auth,
  subjectIdValidation,
  catchAsync(async (req, res) => {
    const subject = await Subject.findOne({
      _id: req.params.subjectId,
      $or: [
        { createdBy: req.user.id },
        { isPublic: true }
      ]
    }).select('-__v');

    if (!subject) {
      throw new AppError('Предмет не найден или доступ запрещен', 404);
    }

    res.json({
      success: true,
      subject: {
        id: subject._id,
        name: subject.name,
        description: subject.description,
        color: subject.color,
        icon: subject.icon,
        createdBy: subject.createdBy,
        isPublic: subject.isPublic,
        createdAt: subject.createdAt,
        updatedAt: subject.updatedAt
      }
    });
  })
);

// Создание нового предмета
router.post('/',
  auth,
  sanitizeInput,
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Название предмета обязательно')
      .isLength({ min: 2, max: 50 }).withMessage('Название должно быть от 2 до 50 символов'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Описание не должно превышать 500 символов'),
    
    body('color')
      .optional()
      .isIn(['green', 'blue', 'purple', 'red', 'yellow', 'orange', 'pink', 'indigo', 'teal'])
      .withMessage('Недопустимый цвет'),
    
    body('icon')
      .optional()
      .trim()
      .isLength({ max: 10 }).withMessage('Иконка не должна превышать 10 символов'),
    
    body('isPublic')
      .optional()
      .isBoolean().withMessage('Публичность должна быть true или false')
  ],
  catchAsync(async (req, res) => {
    const { name, description, color, icon, isPublic } = req.body;

    // Проверяем, нет ли уже предмета с таким названием у пользователя
    const existingSubject = await Subject.findOne({
      name: new RegExp(`^${name}$`, 'i'),
      createdBy: req.user.id
    });

    if (existingSubject) {
      throw new AppError('Предмет с таким названием уже существует', 409);
    }

    const subject = await Subject.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      color: color || 'blue',
      icon: icon || '📚',
      createdBy: req.user.id,
      isPublic: isPublic !== undefined ? isPublic : true
    });

    res.status(201).json({
      success: true,
      message: 'Предмет успешно создан',
      subject: {
        id: subject._id,
        name: subject.name,
        description: subject.description,
        color: subject.color,
        icon: subject.icon,
        isPublic: subject.isPublic,
        createdAt: subject.createdAt
      }
    });
  })
);

// Обновление предмета
router.put('/:subjectId',
  auth,
  subjectIdValidation,
  sanitizeInput,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('Название должно быть от 2 до 50 символов'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Описание не должно превышать 500 символов'),
    
    body('color')
      .optional()
      .isIn(['green', 'blue', 'purple', 'red', 'yellow', 'orange', 'pink', 'indigo', 'teal'])
      .withMessage('Недопустимый цвет'),
    
    body('icon')
      .optional()
      .trim()
      .isLength({ max: 10 }).withMessage('Иконка не должна превышать 10 символов'),
    
    body('isPublic')
      .optional()
      .isBoolean().withMessage('Публичность должна быть true или false')
  ],
  catchAsync(async (req, res) => {
    const { name, description, color, icon, isPublic } = req.body;

    // Находим предмет
    const subject = await Subject.findOne({
      _id: req.params.subjectId,
      createdBy: req.user.id
    });

    if (!subject) {
      throw new AppError('Предмет не найден или доступ запрещен', 404);
    }

    // Проверяем уникальность названия, если оно меняется
    if (name && name.toLowerCase() !== subject.name.toLowerCase()) {
      const existingSubject = await Subject.findOne({
        name: new RegExp(`^${name}$`, 'i'),
        createdBy: req.user.id,
        _id: { $ne: subject._id }
      });

      if (existingSubject) {
        throw new AppError('Предмет с таким названием уже существует', 409);
      }
      subject.name = name.trim();
    }

    if (description !== undefined) subject.description = description.trim();
    if (color !== undefined) subject.color = color;
    if (icon !== undefined) subject.icon = icon;
    if (isPublic !== undefined) subject.isPublic = isPublic;

    await subject.save();

    res.json({
      success: true,
      message: 'Предмет успешно обновлен',
      subject: {
        id: subject._id,
        name: subject.name,
        description: subject.description,
        color: subject.color,
        icon: subject.icon,
        isPublic: subject.isPublic,
        updatedAt: subject.updatedAt
      }
    });
  })
);

// Удаление предмета
router.delete('/:subjectId',
  auth,
  subjectIdValidation,
  catchAsync(async (req, res) => {
    const subject = await Subject.findOneAndDelete({
      _id: req.params.subjectId,
      createdBy: req.user.id
    });

    if (!subject) {
      throw new AppError('Предмет не найден или доступ запрещен', 404);
    }

    // TODO: Удалить связанные заметки и карточки (каскадное удаление)

    res.json({
      success: true,
      message: 'Предмет успешно удален'
    });
  })
);

// Получение статистики по предмету
router.get('/:subjectId/stats',
  auth,
  subjectIdValidation,
  catchAsync(async (req, res) => {
    const subject = await Subject.findOne({
      _id: req.params.subjectId,
      $or: [
        { createdBy: req.user.id },
        { isPublic: true }
      ]
    });

    if (!subject) {
      throw new AppError('Предмет не найден или доступ запрещен', 404);
    }

    // TODO: Получить реальную статистику из БД
    const stats = {
      totalNotes: 0,
      totalFlashcards: 0,
      learnedFlashcards: 0,
      lastStudyDate: null,
      studyTime: 0,
      progress: 0
    };

    res.json({
      success: true,
      subject: {
        id: subject._id,
        name: subject.name,
        color: subject.color,
        icon: subject.icon
      },
      stats
    });
  })
);

// Поиск предметов
router.get('/search',
  auth,
  [
    query('q')
      .optional()
      .trim()
      .isLength({ min: 2 }).withMessage('Поисковый запрос должен быть не менее 2 символов'),
    
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Номер страницы должен быть положительным числом'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 }).withMessage('Лимит должен быть от 1 до 50')
  ],
  catchAsync(async (req, res) => {
    const { q: searchQuery, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {
      $or: [
        { createdBy: req.user.id },
        { isPublic: true }
      ]
    };

    if (searchQuery) {
      filter.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } }
      ];
    }

    const [subjects, total] = await Promise.all([
      Subject.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ name: 1 })
        .select('-__v'),
      Subject.countDocuments(filter)
    ]);

    res.json({
      success: true,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      count: subjects.length,
      subjects: subjects.map(subject => ({
        id: subject._id,
        name: subject.name,
        description: subject.description,
        color: subject.color,
        icon: subject.icon,
        isPublic: subject.isPublic
      }))
    });
  })
);

module.exports = router;
