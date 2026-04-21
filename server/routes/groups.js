// server/routes/groups.js
const { body, param, query } = require('express-validator');
const express = require('express');
const mongoose = require('mongoose');
const Group = require('../models/Group');
const GroupInvite = require('../models/GroupInvite');
const Flashcard = require('../models/Flashcard');
const Note = require('../models/Note');
const User = require('../models/User');
const { auth, restrictTo } = require('../middleware/auth');
const { 
  groupValidation, 
  inviteValidation, 
  idValidation,
  groupIdValidation,
  sanitizeInput 
} = require('../middleware/validation');
const { AppError, catchAsync } = require('../middleware/errorHandler');

const router = express.Router();

// Вспомогательная функция для отправки WebSocket событий
const sendWebSocketEvent = (req, event, data) => {
  const ws = req.app.get('ws');
  if (ws) {
    ws.emitToGroup(data.groupId || req.params.id, event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: Управление учебными группами
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Group:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         subjectId:
 *           $ref: '#/components/schemas/Subject'
 *         createdBy:
 *           $ref: '#/components/schemas/User'
 *         members:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               user:
 *                 $ref: '#/components/schemas/User'
 *               role:
 *                 type: string
 *                 enum: [owner, admin, member]
 *               joinedAt:
 *                 type: string
 *                 format: date-time
 *         isPublic:
 *           type: boolean
 *         inviteCode:
 *           type: string
 *         settings:
 *           type: object
 *         memberCount:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /groups:
 *   post:
 *     summary: Создать новую группу
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - subjectId
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               subjectId:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *               settings:
 *                 type: object
 *     responses:
 *       201:
 *         description: Группа создана
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 group:
 *                   $ref: '#/components/schemas/Group'
 */
router.post('/',
  auth,
  sanitizeInput,
  groupValidation,
  catchAsync(async (req, res) => {
    const { name, description, subjectId, isPublic, settings } = req.body;

    // Проверяем существование предмета
    const Subject = require('../models/Subject');
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      throw new AppError('Предмет не найден', 404);
    }

    const group = new Group({
      name: name.trim(),
      description: description ? description.trim() : '',
      subjectId,
      isPublic: isPublic || false,
      settings: settings || {
        allowMemberInvites: true,
        allowMemberCreateCards: true,
        allowMemberCreateNotes: true
      },
      createdBy: req.user.id,
      members: [{
        user: req.user.id,
        role: 'owner',
        joinedAt: new Date()
      }]
    });

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate('createdBy', 'name email avatarUrl')
      .populate('members.user', 'name email avatarUrl')
      .populate('subjectId', 'name color')
      .select('-__v');

    // Создаем уведомление для создателя группы
    const ws = req.app.get('ws');
    await ws.sendNotification(req.user.id, {
      type: 'system',
      title: 'Группа создана',
      message: `Вы успешно создали группу "${group.name}"`,
      data: {
        groupId: group._id,
        groupName: group.name,
        subjectName: subject.name
      }
    });

    res.status(201).json({
      success: true,
      message: 'Группа успешно создана',
      group: {
        id: populatedGroup._id,
        name: populatedGroup.name,
        description: populatedGroup.description,
        subjectId: populatedGroup.subjectId ? {
          id: populatedGroup.subjectId._id,
          name: populatedGroup.subjectId.name,
          color: populatedGroup.subjectId.color
        } : null,
        createdBy: {
          id: populatedGroup.createdBy._id,
          name: populatedGroup.createdBy.name,
          email: populatedGroup.createdBy.email,
          avatarUrl: populatedGroup.createdBy.avatarUrl
        },
        members: populatedGroup.members.map(member => ({
          user: {
            id: member.user._id,
            name: member.user.name,
            email: member.user.email,
            avatarUrl: member.user.avatarUrl
          },
          role: member.role,
          joinedAt: member.joinedAt
        })),
        isPublic: populatedGroup.isPublic,
        inviteCode: populatedGroup.inviteCode,
        settings: populatedGroup.settings,
        memberCount: populatedGroup.members.length,
        createdAt: populatedGroup.createdAt,
        updatedAt: populatedGroup.updatedAt
      }
    });
  })
);

/**
 * @swagger
 * /groups/my:
 *   get:
 *     summary: Получить группы текущего пользователя
 *     tags: [Groups]
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
 *         name: role
 *         schema:
 *           type: string
 *           enum: [owner, admin, member, all]
 *       - in: query
 *         name: public
 *         schema:
 *           type: string
 *           enum: [true, false, all]
 *     responses:
 *       200:
 *         description: Список групп
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
 *                 groups:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Group'
 */
router.get('/my',
  auth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('role').optional().isIn(['owner', 'admin', 'member', 'all']),
    query('public').optional().isIn(['true', 'false', 'all'])
  ],
  catchAsync(async (req, res) => {
    const { 
      page = 1, 
      limit = 20, 
      role = 'all',
      public = 'all'
    } = req.query;
    
    const skip = (page - 1) * limit;

    const filter = {
      'members.user': req.user.id
    };

    // Фильтр по роли
    if (role !== 'all') {
      filter['members.role'] = role;
    }

    // Фильтр по публичности
    if (public !== 'all') {
      filter.isPublic = public === 'true';
    }

    const [groups, total] = await Promise.all([
      Group.find(filter)
        .populate('createdBy', 'name email')
        .populate('members.user', 'name email')
        .populate('subjectId', 'name color')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v'),
      Group.countDocuments(filter)
    ]);

    const groupsWithCount = groups.map(group => ({
      id: group._id,
      name: group.name,
      description: group.description,
      subjectId: group.subjectId ? {
        id: group.subjectId._id,
        name: group.subjectId.name,
        color: group.subjectId.color
      } : null,
      createdBy: {
        id: group.createdBy._id,
        name: group.createdBy.name,
        email: group.createdBy.email
      },
      members: group.members.map(member => ({
        user: {
          id: member.user._id,
          name: member.user.name,
          email: member.user.email
        },
        role: member.role,
        joinedAt: member.joinedAt
      })),
      isPublic: group.isPublic,
      inviteCode: group.inviteCode,
      settings: group.settings,
      memberCount: group.members.length,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt
    }));

    res.json({
      success: true,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      count: groupsWithCount.length,
      groups: groupsWithCount
    });
  })
);

/**
 * @swagger
 * /groups/{id}:
 *   get:
 *     summary: Получить информацию о группе по ID
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID группы
 *     responses:
 *       200:
 *         description: Информация о группе
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 group:
 *                   $ref: '#/components/schemas/Group'
 */
router.get('/:id',
  auth,
  idValidation,
  catchAsync(async (req, res) => {
    const group = await Group.findOne({
      _id: req.params.id,
      'members.user': req.user.id
    })
    .populate('createdBy', 'name email avatarUrl')
    .populate('members.user', 'name email avatarUrl')
    .populate('subjectId', 'name color description')
    .select('-__v');

    if (!group) {
      throw new AppError('Группа не найдена или доступ запрещен', 404);
    }

    // Получаем статистику группы
    const [flashcardsCount, notesCount] = await Promise.all([
      Flashcard.countDocuments({ groupId: group._id }),
      Note.countDocuments({ groupId: group._id })
    ]);

    res.json({
      success: true,
      group: {
        id: group._id,
        name: group.name,
        description: group.description,
        subjectId: group.subjectId ? {
          id: group.subjectId._id,
          name: group.subjectId.name,
          color: group.subjectId.color,
          description: group.subjectId.description
        } : null,
        createdBy: {
          id: group.createdBy._id,
          name: group.createdBy.name,
          email: group.createdBy.email,
          avatarUrl: group.createdBy.avatarUrl
        },
        members: group.members.map(member => ({
          user: {
            id: member.user._id,
            name: member.user.name,
            email: member.user.email,
            avatarUrl: member.user.avatarUrl
          },
          role: member.role,
          joinedAt: member.joinedAt
        })),
        isPublic: group.isPublic,
        inviteCode: group.inviteCode,
        settings: group.settings,
        stats: {
          memberCount: group.members.length,
          flashcardsCount,
          notesCount
        },
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      }
    });
  })
);

/**
 * @swagger
 * /groups/{id}:
 *   put:
 *     summary: Обновить группу
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID группы
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *               settings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Группа обновлена
 */
router.put('/:id',
  auth,
  idValidation,
  sanitizeInput,
  [
    body('name').optional().trim().isLength({ min: 3, max: 50 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('isPublic').optional().isBoolean(),
    body('settings').optional().isObject(),
    body('settings.allowMemberInvites').optional().isBoolean(),
    body('settings.allowMemberCreateCards').optional().isBoolean(),
    body('settings.allowMemberCreateNotes').optional().isBoolean()
  ],
  catchAsync(async (req, res) => {
    const { name, description, isPublic, settings } = req.body;

    const group = await Group.findOne({
      _id: req.params.id,
      'members.user': req.user.id,
      'members.role': { $in: ['owner', 'admin'] }
    });

    if (!group) {
      throw new AppError('Группа не найдена или недостаточно прав', 404);
    }

    if (name !== undefined) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();
    if (isPublic !== undefined) group.isPublic = isPublic;
    
    if (settings) {
      group.settings = {
        ...group.settings,
        ...settings
      };
    }

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate('createdBy', 'name email')
      .populate('members.user', 'name email')
      .populate('subjectId', 'name')
      .select('-__v');

    res.json({
      success: true,
      message: 'Группа успешно обновлена',
      group: {
        id: populatedGroup._id,
        name: populatedGroup.name,
        description: populatedGroup.description,
        isPublic: populatedGroup.isPublic,
        settings: populatedGroup.settings,
        updatedAt: populatedGroup.updatedAt
      }
    });
  })
);

/**
 * @swagger
 * /groups/{id}:
 *   delete:
 *     summary: Удалить группу
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID группы
 *     responses:
 *       200:
 *         description: Группа удалена
 */
router.delete('/:id',
  auth,
  idValidation,
  catchAsync(async (req, res) => {
    const group = await Group.findOne({
      _id: req.params.id,
      'members.user': req.user.id,
      'members.role': 'owner'
    });

    if (!group) {
      throw new AppError('Группа не найдена или недостаточно прав', 404);
    }

    // Создаем уведомления для участников о удалении группы
    const ws = req.app.get('ws');
    for (const member of group.members) {
      if (member.user.toString() !== req.user.id) {
        await ws.sendNotification(member.user.toString(), {
          type: 'system',
          title: 'Группа удалена',
          message: `Группа "${group.name}" была удалена владельцем`,
          data: {
            groupId: group._id,
            groupName: group.name,
            deletedBy: {
              id: req.user.id,
              name: req.user.name
            }
          }
        });
      }
    }

    // Каскадное удаление связанных данных
    await Flashcard.deleteMany({ groupId: group._id });
    await Note.deleteMany({ groupId: group._id });
    await GroupInvite.deleteMany({ groupId: group._id });
    await group.deleteOne();

    res.json({
      success: true,
      message: 'Группа успешно удалена'
    });
  })
);

/**
 * @swagger
 * /groups/{id}/invite:
 *   post:
 *     summary: Пригласить участника в группу
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID группы
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Приглашение отправлено
 */
router.post('/:id/invite',
  auth,
  idValidation,
  sanitizeInput,
  inviteValidation,
  catchAsync(async (req, res) => {
    const { email } = req.body;

    const group = await Group.findOne({
      _id: req.params.id,
      'members.user': req.user.id,
      'members.role': { $in: ['owner', 'admin'] }
    });

    if (!group) {
      throw new AppError('Группа не найдена или недостаточно прав', 404);
    }

    // Проверяем, разрешены ли приглашения
    if (!group.settings.allowMemberInvites && group.members.find(m => m.user.toString() === req.user.id)?.role !== 'owner') {
      throw new AppError('Приглашения участников отключены владельцем группы', 403);
    }

    // Проверяем, не приглашен ли уже пользователь
    const existingInvite = await GroupInvite.findOne({
      groupId: group._id,
      email: email.toLowerCase(),
      status: 'pending'
    });

    if (existingInvite) {
      throw new AppError('Приглашение уже отправлено этому пользователю', 409);
    }

    const invite = new GroupInvite({
      groupId: group._id,
      invitedBy: req.user.id,
      email: email.toLowerCase(),
      token: require('crypto').randomBytes(32).toString('hex'),
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 дней
    });

    await invite.save();

    // Создаем уведомление для приглашенного пользователя
    const ws = req.app.get('ws');
    const invitedUser = await User.findOne({ email: email.toLowerCase() });
    if (invitedUser) {
      await ws.sendNotification(invitedUser._id.toString(), {
        type: 'group_invitation',
        title: 'Приглашение в группу',
        message: `Вас пригласили в группу "${group.name}"`,
        data: {
          groupId: group._id,
          groupName: group.name,
          inviteCode: group.inviteCode,
          invitedBy: {
            id: req.user.id,
            name: req.user.name
          }
        }
      });
    }

    // Уведомляем создателя о отправке приглашения
    await ws.sendNotification(req.user.id, {
      type: 'system',
      title: 'Приглашение отправлено',
      message: `Вы отправили приглашение в группу "${group.name}" пользователю ${email}`,
      data: {
        groupId: group._id,
        groupName: group.name,
        invitedEmail: email
      }
    });

    res.json({
      success: true,
      message: 'Приглашение успешно отправлено',
      invite: {
        id: invite._id,
        email: invite.email,
        expiresAt: invite.expiresAt
      }
    });
  })
);

/**
 * @swagger
 * /groups/join/{inviteCode}:
 *   post:
 *     summary: Присоединиться к группе по коду приглашения
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: inviteCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Код приглашения
 *     responses:
 *       200:
 *         description: Успешное присоединение
 */
router.post('/join/:inviteCode',
  auth,
  [
    param('inviteCode')
      .trim()
      .notEmpty().withMessage('Код приглашения обязателен')
      .isLength({ min: 6, max: 10 }).withMessage('Код приглашения должен быть от 6 до 10 символов')
  ],
  catchAsync(async (req, res) => {
    const group = await Group.findOne({ 
      inviteCode: req.params.inviteCode.toUpperCase() 
    });

    if (!group) {
      throw new AppError('Группа с таким кодом не найдена', 404);
    }

    // Проверяем, является ли группа публичной
    if (!group.isPublic) {
      throw new AppError('Эта группа является приватной. Требуется приглашение.', 403);
    }

    const isAlreadyMember = group.members.some(member =>
      member.user.toString() === req.user.id
    );

    if (isAlreadyMember) {
      throw new AppError('Вы уже состоите в этой группе', 400);
    }

    group.members.push({
      user: req.user.id,
      role: 'member',
      joinedAt: new Date()
    });

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate('createdBy', 'name email avatarUrl')
      .populate('members.user', 'name email avatarUrl')
      .populate('subjectId', 'name color')
      .select('-__v');

    const ws = req.app.get('ws');

    // Создаем уведомление для владельца группы о новом участнике
    await ws.sendNotification(group.createdBy.toString(), {
      type: 'group_join',
      title: 'Новый участник в группе',
      message: `${req.user.name} присоединился к вашей группе "${group.name}"`,
      data: {
        groupId: group._id,
        groupName: group.name,
        newMember: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email
        }
      }
    });

    // Отправляем уведомления остальным участникам группы
    await ws.sendGroupNotification(group._id, {
      type: 'group_join',
      title: 'Новый участник в группе',
      message: `${req.user.name} присоединился к группе "${group.name}"`,
      data: {
        groupId: group._id,
        groupName: group.name,
        newMember: {
          id: req.user.id,
          name: req.user.name
        }
      }
    }, req.user.id); // Исключаем самого пользователя

    // Уведомляем нового участника
    await ws.sendNotification(req.user.id, {
      type: 'system',
      title: 'Вы присоединились к группе',
      message: `Вы успешно присоединились к группе "${group.name}"`,
      data: {
        groupId: group._id,
        groupName: group.name,
        subjectName: group.subjectId?.name
      }
    });

    // Отправляем WebSocket событие всем участникам группы
    sendWebSocketEvent(req, 'member-joined', {
      member: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email
      },
      groupId: group._id,
      groupName: group.name
    });

    res.json({
      success: true,
      message: 'Вы успешно присоединились к группе!',
      group: {
        id: populatedGroup._id,
        name: populatedGroup.name,
        description: populatedGroup.description,
        subjectId: populatedGroup.subjectId ? {
          id: populatedGroup.subjectId._id,
          name: populatedGroup.subjectId.name,
          color: populatedGroup.subjectId.color
        } : null,
        createdBy: {
          id: populatedGroup.createdBy._id,
          name: populatedGroup.createdBy.name,
          email: populatedGroup.createdBy.email,
          avatarUrl: populatedGroup.createdBy.avatarUrl
        },
        members: populatedGroup.members.map(member => ({
          user: {
            id: member.user._id,
            name: member.user.name,
            email: member.user.email,
            avatarUrl: member.user.avatarUrl
          },
          role: member.role,
          joinedAt: member.joinedAt
        })),
        isPublic: populatedGroup.isPublic,
        inviteCode: populatedGroup.inviteCode,
        memberCount: populatedGroup.members.length,
        createdAt: populatedGroup.createdAt
      }
    });
  })
);

/**
 * @swagger
 * /groups/{id}/members:
 *   get:
 *     summary: Получить список участников группы
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID группы
 *     responses:
 *       200:
 *         description: Список участников
 */
router.get('/:id/members',
  auth,
  idValidation,
  catchAsync(async (req, res) => {
    const group = await Group.findOne({
      _id: req.params.id,
      'members.user': req.user.id
    }).populate('members.user', 'name email avatarUrl');

    if (!group) {
      throw new AppError('Группа не найдена или доступ запрещен', 404);
    }

    const members = group.members.map(member => ({
      user: {
        id: member.user._id,
        name: member.user.name,
        email: member.user.email,
        avatarUrl: member.user.avatarUrl
      },
      role: member.role,
      joinedAt: member.joinedAt
    }));

    res.json({
      success: true,
      count: members.length,
      members
    });
  })
);

/**
 * @swagger
 * /groups/{id}/flashcards:
 *   get:
 *     summary: Получить карточки группы
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID группы
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
 *     responses:
 *       200:
 *         description: Список карточек
 */
router.get('/:id/flashcards',
  auth,
  idValidation,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  catchAsync(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const group = await Group.findOne({
      _id: req.params.id,
      'members.user': req.user.id
    });

    if (!group) {
      throw new AppError('Группа не найдена или доступ запрещен', 404);
    }

    const [flashcards, total] = await Promise.all([
      Flashcard.find({ groupId: group._id })
        .populate('authorId', 'name email avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v'),
      Flashcard.countDocuments({ groupId: group._id })
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
        authorId: {
          id: flashcard.authorId._id,
          name: flashcard.authorId.name,
          email: flashcard.authorId.email,
          avatarUrl: flashcard.authorId.avatarUrl
        },
        difficulty: flashcard.difficulty,
        knowCount: flashcard.knowCount,
        dontKnowCount: flashcard.dontKnowCount,
        createdAt: flashcard.createdAt,
        updatedAt: flashcard.updatedAt
      }))
    });
  })
);

