// server/routes/studySessions.js

const express = require('express');
const router = express.Router();
const StudySession = require('../models/StudySession');
const StudySessionParticipant = require('../models/StudySessionParticipant');
const User = require('../models/User');
const Flashcard = require('../models/Flashcard');
const Group = require('../models/Group');
const Subject = require('../models/Subject');
const { auth } = require('../middleware/auth');
const { AppError, catchAsync } = require('../middleware/errorHandler');
const mongoose = require('mongoose');
const AchievementTriggers = require('../services/achievementTriggers');
const Notification = require('../models/Notification');
const { clearCacheOnMutation } = require('../middleware/cache');

/**
 * @swagger
 * tags:
 *   name: StudySessions
 *   description: Управление учебными сессиями
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     StudySession:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         host:
 *           $ref: '#/components/schemas/User'
 *         subjectId:
 *           $ref: '#/components/schemas/Subject'
 *         groupId:
 *           $ref: '#/components/schemas/Group'
 *         accessType:
 *           type: string
 *           enum: [public, friends, private]
 *         studyMode:
 *           type: string
 *           enum: [collaborative, individual, host-controlled]
 *         status:
 *           type: string
 *           enum: [waiting, active, paused, completed]
 *         participantCount:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         avatarUrl:
 *           type: string
 *         level:
 *           type: number
 *     Subject:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         icon:
 *           type: string
 *     Group:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 */

