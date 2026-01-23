// server/middleware/auth.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('./errorHandler');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new AppError('JWT_SECRET is not configured', 500);
}

const auth = async (req, res, next) => {
  try {
    // Проверяем наличие токена
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      throw new AppError('Доступ запрещен. Токен не предоставлен.', 401);
    }

    // Верифицируем токен
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'studysync-api',
      audience: 'studysync-client'
    });

    // Проверяем существование пользователя
    const currentUser = await User.findById(decoded.id).select('+isActive +role');
    
    if (!currentUser) {
      throw new AppError('Пользователь, принадлежащий этому токену, больше не существует.', 401);
    }

    // Проверяем активен ли пользователь
    if (!currentUser.isActive) {
      throw new AppError('Аккаунт пользователя деактивирован.', 401);
    }

    // Проверяем, не был ли изменен пароль после выдачи токена
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      throw new AppError('Пользователь недавно изменил пароль. Пожалуйста, войдите снова.', 401);
    }

    // Прикрепляем пользователя к запросу
    req.user = {
      id: currentUser._id,
      email: currentUser.email,
      role: currentUser.role,
      name: currentUser.name
    };

    // Обновляем время последнего входа
    if (!req.path.includes('/auth/')) {
      currentUser.lastLogin = new Date();
      await currentUser.save({ validateBeforeSave: false });
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Неверный токен. Пожалуйста, войдите снова.', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Срок действия вашего токена истек. Пожалуйста, войдите снова.', 401));
    }
    next(error);
  }
};

// Middleware для проверки ролей
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('У вас нет прав для выполнения этого действия.', 403)
      );
    }
    next();
  };
};

// Middleware для проверки владения ресурсом
const checkOwnership = (model, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const resource = await model.findById(req.params[paramName]);
      
      if (!resource) {
        return next(new AppError('Ресурс не найден', 404));
      }

      // Проверяем, является ли пользователь владельцем
      const isOwner = resource.authorId && resource.authorId.toString() === req.user.id;
      const isGroupOwner = resource.createdBy && resource.createdBy.toString() === req.user.id;
      
      if (!isOwner && !isGroupOwner && req.user.role !== 'admin') {
        return next(new AppError('У вас нет прав для выполнения этого действия.', 403));
      }

      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { auth, restrictTo, checkOwnership };