/**
 * @swagger
 * /groups/{id}/flashcards:
 *   post:
 *     summary: Создать карточку в группе
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID группы
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - answer
 *             properties:
 *               question:
 *                 type: string
 *               answer:
 *                 type: string
 *               hint:
 *                 type: string
 *               subjectId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Карточка создана
 */
router.post('/:id/flashcards',
  auth,
  idValidation,
  sanitizeInput,
  [
    body('question').trim().notEmpty().isLength({ min: 3, max: 500 }),
    body('answer').trim().notEmpty().isLength({ min: 1, max: 1000 }),
    body('hint').optional().trim().isLength({ max: 200 }),
    body('subjectId').optional().isMongoId()
  ],
  catchAsync(async (req, res) => {
    const { question, answer, hint, subjectId } = req.body;

    const group = await Group.findOne({
      _id: req.params.id,
      'members.user': req.user.id
    });

    if (!group) {
      throw new AppError('Группа не найдена или доступ запрещен', 404);
    }

    // Проверяем разрешения
    if (!group.settings.allowMemberCreateCards && group.members.find(m => m.user.toString() === req.user.id)?.role === 'member') {
      throw new AppError('Создание карточек в этой группе ограничено', 403);
    }

    // Проверяем существование предмета
    const Subject = require('../models/Subject');
    const subject = await Subject.findById(subjectId || group.subjectId);
    if (!subject) {
      throw new AppError('Предмет не найден', 404);
    }

    const flashcard = new Flashcard({
      question: question.trim(),
      answer: answer.trim(),
      hint: hint ? hint.trim() : '',
      subjectId: subjectId || group.subjectId,
      authorId: req.user.id,
      groupId: group._id,
      difficulty: 'medium'
    });

    await flashcard.save();

    const populatedFlashcard = await Flashcard.findById(flashcard._id)
      .populate('authorId', 'name email avatarUrl')
      .select('-__v');

    const ws = req.app.get('ws');

    // Отправляем уведомления участникам группы о новой карточке
    await ws.sendGroupNotification(group._id, {
      type: 'flashcard_created',
      title: 'Новая карточка в группе',
      message: `${req.user.name} создал новую карточку в группе "${group.name}"`,
      data: {
        groupId: group._id,
        groupName: group.name,
        flashcardId: flashcard._id,
        flashcardQuestion: flashcard.question.substring(0, 50) + (flashcard.question.length > 50 ? '...' : ''),
        author: {
          id: req.user.id,
          name: req.user.name
        }
      }
    }, req.user.id);

    // Отправляем WebSocket событие
    sendWebSocketEvent(req, 'new-flashcard', {
      flashcard: {
        id: populatedFlashcard._id,
        question: populatedFlashcard.question,
        answer: populatedFlashcard.answer,
        hint: populatedFlashcard.hint,
        authorId: {
          id: populatedFlashcard.authorId._id,
          name: populatedFlashcard.authorId.name,
          avatarUrl: populatedFlashcard.authorId.avatarUrl
        },
        difficulty: populatedFlashcard.difficulty,
        createdAt: populatedFlashcard.createdAt
      },
      groupId: group._id
    });

    res.status(201).json({
      success: true,
      message: 'Карточка успешно создана в группе',
      flashcard: {
        id: populatedFlashcard._id,
        question: populatedFlashcard.question,
        answer: populatedFlashcard.answer,
        hint: populatedFlashcard.hint,
        authorId: {
          id: populatedFlashcard.authorId._id,
          name: populatedFlashcard.authorId.name,
          email: populatedFlashcard.authorId.email,
          avatarUrl: populatedFlashcard.authorId.avatarUrl
        },
        difficulty: populatedFlashcard.difficulty,
        createdAt: populatedFlashcard.createdAt
      }
    });
  })
);

