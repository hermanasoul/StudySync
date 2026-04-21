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

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Управление уведомлениями пользователя
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         userId:
 *           type: string
 *         type:
 *           type: string
 *           enum: [group_invitation, group_join, flashcard_created, note_created, study_reminder, achievement, system]
 *         title:
 *           type: string
 *         message:
 *           type: string
 *         data:
 *           type: object
 *         isRead:
 *           type: boolean
 *         isArchived:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Получить все уведомления пользователя
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [group_invitation, group_join, flashcard_created, note_created, study_reminder, achievement, system, all]
 *       - in: query
 *         name: read
 *         schema:
 *           type: string
 *           enum: [true, false, all]
 *     responses:
 *       200:
 *         description: Список уведомлений
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
 *                 notifications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 */
router.get('/',
  auth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('type').optional().isIn(['group_invitation', 'group_join', 'flashcard_created', 'note_created', 'study_reminder', 'achievement', 'system', 'all']),
    query('read').optional().isIn(['true', 'false', 'all'])
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

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Получить количество непрочитанных уведомлений
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Количество непрочитанных уведомлений
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 */
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

/**
 * @swagger
 * /notifications/{id}:
 *   get:
 *     summary: Получить уведомление по ID
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID уведомления
 *     responses:
 *       200:
 *         description: Информация об уведомлении
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 notification:
 *                   $ref: '#/components/schemas/Notification'
 *       404:
 *         description: Уведомление не найдено
 */
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

/**
 * @swagger
 * /notifications/{id}/read:
 *   put:
 *     summary: Пометить уведомление как прочитанное
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID уведомления
 *     responses:
 *       200:
 *         description: Уведомление помечено как прочитанное
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 notification:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     isRead:
 *                       type: boolean
 */
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

/**
 * @swagger
 * /notifications/read-all:
 *   put:
 *     summary: Пометить все уведомления как прочитанные
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Все уведомления помечены как прочитанные
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 updatedCount:
 *                   type: integer
 */
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

/**
 * @swagger
 * /notifications/{id}/archive:
 *   put:
 *     summary: Архивировать уведомление
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID уведомления
 *     responses:
 *       200:
 *         description: Уведомление перемещено в архив
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 notification:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     isArchived:
 *                       type: boolean
 */
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

/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Удалить уведомление
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID уведомления
 *     responses:
 *       200:
 *         description: Уведомление удалено
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

/**
 * @swagger
 * /notifications/cleanup/read:
 *   delete:
 *     summary: Удалить старые прочитанные уведомления
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Уведомления удалены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 deletedCount:
 *                   type: integer
 */
router.delete('/cleanup/read',
  auth,
  catchAsync(async (req, res) => {
    const result = await Notification.deleteMany({
      userId: req.user.id,
      isRead: true,
      isArchived: false,
      createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    res.json({
      success: true,
      message: 'Прочитанные уведомления старше 7 дней удалены',
      deletedCount: result.deletedCount
    });
  })
);

/**
 * @swagger
 * /notifications/test:
 *   post:
 *     summary: Создать тестовое уведомление (для разработки)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - title
 *               - message
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [group_invitation, group_join, flashcard_created, note_created, study_reminder, achievement, system]
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       201:
 *         description: Тестовое уведомление создано
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 notification:
 *                   $ref: '#/components/schemas/Notification'
 */
router.post('/test',
  auth,
  [
    body('type').isIn(['group_invitation', 'group_join', 'flashcard_created', 'note_created', 'study_reminder', 'achievement', 'system']),
    body('title').trim().notEmpty().isLength({ max: 200 }),
    body('message').trim().notEmpty().isLength({ max: 500 })
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

/**
 * @swagger
 * /notifications/stats/overview:
 *   get:
 *     summary: Получить статистику по уведомлениям
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика уведомлений
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
 *                     total:
 *                       type: number
 *                     unread:
 *                       type: number
 *                     read:
 *                       type: number
 *                     byType:
 *                       type: array
 */
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
          unread: { $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] } },
          byType: { $push: { type: "$type", isRead: "$isRead" } }
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