// ==================== ИСТОРИЯ СЕССИЙ ПОЛЬЗОВАТЕЛЯ ====================
router.get('/history',
  auth,
  catchAsync(async (req, res, next) => {
    const { subjectId, from, to, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const query = {
      'participants.user': req.user.id,
      status: 'completed'
    };

    if (subjectId) query.subjectId = subjectId;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const [sessions, total] = await Promise.all([
      StudySession.find(query)
        .populate('host', 'name avatarUrl')
        .populate('subjectId', 'name icon color')
        .populate('groupId', 'name')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      StudySession.countDocuments(query)
    ]);

    const sessionsWithUserStats = await Promise.all(sessions.map(async (session) => {
      const participantStats = await StudySessionParticipant.findOne({
        session: session._id,
        user: req.user.id
      }).select('stats').lean();

      return {
        ...session,
        userStats: participantStats?.stats || {
          timeSpent: 0,
          cardsReviewed: 0,
          correctAnswers: 0,
          streak: 0
        }
      };
    }));

    res.json({
      success: true,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      count: sessionsWithUserStats.length,
      sessions: sessionsWithUserStats
    });
  })
);

// ==================== СОЗДАНИЕ СЕССИИ ====================
router.post('/', 
  auth,
  clearCacheOnMutation(),
  catchAsync(async (req, res, next) => {
    const { 
      name, 
      description, 
      subjectId, 
      groupId,
      accessType = 'public',
      studyMode = 'collaborative',
      pomodoroSettings = {},
      flashcardIds = [],
      invitedUsers = []
    } = req.body;

    const subject = await Subject.findById(subjectId);
    if (!subject) return next(new AppError('Предмет не найден', 404));

    if (groupId) {
      const group = await Group.findOne({
        _id: groupId,
        'members.user': req.user.id
      });
      if (!group) return next(new AppError('Группа не найдена или доступ запрещен', 403));
    }

    let flashcards = [];
    if (flashcardIds && flashcardIds.length > 0) {
      const userFlashcards = await Flashcard.find({
        _id: { $in: flashcardIds },
        $or: [
          { authorId: req.user.id },
          { groupId: groupId || null }
        ]
      });
      if (userFlashcards.length !== flashcardIds.length) {
        return next(new AppError('Некоторые карточки недоступны', 403));
      }
      flashcards = userFlashcards.map((flashcard, index) => ({
        flashcardId: flashcard._id,
        order: index
      }));
    } else {
      const userFlashcards = await Flashcard.find({
        subjectId,
        authorId: req.user.id
      }).limit(50);
      flashcards = userFlashcards.map((flashcard, index) => ({
        flashcardId: flashcard._id,
        order: index
      }));
    }

    const session = new StudySession({
      name,
      description,
      host: req.user.id,
      subjectId,
      groupId: groupId || null,
      accessType,
      studyMode,
      pomodoroSettings: {
        workDuration: pomodoroSettings.workDuration || 25,
        breakDuration: pomodoroSettings.breakDuration || 5,
        autoSwitch: pomodoroSettings.autoSwitch !== false
      },
      flashcards,
      participants: [{
        user: req.user.id,
        role: 'host',
        status: 'active'
      }],
      status: 'waiting',
      invitedUsers
    });

    await session.save();

    const participantRecord = new StudySessionParticipant({
      session: session._id,
      user: req.user.id,
      status: 'active'
    });
    await participantRecord.save();

    // Отправка уведомлений приглашенным пользователям
    const ws = req.app.get('ws');
    if (invitedUsers && invitedUsers.length > 0) {
      for (const userId of invitedUsers) {
        await Notification.create({
          userId,
          type: 'study_session_invite',
          title: 'Приглашение в учебную сессию',
          message: `${req.user.name} приглашает вас в учебную сессию "${name}" по предмету ${subject.name}`,
          data: {
            sessionId: session._id,
            sessionName: name,
            subjectName: subject.name,
            hostId: req.user.id,
            hostName: req.user.name
          }
        });
        if (ws) {
          await ws.sendNotification(userId, {
            type: 'study_session_invite',
            title: 'Приглашение в учебную сессию',
            message: `${req.user.name} приглашает вас в учебную сессию "${name}"`,
            data: { sessionId: session._id }
          });
        }
      }
    }

    // Вызов триггера достижения за создание сессии
    if (ws) {
      const triggers = new AchievementTriggers(ws);
      await triggers.onStudySessionCreated(req.user.id, session);
    }

    const populatedSession = await StudySession.findById(session._id)
      .populate('host', 'name avatarUrl level')
      .populate('subjectId', 'name')
      .populate('flashcards.flashcardId');

    res.status(201).json({
      success: true,
      message: 'Учебная сессия создана',
      session: populatedSession
    });
  })
);

// ==================== ПОЛУЧЕНИЕ АКТИВНЫХ СЕССИЙ ====================
router.get('/active',
  auth,
  catchAsync(async (req, res, next) => {
    const { accessType, subjectId, groupId, friendsOnly, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    let query = { 
      status: { $in: ['waiting', 'active'] }
    };

    if (accessType) query.accessType = accessType;
    if (subjectId) query.subjectId = subjectId;
    if (groupId) query.groupId = groupId;

    if (friendsOnly === 'true') {
      query.accessType = 'friends';
      const user = await User.findById(req.user.id);
      const friendIds = user.friends
        .filter(f => f.status === 'accepted')
        .map(f => f.userId);
      query.host = { $in: friendIds };
      query.$or = [
        { host: { $in: friendIds } },
        { invitedUsers: req.user.id }
      ];
    }

    const [sessions, total] = await Promise.all([
      StudySession.find(query)
        .populate('host', 'name avatarUrl level')
        .populate('subjectId', 'name')
        .populate('participants.user', 'name avatarUrl level')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum),
      StudySession.countDocuments(query)
    ]);

    res.json({
      success: true,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      count: sessions.length,
      sessions
    });
  })
);

// ==================== ПРИСОЕДИНЕНИЕ К СЕССИИ ====================
router.post('/:id/join',
  auth,
  clearCacheOnMutation(),
  catchAsync(async (req, res, next) => {
    const session = await StudySession.findById(req.params.id)
      .populate('host', 'friends')
      .populate('participants.user');

    if (!session) return next(new AppError('Сессия не найдена', 404));

    const userId = req.user.id.toString();
    const hostId = session.host._id.toString();
    const isHost = hostId === userId;
    const isParticipant = session.participants.some(p => p.user._id.toString() === userId);

    console.log(`🔍 Join request: user=${userId}, host=${hostId}, isHost=${isHost}, isParticipant=${isParticipant}`);

    if (isHost || isParticipant) {
      console.log('✅ Allowing join (host or existing participant)');
      await session.addParticipant(userId);
      const participantRecord = new StudySessionParticipant({
        session: session._id,
        user: userId,
        status: 'active'
      });
      await participantRecord.save();

      const populatedSession = await StudySession.findById(session._id)
        .populate('host', 'name avatarUrl level')
        .populate('participants.user', 'name avatarUrl level')
        .populate('subjectId', 'name')
        .populate('flashcards.flashcardId');
      return res.json({ success: true, message: 'Вы уже в сессии', session: populatedSession });
    }

    console.log(`🔒 Checking access for new user. Access type: ${session.accessType}`);
    if (session.accessType === 'private') {
      const isInvited = session.invitedUsers.some(id => id.toString() === userId);
      if (!isInvited) return next(new AppError('Вы не приглашены в эту сессию', 403));
    } else if (session.accessType === 'friends') {
      const host = await User.findById(session.host._id).select('friends');
      const isFriend = host.friends.some(f => f.userId && f.userId.toString() === userId && f.status === 'accepted');
      if (!isFriend) return next(new AppError('Сессия доступна только друзьям', 403));
    }

    await session.addParticipant(userId);
    const participantRecord = new StudySessionParticipant({
      session: session._id,
      user: userId,
      status: 'active'
    });
    await participantRecord.save();

    const ws = req.app.get('ws');
    if (ws) {
      const triggers = new AchievementTriggers(ws);
      await triggers.onStudySessionJoined(userId, session);
    }

    const populatedSession = await StudySession.findById(session._id)
      .populate('host', 'name avatarUrl level')
      .populate('participants.user', 'name avatarUrl level')
      .populate('subjectId', 'name')
      .populate('flashcards.flashcardId');

    res.json({
      success: true,
      message: 'Вы присоединились к сессии',
      session: populatedSession
    });
  })
);

// ==================== ПОЛУЧЕНИЕ ИНФОРМАЦИИ О СЕССИИ ====================
router.get('/:id',
  auth,
  catchAsync(async (req, res, next) => {
    const session = await StudySession.findById(req.params.id)
      .populate('host', 'name avatarUrl level')
      .populate('participants.user', 'name avatarUrl level')
      .populate('subjectId', 'name')
      .populate('flashcards.flashcardId')
      .populate('groupId', 'name');

    if (!session) return next(new AppError('Сессия не найдена', 404));

    const participantsStats = await StudySessionParticipant.find({
      session: session._id,
      status: 'active'
    }).populate('user', 'name avatarUrl level');

    res.json({
      success: true,
      session,
      participantsStats
    });
  })
);

// ==================== УПРАВЛЕНИЕ ТАЙМЕРОМ ====================
router.post('/:id/timer',
  auth,
  clearCacheOnMutation(),
  catchAsync(async (req, res, next) => {
    const { action, timerType } = req.body;
    const session = await StudySession.findById(req.params.id);

    if (!session) return next(new AppError('Сессия не найдена', 404));

    const participant = session.participants.find(p => p.user.toString() === req.user.id.toString());
    if (!participant || (participant.role !== 'host' && participant.role !== 'co-host')) {
      return next(new AppError('Только хост или со-хост может управлять таймером', 403));
    }

    switch (action) {
      case 'start':
        session.timerState = {
          active: true,
          type: timerType || 'work',
          startTime: new Date(),
          remaining: timerType === 'work' 
            ? session.pomodoroSettings.workDuration * 60 
            : session.pomodoroSettings.breakDuration * 60
        };
        break;
      case 'pause':
        if (session.timerState.active) {
          const elapsed = Math.floor((new Date() - session.timerState.startTime) / 1000);
          session.timerState.remaining = Math.max(0, session.timerState.remaining - elapsed);
          session.timerState.active = false;
          session.timerState.totalElapsed += elapsed;
        }
        break;
      case 'reset':
        session.timerState = {
          active: false,
          type: 'work',
          startTime: null,
          remaining: session.pomodoroSettings.workDuration * 60,
          totalElapsed: 0
        };
        break;
      case 'switch': {
        const oldType = session.timerState.type;
        const newType = oldType === 'work' ? 'break' : 'work';
        if (oldType === 'break' && newType === 'work') {
          const ws = req.app.get('ws');
          if (ws) {
            const triggers = new AchievementTriggers(ws);
            await triggers.onPomodoroComplete(req.user.id, session._id, 1);
          }
        }
        session.timerState = {
          active: true,
          type: newType,
          startTime: new Date(),
          remaining: newType === 'work' 
            ? session.pomodoroSettings.workDuration * 60 
            : session.pomodoroSettings.breakDuration * 60,
          totalElapsed: session.timerState.totalElapsed || 0
        };
        break;
      }
    }

    await session.save();

    res.json({
      success: true,
      message: 'Таймер обновлен',
      timerState: session.timerState
    });
  })
);

// ==================== УПРАВЛЕНИЕ КАРТОЧКАМИ ====================
router.post('/:id/flashcards',
  auth,
  clearCacheOnMutation(),
  catchAsync(async (req, res, next) => {
    const { action, flashcardId, answer } = req.body;
    const session = await StudySession.findById(req.params.id);

    if (!session) return next(new AppError('Сессия не найдена', 404));

    let result = {};

    switch (action) {
      case 'next':
        if (session.currentFlashcardIndex < session.flashcards.length - 1) {
          session.currentFlashcardIndex += 1;
          session.sessionStats.totalCardsReviewed += 1;
        }
        break;
      case 'previous':
        if (session.currentFlashcardIndex > 0) {
          session.currentFlashcardIndex -= 1;
        }
        break;
      case 'jump':
        const index = parseInt(req.body.index);
        if (index >= 0 && index < session.flashcards.length) {
          session.currentFlashcardIndex = index;
        }
        break;
      case 'answer':
        if (!flashcardId) return next(new AppError('ID карточки обязателен', 400));

        const participant = session.participants.find(p => p.user.toString() === req.user.id.toString());
        if (participant) {
          participant.stats.cardsReviewed += 1;
          if (answer === 'correct') {
            participant.stats.correctAnswers += 1;
            participant.stats.streak += 1;
          } else {
            participant.stats.streak = 0;
          }
          const flashcard = session.flashcards.find(f => f.flashcardId.toString() === flashcardId);
          if (flashcard) {
            flashcard.reviewedBy.push({
              user: req.user.id,
              isCorrect: answer === 'correct',
              reviewedAt: new Date()
            });
          }
          result.participantStats = participant.stats;
        }

        // Сохраняем сессию после ответа
        await session.save();

        // Проверяем завершение сессии (все карточки изучены всеми активными участниками)
        const activeParticipants = session.participants.filter(p => p.status === 'active');
        const allFlashcardsReviewed = session.flashcards.every(flashcard => {
          const uniqueReviewers = new Set(flashcard.reviewedBy.map(r => r.user.toString()));
          return uniqueReviewers.size >= activeParticipants.length;
        });

        if (allFlashcardsReviewed && session.status === 'active') {
          session.status = 'completed';
          await session.save();

          const ws = req.app.get('ws');
          if (ws) {
            ws.emitToStudySession(session._id, 'study_session_completed', {
              sessionId: session._id,
              reason: 'all_flashcards_reviewed',
              timestamp: new Date().toISOString()
            });

            // Вызов триггера завершения сессии для всех участников
            const triggers = new AchievementTriggers(ws);
            for (const p of activeParticipants) {
              await triggers.onStudySessionCompleted(p.user, { session });
            }
          }
        }

        // Вызов триггера ответа на карточку
        const ws = req.app.get('ws');
        if (ws) {
          const triggers = new AchievementTriggers(ws);
          await triggers.onStudySessionFlashcardAnswered(
            req.user.id,
            session._id,
            flashcardId,
            answer === 'correct'
          );
        }
        break;
    }

    const currentFlashcard = session.flashcards[session.currentFlashcardIndex]
      ? await Flashcard.findById(session.flashcards[session.currentFlashcardIndex].flashcardId)
      : null;

    res.json({
      success: true,
      message: 'Действие выполнено',
      currentFlashcardIndex: session.currentFlashcardIndex,
      currentFlashcard,
      totalFlashcards: session.flashcards.length,
      ...result
    });
  })
);

// ==================== ВЫХОД ИЗ СЕССИИ ====================
router.post('/:id/leave',
  auth,
  clearCacheOnMutation(),
  catchAsync(async (req, res, next) => {
    const session = await StudySession.findById(req.params.id);
    if (!session) return next(new AppError('Сессия не найдена', 404));

    await session.removeParticipant(req.user.id);

    await StudySessionParticipant.findOneAndUpdate(
      { session: session._id, user: req.user.id },
      { status: 'left', leftAt: new Date() }
    );

    const activeParticipants = session.participants.filter(p => p.status === 'active');
    if (activeParticipants.length === 0) {
      session.status = 'completed';
      await session.save();

      const ws = req.app.get('ws');
      if (ws) {
        const triggers = new AchievementTriggers(ws);
        // Здесь нет конкретного пользователя, для которого вызывать завершение, пропускаем
      }
    }

    res.json({
      success: true,
      message: 'Вы вышли из сессии'
    });
  })
);

// ==================== СТАТИСТИКА СЕССИИ ====================
router.get('/:id/stats',
  auth,
  catchAsync(async (req, res, next) => {
    const session = await StudySession.findById(req.params.id);
    if (!session) return next(new AppError('Сессия не найдена', 404));

    const participantsStats = await StudySessionParticipant.find({
      session: session._id
    }).populate('user', 'name avatarUrl level');

    const totalCards = session.flashcards.length;
    const totalReviewed = participantsStats.reduce((sum, p) => sum + p.stats.cardsReviewed, 0);
    const totalCorrect = participantsStats.reduce((sum, p) => sum + p.stats.correctAnswers, 0);
    const totalTime = participantsStats.reduce((sum, p) => sum + p.stats.timeSpent, 0);
    
    const stats = {
      session: {
        totalCards,
        totalReviewed,
        totalCorrect,
        totalTime,
        averageSuccessRate: totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : 0,
        participantCount: participantsStats.length
      },
      participants: participantsStats.map(p => ({
        user: p.user,
        stats: p.stats,
        successRate: p.stats.cardsReviewed > 0 
          ? Math.round((p.stats.correctAnswers / p.stats.cardsReviewed) * 100) 
          : 0
      })),
      leaderboard: participantsStats
        .map(p => ({
          user: p.user,
          stats: p.stats,
          successRate: p.stats.cardsReviewed > 0 
            ? Math.round((p.stats.correctAnswers / p.stats.cardsReviewed) * 100) 
            : 0
        }))
        .sort((a, b) => b.stats.correctAnswers - a.stats.correctAnswers)
    };

    res.json({ success: true, stats });
  })
);

// ==================== ПРИГЛАШЕНИЕ ПОЛЬЗОВАТЕЛЕЙ ====================
router.post('/:id/invite',
  auth,
  clearCacheOnMutation(),
  catchAsync(async (req, res, next) => {
    const { userIds } = req.body;
    const session = await StudySession.findById(req.params.id);
    if (!session) return next(new AppError('Сессия не найдена', 404));
    
    // Разрешаем приглашать хосту и со-хосту
    const participant = session.participants.find(p => p.user.toString() === req.user.id.toString());
    if (!participant || (participant.role !== 'host' && participant.role !== 'co-host')) {
      return next(new AppError('Только хост или со-хост может приглашать пользователей', 403));
    }

    const users = await User.find({ _id: { $in: userIds } });
    if (users.length !== userIds.length) {
      return next(new AppError('Некоторые пользователи не найдены', 404));
    }

    session.invitedUsers = Array.from(new Set([...session.invitedUsers, ...userIds]));
    await session.save();

    const ws = req.app.get('ws');
    if (ws) {
      for (const userId of userIds) {
        await ws.sendNotification(userId, {
          type: 'study_session_invite',
          title: 'Приглашение в учебную сессию',
          message: `${req.user.name} приглашает вас в сессию "${session.name}"`,
          data: {
            sessionId: session._id,
            sessionName: session.name,
            hostId: session.host,
            hostName: req.user.name
          }
        });
      }
    }

    res.json({
      success: true,
      message: 'Приглашения отправлены',
      invitedCount: userIds.length
    });
  })
);

// ==================== ИЗМЕНЕНИЕ НАСТРОЕК ====================
router.put('/:id/settings',
  auth,
  clearCacheOnMutation(),
  catchAsync(async (req, res, next) => {
    const { studyMode, pomodoroSettings, notifications, accessType } = req.body;
    const session = await StudySession.findById(req.params.id);
    if (!session) return next(new AppError('Сессия не найдена', 404));
    
    const participant = session.participants.find(p => p.user.toString() === req.user.id.toString());
    if (!participant || participant.role !== 'host') {
      return next(new AppError('Только хост может изменять настройки', 403));
    }

    if (studyMode) session.studyMode = studyMode;
    if (pomodoroSettings) session.pomodoroSettings = { ...session.pomodoroSettings, ...pomodoroSettings };
    if (notifications) session.notifications = { ...session.notifications, ...notifications };
    if (accessType) session.accessType = accessType;

    await session.save();

    res.json({
      success: true,
      message: 'Настройки обновлены',
      settings: {
        studyMode: session.studyMode,
        pomodoroSettings: session.pomodoroSettings,
        notifications: session.notifications,
        accessType: session.accessType
      }
    });
  })
);

// ==================== ЗАПУСК СЕССИИ (ИСПРАВЛЕН - приведение типов) ====================
router.post('/:id/start',
  auth,
  clearCacheOnMutation(),
  catchAsync(async (req, res, next) => {
    const session = await StudySession.findById(req.params.id);
    if (!session) return next(new AppError('Сессия не найдена', 404));

    // Приводим оба ID к строкам для корректного сравнения
    const userId = req.user.id.toString();
    const hostId = session.host ? session.host.toString() : null;

    console.log('=== START REQUEST (FIXED) ===');
    console.log('req.user.id (string):', userId);
    console.log('session.host (string):', hostId);

    if (!hostId || hostId !== userId) {
      console.log('❌ Отказано: пользователь не является хостом');
      return next(new AppError('Только хост может начать сессию', 403));
    }

    if (session.status !== 'waiting') {
      return next(new AppError('Сессия уже начата или завершена', 400));
    }

    console.log('✅ Хост подтверждён, запускаем сессию');

    session.status = 'active';
    session.timerState = {
      active: false,
      type: 'work',
      startTime: null,
      remaining: session.pomodoroSettings.workDuration * 60,
      totalElapsed: 0
    };
    await session.save();

    const ws = req.app.get('ws');
    if (ws) {
      ws.emitToStudySession(session._id, 'study_session_started', {
        sessionId: session._id,
        startedBy: req.user.id,
        timestamp: new Date().toISOString()
      });
      for (const participant of session.participants) {
        if (participant.status === 'active' && participant.user.toString() !== userId) {
          await ws.sendNotification(participant.user.toString(), {
            type: 'study_session_started',
            title: 'Сессия началась!',
            message: `Учебная сессия "${session.name}" началась. Присоединяйтесь!`,
            data: { sessionId: session._id }
          });
        }
      }
    }

    res.json({ success: true, message: 'Сессия начата', session });
  })
);

// ==================== ЗАВЕРШЕНИЕ СЕССИИ (исправлен) ====================
router.post('/:id/complete',
  auth,
  clearCacheOnMutation(),
  catchAsync(async (req, res, next) => {
    const session = await StudySession.findById(req.params.id);
    if (!session) return next(new AppError('Сессия не найдена', 404));
    
    const hostId = session.host ? session.host.toString() : null;
    const userId = req.user.id.toString();
    if (!hostId || hostId !== userId) {
      return next(new AppError('Только хост может завершить сессию', 403));
    }

    if (session.status === 'completed') return next(new AppError('Сессия уже завершена', 400));
    
    session.status = 'completed';
    await session.save();
    
    const ws = req.app.get('ws');
    if (ws) {
      const triggers = new AchievementTriggers(ws);
      const activeParticipants = session.participants.filter(p => p.status === 'active');
      for (const p of activeParticipants) {
        await triggers.onStudySessionCompleted(p.user, { session });
      }
    }
    
    res.json({ success: true, message: 'Сессия завершена' });
  })
);

module.exports = router;