/**
 * @swagger
 * /groups/{id}/notes:
 *   get:
 *     summary: Получить заметки группы
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID группы
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
 *     responses:
 *       200:
 *         description: Список заметок
 */
router.get('/:id/notes',
  auth,
  idValidation,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  catchAsync(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const group = await Group.findOne({
      _id: req.params.id,
      'members.user': req.user.id
    });

    if (!group) {
      throw new AppError('Группа не найдена или доступ запрещен', 404);
    }

    const [notes, total] = await Promise.all([
      Note.find({ groupId: group._id })
        .populate('authorId', 'name email avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v'),
      Note.countDocuments({ groupId: group._id })
    ]);

    res.json({
      success: true,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      count: notes.length,
      notes: notes.map(note => ({
        id: note._id,
        title: note.title,
        content: note.content,
        tags: note.tags,
        authorId: {
          id: note.authorId._id,
          name: note.authorId.name,
          email: note.authorId.email,
          avatarUrl: note.authorId.avatarUrl
        },
        createdAt: note.createdAt,
        updatedAt: note.updatedAt
      }))
    });
  })
);

/**
 * @swagger
 * /groups/{id}/notes:
 *   post:
 *     summary: Создать заметку в группе
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID группы
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Заметка создана
 */
router.post('/:id/notes',
  auth,
  idValidation,
  sanitizeInput,
  [
    body('title').trim().notEmpty().isLength({ min: 3, max: 100 }),
    body('content').trim().notEmpty().isLength({ min: 10, max: 10000 }),
    body('tags').optional().isArray(),
    body('tags.*').optional().isString().trim().isLength({ max: 20 })
  ],
  catchAsync(async (req, res) => {
    const { title, content, tags } = req.body;

    const group = await Group.findOne({
      _id: req.params.id,
      'members.user': req.user.id
    });

    if (!group) {
      throw new AppError('Группа не найдена или доступ запрещен', 404);
    }

    // Проверяем разрешения
    if (!group.settings.allowMemberCreateNotes && group.members.find(m => m.user.toString() === req.user.id)?.role === 'member') {
      throw new AppError('Создание заметок в этой группе ограничено', 403);
    }

    const note = new Note({
      title: title.trim(),
      content: content.trim(),
      subjectId: group.subjectId,
      authorId: req.user.id,
      groupId: group._id,
      tags: tags || [],
      isPublic: true
    });

    await note.save();

    const populatedNote = await Note.findById(note._id)
      .populate('authorId', 'name email avatarUrl')
      .select('-__v');

    const ws = req.app.get('ws');

    // Отправляем уведомления участникам группы о новой заметке
    await ws.sendGroupNotification(group._id, {
      type: 'note_created',
      title: 'Новая заметка в группе',
      message: `${req.user.name} создал новую заметку в группе "${group.name}"`,
      data: {
        groupId: group._id,
        groupName: group.name,
        noteId: note._id,
        noteTitle: note.title,
        author: {
          id: req.user.id,
          name: req.user.name
        }
      }
    }, req.user.id);

    // Отправляем WebSocket событие
    sendWebSocketEvent(req, 'new-note', {
      note: {
        id: populatedNote._id,
        title: populatedNote.title,
        content: populatedNote.content,
        tags: populatedNote.tags,
        authorId: {
          id: populatedNote.authorId._id,
          name: populatedNote.authorId.name,
          avatarUrl: populatedNote.authorId.avatarUrl
        },
        createdAt: populatedNote.createdAt,
        updatedAt: populatedNote.updatedAt
      },
      groupId: group._id
    });

    res.status(201).json({
      success: true,
      message: 'Заметка успешно создана в группе',
      note: {
        id: populatedNote._id,
        title: populatedNote.title,
        content: populatedNote.content,
        tags: populatedNote.tags,
        authorId: {
          id: populatedNote.authorId._id,
          name: populatedNote.authorId.name,
          email: populatedNote.authorId.email,
          avatarUrl: populatedNote.authorId.avatarUrl
        },
        createdAt: populatedNote.createdAt,
        updatedAt: populatedNote.updatedAt
      }
    });
  })
);

