// server/middleware/errorHandler.js

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Логирование ошибки
  console.error('ERROR 💥:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    user: req.user ? req.user.id : 'unauthenticated'
  });

  // В разработке показываем больше деталей
  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    // В продакшене скрываем детали
    let message = err.message;
    
    // Скрываем сообщения об ошибках БД
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
      message = 'Ошибка базы данных';
    }
    
    // Скрываем ошибки валидации mongoose
    if (err.name === 'ValidationError') {
      message = 'Ошибка валидации данных';
    }
    
    // Скрываем JWT ошибки
    if (err.name === 'JsonWebTokenError') {
      message = 'Неверный токен';
    }
    
    if (err.name === 'TokenExpiredError') {
      message = 'Срок действия токена истек';
    }

    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: message
    });
  }
};

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

const notFound = (req, res, next) => {
  next(new AppError(`Не могу найти ${req.originalUrl} на этом сервере`, 404));
};

module.exports = {
  AppError,
  errorHandler,
  catchAsync,
  notFound
};