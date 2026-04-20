// server/routes/notifications.js
const { body, param, query } = require('express-validator');
const express = require('express');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');
const { 
  idValidation,
  sanitizeInput 
} = require('../middleware/validation');
const { AppError, catchAsync } = require('../middleware/errorHandler');

const router = express.Router();

// Получение всех уведомлений пользователя
router.get('/',
  auth,
  [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Номер страницы должен быть положительным числом'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Лимит должен быть от 1 до 100'),
    
    query('type')
      .optional()
      .isIn(['group_invitation', 'group_join', 'flashcard_created', 'note_created', 'study_reminder', 'achievement', 'system', 'all'])
      .withMessage('Недопустимый тип уведомления'),
    
    query('read')
      .optional()
      .isIn(['true', 'false', 'all']).withMessage('Параметр read должен быть: true, false или all')
  ],
  catchAsync(async (req, res) => {
    const { 
      page = 1, 
      limit = 20, 
      type = 'all',
      read = 'all'
    } = req.query;
    
    const skip = (page - 1) * limit;

    const filter = {
      userId: req.user.id,
      isArchived: false
    };

    if (type !== 'all') {
      filter.type = type;
    }

    if (read !== 'all') {
      filter.isRead = read === 'true';
    }

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v'),
      Notification.countDocuments(filter)
    ]);

    res.json({
      success: true,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      count: notifications.length,
      notifications: notifications.map(notification => ({
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        formattedDate: notification.formattedDate
      }))
    });
  })
);

// Получение количества непрочитанных уведомлений
router.get('/unread-count',
  auth,
  catchAsync(async (req, res) => {
    const count = await Notification.getUnreadCount(req.user.id);

    res.json({
      success: true,
      count
    });
  })
);

// Получение конкретного уведомления
router.get('/:id',
  auth,
  idValidation,
  catchAsync(async (req, res) => {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).select('-__v');

    if (!notification) {
      throw new AppError('Уведомление не найдено', 404);
    }

    res.json({
      success: true,
      notification: {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        formattedDate: notification.formattedDate
      }
    });
  })
);

// Пометить уведомление как прочитанное
router.put('/:id/read',
  auth,
  idValidation,
  catchAsync(async (req, res) => {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!notification) {
      throw new AppError('Уведомление не найдено', 404);
    }

    await notification.markAsRead();

    res.json({
      success: true,
      message: 'Уведомление помечено как прочитанное',
      notification: {
        id: notification._id,
        isRead: notification.isRead
      }
    });
  })
);

// Пометить все уведомления как прочитанные
router.put('/read-all',
  auth,
  catchAsync(async (req, res) => {
    const result = await Notification.markAllAsRead(req.user.id);

    res.json({
      success: true,
      message: 'Все уведомления помечены как прочитанные',
      updatedCount: result.modifiedCount
    });
  })
);

// Архивация уведомления
router.put('/:id/archive',
  auth,
  idValidation,
  catchAsync(async (req, res) => {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!notification) {
      throw new AppError('Уведомление не найдено', 404);
    }

    await notification.archive();

    res.json({
      success: true,
      message: 'Уведомление перемещено в архив',
      notification: {
        id: notification._id,
        isArchived: notification.isArchived
      }
    });
  })
);

// Удаление уведомления
router.delete('/:id',
  auth,
  idValidation,
  catchAsync(async (req, res) => {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!notification) {
      throw new AppError('Уведомление не найдено', 404);
    }

    res.json({
      success: true,
      message: 'Уведомление успешно удалено'
    });
  })
);

// Массовое удаление прочитанных уведомлений
router.delete('/cleanup/read',
  auth,
  catchAsync(async (req, res) => {
    const result = await Notification.deleteMany({
      userId: req.user.id,
      isRead: true,
      isArchived: false,
      createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Старше 7 дней
    });

    res.json({
      success: true,
      message: 'Прочитанные уведомления старше 7 дней удалены',
      deletedCount: result.deletedCount
    });
  })
);

// Создание тестового уведомления (для разработки)
router.post('/test',
  auth,
  [
    body('type')
      .isIn(['group_invitation', 'group_join', 'flashcard_created', 'note_created', 'study_reminder', 'achievement', 'system'])
      .withMessage('Недопустимый тип уведомления'),
    
    body('title')
      .trim()
      .notEmpty().withMessage('Заголовок обязателен')
      .isLength({ max: 200 }).withMessage('Заголовок не должен превышать 200 символов'),
    
    body('message')
      .trim()
      .notEmpty().withMessage('Сообщение обязательно')
      .isLength({ max: 500 }).withMessage('Сообщение не должно превышать 500 символов')
  ],
  catchAsync(async (req, res) => {
    const { type, title, message, data } = req.body;

    const notification = await Notification.create({
      userId: req.user.id,
      type,
      title: title.trim(),
      message: message.trim(),
      data: data || {},
      isRead: false
    });

    // Отправляем WebSocket уведомление
    const ws = req.app.get('ws');
    if (ws && ws.isUserOnline(req.user.id)) {
      ws.emitToUser(req.user.id, 'notification', {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        isRead: notification.isRead,
        createdAt: notification.createdAt
      });
    }

    res.status(201).json({
      success: true,
      message: 'Тестовое уведомление создано',
      notification: {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        isRead: notification.isRead,
        createdAt: notification.createdAt
      }
    });
  })
);

// Статистика по уведомлениям
router.get('/stats/overview',
  auth,
  catchAsync(async (req, res) => {
    const stats = await Notification.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user.id),
          isArchived: false
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: {
            $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] }
          },
          byType: {
            $push: {
              type: "$type",
              isRead: "$isRead"
            }
          }
        }
      },
      {
        $project: {
          total: 1,
          unread: 1,
          read: { $subtract: ["$total", "$unread"] },
          byType: {
            $map: {
              input: ["group_invitation", "group_join", "flashcard_created", "note_created", "study_reminder", "achievement", "system"],
              as: "typeName",
              in: {
                type: "$$typeName",
                total: {
                  $size: {
                    $filter: {
                      input: "$byType",
                      as: "item",
                      cond: { $eq: ["$$item.type", "$$typeName"] }
                    }
                  }
                },
                unread: {
                  $size: {
                    $filter: {
                      input: "$byType",
                      as: "item",
                      cond: {
                        $and: [
                          { $eq: ["$$item.type", "$$typeName"] },
                          { $eq: ["$$item.isRead", false] }
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      unread: 0,
      read: 0,
      byType: []
    };

    res.json({
      success: true,
      stats: result
    });
  })
);

module.exports = router;
