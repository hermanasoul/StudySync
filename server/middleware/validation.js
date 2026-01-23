// server/middleware/validation.js

const { body, param, query, validationResult } = require('express-validator');

// Общие правила валидации
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

// Валидация регистрации
const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Имя обязательно')
    .isLength({ min: 2, max: 50 }).withMessage('Имя должно быть от 2 до 50 символов')
    .matches(/^[a-zA-Zа-яА-ЯёЁ\s\-]+$/).withMessage('Имя может содержать только буквы и дефисы'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email обязателен')
    .isEmail().withMessage('Некорректный email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Пароль обязателен')
    .isLength({ min: 6 }).withMessage('Пароль должен быть не менее 6 символов')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Пароль должен содержать хотя бы одну заглавную букву, одну строчную и одну цифру'),
  
  validate
];

// Валидация логина
const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email обязателен')
    .isEmail().withMessage('Некорректный email'),
  
  body('password')
    .notEmpty().withMessage('Пароль обязателен'),
  
  validate
];

// Валидация создания карточки
const flashcardValidation = [
  body('question')
    .trim()
    .notEmpty().withMessage('Вопрос обязателен')
    .isLength({ min: 3, max: 500 }).withMessage('Вопрос должен быть от 3 до 500 символов'),
  
  body('answer')
    .trim()
    .notEmpty().withMessage('Ответ обязателен')
    .isLength({ min: 1, max: 1000 }).withMessage('Ответ должен быть от 1 до 1000 символов'),
  
  body('subjectId')
    .notEmpty().withMessage('ID предмета обязателен')
    .isMongoId().withMessage('Некорректный ID предмета'),
  
  body('hint')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Подсказка не должна превышать 200 символов'),
  
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard']).withMessage('Сложность должна быть: easy, medium или hard'),
  
  validate
];

// Валидация заметки
const noteValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Заголовок обязателен')
    .isLength({ min: 3, max: 100 }).withMessage('Заголовок должен быть от 3 до 100 символов'),
  
  body('content')
    .trim()
    .notEmpty().withMessage('Содержание обязательно')
    .isLength({ min: 10, max: 10000 }).withMessage('Содержание должно быть от 10 до 10000 символов'),
  
  body('subjectId')
    .notEmpty().withMessage('ID предмета обязателен')
    .isMongoId().withMessage('Некорректный ID предмета'),
  
  body('tags')
    .optional()
    .isArray().withMessage('Теги должны быть массивом'),
  
  body('tags.*')
    .optional()
    .isString().withMessage('Тег должен быть строкой')
    .trim()
    .isLength({ max: 20 }).withMessage('Тег не должен превышать 20 символов'),
  
  validate
];

// Валидация группы
const groupValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Название группы обязательно')
    .isLength({ min: 3, max: 50 }).withMessage('Название должно быть от 3 до 50 символов'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Описание не должно превышать 500 символов'),
  
  body('subjectId')
    .notEmpty().withMessage('ID предмета обязателен')
    .isMongoId().withMessage('Некорректный ID предмета'),
  
  body('isPublic')
    .optional()
    .isBoolean().withMessage('Публичность должна быть true или false'),
  
  validate
];

// Валидация приглашения
const inviteValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email обязателен')
    .isEmail().withMessage('Некорректный email')
    .normalizeEmail(),
  
  validate
];

// Валидация ID параметров
const idValidation = [
  param('id')
    .notEmpty().withMessage('ID обязателен')
    .isMongoId().withMessage('Некорректный ID формата'),
  
  validate
];

// Валидация subjectId параметра
const subjectIdValidation = [
  param('subjectId')
    .notEmpty().withMessage('ID предмета обязателен')
    .isMongoId().withMessage('Некорректный ID предмета'),
  
  validate
];

// Валидация groupId параметра
const groupIdValidation = [
  param('groupId')
    .notEmpty().withMessage('ID группы обязателен')
    .isMongoId().withMessage('Некорректный ID группы'),
  
  validate
];

// Санитизация входящих данных
const sanitizeInput = [
  // Удаляем потенциально опасные символы
  body('*').customSanitizer(value => {
    if (typeof value === 'string') {
      return value.replace(/[<>]/g, '');
    }
    return value;
  })
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