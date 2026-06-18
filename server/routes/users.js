// server/routes/users.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { AppError, catchAsync } = require('../middleware/errorHandler');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

// Настройка multer для загрузки аватаров
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/avatars'); // папка для аватаров
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'avatar-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: function (req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Только изображения'), false);
    } else {
      cb(null, true);
    }
  }
});

// =================== ЗАГРУЗКА АВАТАРА ===================
router.post('/avatar', auth, upload.single('avatar'), catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('Файл не загружен', 400);
  }
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('Пользователь не найден', 404);
  user.avatarUrl = avatarUrl;
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, data: { avatarUrl } });
}));

// =================== ОБНОВЛЕНИЕ ПРОФИЛЯ (имя, email) ===================
router.put('/profile', auth, catchAsync(async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    throw new AppError('Имя и email обязательны', 400);
  }

  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('Пользователь не найден', 404);

  // Проверка уникальности email, если он изменился
  if (email !== user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Пользователь с таким email уже существует', 400);
    }
  }

  user.name = name;
  user.email = email;
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl
    }
  });
}));

// =================== СМЕНА ПАРОЛЯ ===================
router.put('/change-password', auth, catchAsync(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new AppError('Укажите старый и новый пароль', 400);
  }

  const user = await User.findById(req.user.id).select('+password');
  if (!user) throw new AppError('Пользователь не найден', 404);

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    throw new AppError('Неверный текущий пароль', 401);
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: 'Пароль успешно изменён' });
}));

// Остальные маршруты (GET /, GET /:id) можете оставить или удалить по желанию
router.get('/', auth, catchAsync(async (req, res) => {
  const users = await User.find().select('name email avatarUrl');
  res.json({ success: true, users });
}));

router.get('/:id', auth, catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id).select('name email avatarUrl');
  if (!user) throw new AppError('Пользователь не найден', 404);
  res.json({ success: true, user });
}));

module.exports = router;