/**
 * @swagger
 * /groups/{groupId}/notes/{noteId}:
 *   put:
 *     summary: Обновить заметку в группе
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID группы
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID заметки
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Заметка обновлена
 */
router.put('/:groupId/notes/:noteId',
  auth,
  groupIdValidation,
  [
    param('noteId').notEmpty().isMongoId()
  ],
  sanitizeInput,
  [
    body('title').optional().trim().isLength({ min: 3, max: 100 }),
    body('content').optional().trim().isLength({ min: 10, max: 10000 }),
    body('tags').optional().isArray()
  ],
  catchAsync(async (req, res) => {
    const { title, content, tags } = req.body;

    const note = await Note.findOne({
      _id: req.params.noteId,
      groupId: req.params.groupId,
      authorId: req.user.id
    }).populate('authorId', 'name email avatarUrl');

    if (!note) {
      throw new AppError('Заметка не найдена или доступ запрещен', 404);
    }

    if (title !== undefined) note.title = title.trim();
    if (content !== undefined) note.content = content.trim();
    if (tags !== undefined) note.tags = tags;

    await note.save();

    res.json({
      success: true,
      message: 'Заметка успешно обновлена',
      note: {
        id: note._id,
        title: note.title,
        content: note.content,
        tags: note.tags,
        authorId: {
          id: note.authorId._id,
          name: note.authorId.name,
          email: note.authorId.email,
          avatarUrl: note.authorId.avatarUrl
        },
        updatedAt: note.updatedAt
      }
    });
  })
);

