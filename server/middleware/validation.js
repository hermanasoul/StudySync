// server/middleware/validation.js

const { body, param, query, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Имя обязательно').isLength({ min: 2, max: 50 }).withMessage('Имя должно быть от 2 до 50 символов').matches(/^[a-zA-Zа-яА-ЯёЁ\s\-]+$/).withMessage('Имя может содержать только буквы и дефисы'),
  body('email').trim().notEmpty().withMessage('Email обязателен').isEmail().withMessage('Некорректный email').normalizeEmail(),
  body('password').notEmpty().withMessage('Пароль обязателен').isLength({ min: 6 }).withMessage('Пароль должен быть не менее 6 символов').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Пароль должен содержать хотя бы одну заглавную букву, одну строчную и одну цифру'),
  validate
];

const loginValidation = [
  body('email').trim().notEmpty().withMessage('Email обязателен').isEmail().withMessage('Некорректный email'),
  body('password').notEmpty().withMessage('Пароль обязателен'),
  validate
];

// Валидация карточки – subjectId строка
const flashcardValidation = [
  body('question').trim().notEmpty().withMessage('Вопрос обязателен').isLength({ min: 3, max: 500 }).withMessage('Вопрос должен быть от 3 до 500 символов'),
  body('answer').trim().notEmpty().withMessage('Ответ обязателен').isLength({ min: 1, max: 1000 }).withMessage('Ответ должен быть от 1 до 1000 символов'),
  body('subjectId').notEmpty().withMessage('ID предмета обязателен').isString().withMessage('ID предмета должен быть строкой'),
  body('hint').optional().trim().isLength({ max: 200 }).withMessage('Подсказка не должна превышать 200 символов'),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Сложность должна быть: easy, medium или hard'),
  validate
];

// Валидация заметки – subjectId строка
const noteValidation = [
  body('title').trim().notEmpty().withMessage('Заголовок обязателен').isLength({ min: 3, max: 100 }).withMessage('Заголовок должен быть от 3 до 100 символов'),
  body('content').trim().notEmpty().withMessage('Содержание обязательно').isLength({ min: 10, max: 10000 }).withMessage('Содержание должно быть от 10 до 10000 символов'),
  body('subjectId').notEmpty().withMessage('ID предмета обязателен').isString().withMessage('ID предмета должен быть строкой'),
  body('tags').optional().isArray().withMessage('Теги должны быть массивом'),
  body('tags.*').optional().isString().trim().isLength({ max: 20 }).withMessage('Тег не должен превышать 20 символов'),
  validate
];

// Валидация группы – subjectId строка
const groupValidation = [
  body('name').trim().notEmpty().withMessage('Название группы обязательно').isLength({ min: 3, max: 50 }).withMessage('Название должно быть от 3 до 50 символов'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Описание не должно превышать 500 символов'),
  body('subjectId').notEmpty().withMessage('ID предмета обязателен').isString().withMessage('ID предмета должен быть строкой'),
  body('isPublic').optional().isBoolean().withMessage('Публичность должна быть true или false'),
  validate
];

const inviteValidation = [
  body('email').trim().notEmpty().withMessage('Email обязателен').isEmail().withMessage('Некорректный email').normalizeEmail(),
  validate
];

const idValidation = [
  param('id').notEmpty().withMessage('ID обязателен').isMongoId().withMessage('Некорректный ID формата'),
  validate
];

const subjectIdValidation = [
  param('subjectId').notEmpty().withMessage('ID предмета обязателен').isMongoId().withMessage('Некорректный ID предмета'),
  validate
];

const groupIdValidation = [
  param('groupId').notEmpty().withMessage('ID группы обязателен').isMongoId().withMessage('Некорректный ID группы'),
  validate
];

const sanitizeInput = [
  body('*').customSanitizer(value => typeof value === 'string' ? value.replace(/[<>]/g, '') : value)
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  flashcardValidation,
  noteValidation,
  groupValidation,
  inviteValidation,
  idValidation,
  subjectIdValidation,
  groupIdValidation,
  sanitizeInput
};