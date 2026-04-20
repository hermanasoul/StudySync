// server/routes/auth.js

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { 
  registerValidation, 
  loginValidation, 
  sanitizeInput 
} = require('../middleware/validation');
const { AppError, catchAsync } = require('../middleware/errorHandler');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new AppError('JWT_SECRET is not configured', 500);
}

// Регистрация
router.post('/register', 
  sanitizeInput,
  registerValidation,
  catchAsync(async (req, res) => {
    const { name, email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Пользователь с таким email уже существует', 409);
    }

    const newUser = await User.create({ name, email, password });

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d', issuer: 'studysync-api', audience: 'studysync-client' }
    );

    const userResponse = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      avatarUrl: newUser.avatarUrl,
      createdAt: newUser.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'Пользователь успешно зарегистрирован',
      user: userResponse,
      token,
      tokenExpiresIn: '7d'
    });
  })
);

// Логин
router.post('/login', 
  sanitizeInput,
  loginValidation,
  catchAsync(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new AppError('Неверный email или пароль', 401);
    }

    const isPasswordValid = await user.correctPassword(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Неверный email или пароль', 401);
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d', issuer: 'studysync-api', audience: 'studysync-client' }
    );

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl
    };

    res.json({
      success: true,
      message: 'Вход выполнен успешно',
      user: userResponse,
      token,
      tokenExpiresIn: '7d'
    });
  })
);

// Получение текущего пользователя
router.get('/me', auth, catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('Пользователь не найден', 404);

  res.json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt
    }
  });
}));

// Обновление профиля
router.put('/profile', 
  auth,
  sanitizeInput,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('Имя должно быть от 2 до 50 символов')
      .matches(/^[a-zA-Zа-яА-ЯёЁ\s\-]+$/).withMessage('Имя может содержать только буквы и дефисы'),
  ],
  catchAsync(async (req, res) => {
    const { name } = req.body;
    if (!name && Object.keys(req.body).length === 0) {
      throw new AppError('Не предоставлены данные для обновления', 400);
    }

    const updateData = {};
    if (name) updateData.name = name;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) throw new AppError('Пользователь не найден', 404);

    res.json({
      success: true,
      message: 'Профиль успешно обновлен',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl
      }
    });
  })
);

// Выход (клиент удаляет токен)
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Выход выполнен успешно' });
});

// Проверка токена
router.post('/verify-token', auth, (req, res) => {
  res.json({ success: true, message: 'Токен действителен', user: req.user });
});

module.exports = router;