/**
 * @swagger
 * /groups/{groupId}/notes/{noteId}:
 *   delete:
 *     summary: Удалить заметку из группы
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID группы
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID заметки
 *     responses:
 *       200:
 *         description: Заметка удалена
 */
router.delete('/:groupId/notes/:noteId',
  auth,
  groupIdValidation,
  [
    param('noteId').notEmpty().isMongoId()
  ],
  catchAsync(async (req, res) => {
    const note = await Note.findOne({
      _id: req.params.noteId,
      groupId: req.params.groupId,
      authorId: req.user.id
    });

    if (!note) {
      throw new AppError('Заметка не найдена или доступ запрещен', 404);
    }

    await note.deleteOne();

    res.json({
      success: true,
      message: 'Заметка успешно удалена'
    });
  })
);

/**
 * @swagger
 * /groups/public/all:
 *   get:
 *     summary: Получить список публичных групп
 *     tags: [Groups]
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
 *         name: subjectId
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Список публичных групп
 */
router.get('/public/all',
  auth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('subjectId').optional().isMongoId(),
    query('search').optional().trim().isLength({ min: 2 })
  ],
  catchAsync(async (req, res) => {
    const { 
      page = 1, 
      limit = 20, 
      subjectId,
      search 
    } = req.query;
    
    const skip = (page - 1) * limit;

    const filter = {
      isPublic: true,
      'members.user': { $ne: req.user.id } // Исключаем группы, где пользователь уже участник
    };

    if (subjectId) {
      filter.subjectId = subjectId;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const [groups, total] = await Promise.all([
      Group.find(filter)
        .populate('createdBy', 'name email')
        .populate('subjectId', 'name color')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v'),
      Group.countDocuments(filter)
    ]);

    res.json({
      success: true,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      count: groups.length,
      groups: groups.map(group => ({
        id: group._id,
        name: group.name,
        description: group.description,
        subjectId: group.subjectId ? {
          id: group.subjectId._id,
          name: group.subjectId.name,
          color: group.subjectId.color
        } : null,
        createdBy: {
          id: group.createdBy._id,
          name: group.createdBy.name,
          email: group.createdBy.email
        },
        memberCount: group.members.length,
        inviteCode: group.inviteCode,
        createdAt: group.createdAt
      }))
    });
  })
);

module.exports = router;