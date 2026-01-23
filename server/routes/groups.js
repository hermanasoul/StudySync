// server/routes/groups.js

const express = require('express');
const mongoose = require('mongoose');
const { body, query, param } = require('express-validator');
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

// Создание группы
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

// Получение групп пользователя
router.get('/my',
  auth,
  [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Номер страницы должен быть положительным числом'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 }).withMessage('Лимит должен быть от 1 до 50'),
    
    query('role')
      .optional()
      .isIn(['owner', 'admin', 'member', 'all']).withMessage('Роль должна быть: owner, admin, member или all'),
    
    query('public')
      .optional()
      .isIn(['true', 'false', 'all']).withMessage('Публичность должна быть: true, false или all')
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

// Получение группы по ID
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

// Обновление группы
router.put('/:id',
  auth,
  idValidation,
  sanitizeInput,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 }).withMessage('Название должно быть от 3 до 50 символов'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Описание не должно превышать 500 символов'),
    
    body('isPublic')
      .optional()
      .isBoolean().withMessage('Публичность должна быть true или false'),
    
    body('settings')
      .optional()
      .isObject().withMessage('Настройки должны быть объектом'),
    
    body('settings.allowMemberInvites')
      .optional()
      .isBoolean().withMessage('allowMemberInvites должно быть true или false'),
    
    body('settings.allowMemberCreateCards')
      .optional()
      .isBoolean().withMessage('allowMemberCreateCards должно быть true или false'),
    
    body('settings.allowMemberCreateNotes')
      .optional()
      .isBoolean().withMessage('allowMemberCreateNotes должно быть true или false')
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

// Удаление группы
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

// Приглашение участников
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

// Присоединение к группе по коду
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

// Получение участников группы
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

// Получение карточек группы
router.get('/:id/flashcards',
  auth,
  idValidation,
  [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Номер страницы должен быть положительным числом'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Лимит должен быть от 1 до 100')
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

// Создание карточки в группе
router.post('/:id/flashcards',
  auth,
  idValidation,
  sanitizeInput,
  [
    body('question')
      .trim()
      .notEmpty().withMessage('Вопрос обязателен')
      .isLength({ min: 3, max: 500 }).withMessage('Вопрос должен быть от 3 до 500 символов'),
    
    body('answer')
      .trim()
      .notEmpty().withMessage('Ответ обязателен')
      .isLength({ min: 1, max: 1000 }).withMessage('Ответ должен быть от 1 до 1000 символов'),
    
    body('hint')
      .optional()
      .trim()
      .isLength({ max: 200 }).withMessage('Подсказка не должна превышать 200 символов'),
    
    body('subjectId')
      .optional()
      .isMongoId().withMessage('Некорректный ID предмета')
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

// Получение заметок группы
router.get('/:id/notes',
  auth,
  idValidation,
  [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Номер страницы должен быть положительным числом'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Лимит должен быть от 1 до 100')
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

// Создание заметки в группе
router.post('/:id/notes',
  auth,
  idValidation,
  sanitizeInput,
  [
    body('title')
      .trim()
      .notEmpty().withMessage('Заголовок обязателен')
      .isLength({ min: 3, max: 100 }).withMessage('Заголовок должен быть от 3 до 100 символов'),
    
    body('content')
      .trim()
      .notEmpty().withMessage('Содержание обязательно')
      .isLength({ min: 10, max: 10000 }).withMessage('Содержание должно быть от 10 до 10000 символов'),
    
    body('tags')
      .optional()
      .isArray().withMessage('Теги должны быть массивом'),
    
    body('tags.*')
      .optional()
      .isString().withMessage('Тег должен быть строкой')
      .trim()
      .isLength({ max: 20 }).withMessage('Тег не должен превышать 20 символов')
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

// Обновление заметки в группе
router.put('/:groupId/notes/:noteId',
  auth,
  groupIdValidation,
  [
    param('noteId')
      .notEmpty().withMessage('ID заметки обязателен')
      .isMongoId().withMessage('Некорректный ID заметки')
  ],
  sanitizeInput,
  [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 }).withMessage('Заголовок должен быть от 3 до 100 символов'),
    
    body('content')
      .optional()
      .trim()
      .isLength({ min: 10, max: 10000 }).withMessage('Содержание должно быть от 10 до 10000 символов'),
    
    body('tags')
      .optional()
      .isArray().withMessage('Теги должны быть массивом')
  ],
  catchAsync(async (req, res) => {
    const { title, content, tags } = req.body;

    const note = await Note.findOne({
      _id: req.params.noteId,
      groupId: req.params.groupId,
      authorId: req.user.id // Только автор может редактировать
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

// Удаление заметки из группы
router.delete('/:groupId/notes/:noteId',
  auth,
  groupIdValidation,
  [
    param('noteId')
      .notEmpty().withMessage('ID заметки обязателен')
      .isMongoId().withMessage('Некорректный ID заметки')
  ],
  catchAsync(async (req, res) => {
    const note = await Note.findOne({
      _id: req.params.noteId,
      groupId: req.params.groupId,
      authorId: req.user.id // Только автор может удалять
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

// Получение публичных групп
router.get('/public/all',
  auth,
  [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Номер страницы должен быть положительным числом'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 }).withMessage('Лимит должен быть от 1 до 50'),
    
    query('subjectId')
      .optional()
      .isMongoId().withMessage('Некорректный ID предмета'),
    
    query('search')
      .optional()
      .trim()
      .isLength({ min: 2 }).withMessage('Поисковый запрос должен быть не менее 2 символов')
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