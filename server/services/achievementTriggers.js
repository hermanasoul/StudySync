// server/services/achievementTriggers.js

const mongoose = require('mongoose');
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const StudySession = require('../models/StudySession');
const StudySessionParticipant = require('../models/StudySessionParticipant');
const Flashcard = require('../models/Flashcard');
const Group = require('../models/Group');
const User = require('../models/User');

class AchievementTriggers {
  constructor(wsServer) {
    this.wsServer = wsServer;
    this.setupTriggers();
  }

  setupTriggers() {
    console.log('✅ Achievement triggers initialized');
  }

  // Общий метод для отправки уведомления о достижении
  async sendAchievementNotification(userId, achievement, userAchievement) {
    try {
      if (this.wsServer && userAchievement.isUnlocked && !userAchievement.notified) {
        // Отправляем уведомление через WebSocket
        await this.wsServer.sendNotification(userId, {
          type: 'achievement',
          title: '🎉 Новое достижение!',
          message: `Вы получили достижение "${achievement.name}"!`,
          data: {
            achievementId: achievement._id,
            achievementCode: achievement.code,
            achievementName: achievement.name,
            achievementPoints: achievement.points,
            achievementIcon: achievement.icon,
            achievementDifficulty: achievement.difficulty
          }
        });

        // Помечаем как уведомленное
        userAchievement.notified = true;
        await userAchievement.save();
      }
    } catch (error) {
      console.error('Error sending achievement notification:', error);
    }
  }

  // Триггер для создания карточек
  async onFlashcardCreated(userId, flashcardData) {
    try {
      // Достижение "Первая карточка"
      let userAchievement = await Achievement.checkAchievement(userId, 'FIRST_FLASHCARD');
      let achievement = await Achievement.findOne({ code: 'FIRST_FLASHCARD' });
      if (achievement) {
        await this.sendAchievementNotification(userId, achievement, userAchievement);
      }

      // Достижение "Создатель карточек" (5 карточек)
      const flashcardCount = await Flashcard.countDocuments({ authorId: userId });
      userAchievement = await Achievement.checkAchievement(userId, 'FLASHCARD_CREATOR_5', Math.min(flashcardCount / 5 * 100, 100));
      achievement = await Achievement.findOne({ code: 'FLASHCARD_CREATOR_5' });
      if (achievement) {
        await this.sendAchievementNotification(userId, achievement, userAchievement);
      }

      // Достижение "Мастер карточек" (20 карточек)
      userAchievement = await Achievement.checkAchievement(userId, 'FLASHCARD_MASTER_20', Math.min(flashcardCount / 20 * 100, 100));
      achievement = await Achievement.findOne({ code: 'FLASHCARD_MASTER_20' });
      if (achievement) {
        await this.sendAchievementNotification(userId, achievement, userAchievement);
      }

    } catch (error) {
      console.error('Error in onFlashcardCreated trigger:', error);
    }
  }

  // Триггер для изучения карточек
  async onFlashcardStudied(userId, isCorrect) {
    try {
      // Достижение "Первое изучение"
      let userAchievement = await Achievement.checkAchievement(userId, 'FIRST_STUDY');
      let achievement = await Achievement.findOne({ code: 'FIRST_STUDY' });
      if (achievement) {
        await this.sendAchievementNotification(userId, achievement, userAchievement);
      }

      // Достижение "Усердный ученик" (10 правильных ответов)
      const correctCount = await Flashcard.aggregate([
        { $match: { authorId: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, total: { $sum: '$knowCount' } } }
      ]);
      
      const totalCorrect = correctCount[0]?.total || 0;
      userAchievement = await Achievement.checkAchievement(userId, 'STUDY_DILIGENT_10', Math.min(totalCorrect / 10 * 100, 100));
      achievement = await Achievement.findOne({ code: 'STUDY_DILIGENT_10' });
      if (achievement) {
        await this.sendAchievementNotification(userId, achievement, userAchievement);
      }

      // Достижение "Эксперт" (50 правильных ответов)
      userAchievement = await Achievement.checkAchievement(userId, 'STUDY_EXPERT_50', Math.min(totalCorrect / 50 * 100, 100));
      achievement = await Achievement.findOne({ code: 'STUDY_EXPERT_50' });
      if (achievement) {
        await this.sendAchievementNotification(userId, achievement, userAchievement);
      }

    } catch (error) {
      console.error('Error in onFlashcardStudied trigger:', error);
    }
  }

  // Триггер для создания заметок
  async onNoteCreated(userId, noteData) {
    try {
      // Достижение "Первая заметка"
      let userAchievement = await Achievement.checkAchievement(userId, 'FIRST_NOTE');
      let achievement = await Achievement.findOne({ code: 'FIRST_NOTE' });
      if (achievement) {
        await this.sendAchievementNotification(userId, achievement, userAchievement);
      }

      // Достижение "Автор заметок" (5 заметок)
      const Note = require('../models/Note');
      const noteCount = await Note.countDocuments({ authorId: userId });
      userAchievement = await Achievement.checkAchievement(userId, 'NOTE_AUTHOR_5', Math.min(noteCount / 5 * 100, 100));
      achievement = await Achievement.findOne({ code: 'NOTE_AUTHOR_5' });
      if (achievement) {
        await this.sendAchievementNotification(userId, achievement, userAchievement);
      }

    } catch (error) {
      console.error('Error in onNoteCreated trigger:', error);
    }
  }

  // Триггер для создания групп
  async onGroupCreated(userId, groupData) {
    try {
      // Достижение "Первая группа"
      let userAchievement = await Achievement.checkAchievement(userId, 'FIRST_GROUP');
      let achievement = await Achievement.findOne({ code: 'FIRST_GROUP' });
      if (achievement) {
        await this.sendAchievementNotification(userId, achievement, userAchievement);
      }

      // Достижение "Организатор" (3 группы)
      const groupCount = await Group.countDocuments({ createdBy: userId });
      userAchievement = await Achievement.checkAchievement(userId, 'GROUP_ORGANIZER_3', Math.min(groupCount / 3 * 100, 100));
      achievement = await Achievement.findOne({ code: 'GROUP_ORGANIZER_3' });
      if (achievement) {
        await this.sendAchievementNotification(userId, achievement, userAchievement);
      }

    } catch (error) {
      console.error('Error in onGroupCreated trigger:', error);
    }
  }

  // Триггер для присоединения к группам
  async onGroupJoined(userId, groupData) {
    try {
      // Достижение "Социальный ученик" (присоединиться к группе)
      let userAchievement = await Achievement.checkAchievement(userId, 'SOCIAL_LEARNER');
      let achievement = await Achievement.findOne({ code: 'SOCIAL_LEARNER' });
      if (achievement) {
        await this.sendAchievementNotification(userId, achievement, userAchievement);
      }

      // Достижение "Активный участник" (присоединиться к 3 группам)
      const userGroups = await Group.countDocuments({ 'members.user': userId });
      userAchievement = await Achievement.checkAchievement(userId, 'ACTIVE_MEMBER_3', Math.min(userGroups / 3 * 100, 100));
      achievement = await Achievement.findOne({ code: 'ACTIVE_MEMBER_3' });
      if (achievement) {
        await this.sendAchievementNotification(userId, achievement, userAchievement);
      }

    } catch (error) {
      console.error('Error in onGroupJoined trigger:', error);
    }
  }

  // Триггер для приглашения участников
  async onMemberInvited(userId, inviteData) {
    try {
      // Достижение "Приглашающий" (пригласить первого участника)
      let userAchievement = await Achievement.checkAchievement(userId, 'FIRST_INVITE');
      let achievement = await Achievement.findOne({ code: 'FIRST_INVITE' });
      if (achievement) {
        await this.sendAchievementNotification(userId, achievement, userAchievement);
      }

      // Достижение "Наставник" (пригласить 5 участников)
      const GroupInvite = require('../models/GroupInvite');
      const inviteCount = await GroupInvite.countDocuments({ invitedBy: userId, status: 'accepted' });
      userAchievement = await Achievement.checkAchievement(userId, 'MENTOR_5', Math.min(inviteCount / 5 * 100, 100));
      achievement = await Achievement.findOne({ code: 'MENTOR_5' });
      if (achievement) {
        await this.sendAchievementNotification(userId, achievement, userAchievement);
      }

    } catch (error) {
      console.error('Error in onMemberInvited trigger:', error);
    }
  }

  // Триггер для ежедневного входа
  async onDailyLogin(userId) {
    try {
      // Здесь будет логика отслеживания серий
    } catch (error) {
      console.error('Error in onDailyLogin trigger:', error);
    }
  }

  // Триггер для заполнения профиля
  async onProfileUpdated(userId, profileData) {
    try {
      const user = await User.findById(userId);
      
      let completionPercentage = 0;
      if (user.name && user.name.trim().length > 0) completionPercentage += 25;
      if (user.email && user.email.trim().length > 0) completionPercentage += 25;
      if (user.avatarUrl && user.avatarUrl.trim().length > 0) completionPercentage += 25;
      if (user.bio && user.bio.trim().length > 0) completionPercentage += 25;
      
      const userAchievement = await Achievement.checkAchievement(userId, 'PROFILE_COMPLETE', completionPercentage);
      const achievement = await Achievement.findOne({ code: 'PROFILE_COMPLETE' });
      if (achievement) {
        await this.sendAchievementNotification(userId, achievement, userAchievement);
      }

    } catch (error) {
      console.error('Error in onProfileUpdated trigger:', error);
    }
  }

  // Триггер для изучения всех карточек в предмете
  async onSubjectCompleted(userId, subjectId) {
    try {
      const totalFlashcards = await Flashcard.countDocuments({ 
        subjectId, 
        authorId: userId 
      });
      
      const studiedFlashcards = await Flashcard.countDocuments({ 
        subjectId, 
        authorId: userId,
        knowCount: { $gt: 0 }
      });
      
      const progress = totalFlashcards > 0 ? (studiedFlashcards / totalFlashcards) * 100 : 0;
      
      const userAchievement = await Achievement.checkAchievement(userId, 'SUBJECT_MASTER', progress);
      const achievement = await Achievement.findOne({ code: 'SUBJECT_MASTER' });
      if (achievement) {
        await this.sendAchievementNotification(userId, achievement, userAchievement);
      }

    } catch (error) {
      console.error('Error in onSubjectCompleted trigger:', error);
    }
  }

  // ========== НОВЫЕ МЕТОДЫ ДЛЯ УЧЕБНЫХ СЕССИЙ ==========

  // Триггер для создания учебной сессии
  async onStudySessionCreated(userId, sessionData) {
    try {
      // Достижение "Первая сессия"
      let userAchievement = await Achievement.checkAchievement(userId, 'FIRST_STUDY_SESSION');
      let achievement = await Achievement.findOne({ code: 'FIRST_STUDY_SESSION' });
      if (achievement) {
        await this.sendAchievementNotification(userId, achievement, userAchievement);
      }

      // Достижение "Организатор сессий" (5 сессий)
      const sessionCount = await StudySession.countDocuments({ host: userId });
      userAchievement = await Achievement.checkAchievement(userId, 'STUDY_SESSION_CREATOR_5', Math.min(sessionCount / 5 * 100, 100));
      achievement = await Achievement.findOne({ code: 'STUDY_SESSION_CREATOR_5' });
      if (achievement) {
        await this.sendAchievementNotification(userId, achievement, userAchievement);
      }
    } catch (error) {
      console.error('Error in onStudySessionCreated trigger:', error);
    }
  }

  // Триггер для присоединения к учебной сессии (участие)
  async onStudySessionJoined(userId, sessionData) {
    try {
      // Подсчитываем количество сессий, в которых пользователь участвовал (активно или завершён)
      const participatedCount = await StudySessionParticipant.countDocuments({
        user: userId,
        status: { $in: ['active', 'left'] }
      });

      // Достижение "Активный участник" (5 сессий)
      let userAchievement = await Achievement.checkAchievement(userId, 'STUDY_SESSION_PARTICIPANT_5', Math.min(participatedCount / 5 * 100, 100));
      let achievement = await Achievement.findOne({ code: 'STUDY_SESSION_PARTICIPANT_5' });
      if (achievement) {
        await this.sendAchievementNotification(userId, achievement, userAchievement);
      }
    } catch (error) {
      console.error('Error in onStudySessionJoined trigger:', error);
    }
  }

  // Триггер для ответа на карточку в учебной сессии (коллаборативное изучение)
  async onStudySessionFlashcardAnswered(userId, sessionId, flashcardId, isCorrect) {
    try {
      // Достижение "Совместное обучение" - считаем только ответы в сессиях с >1 участником
      const session = await StudySession.findById(sessionId).populate('participants');
      if (session && session.participants.length > 1) {
        // Получаем текущий прогресс пользователя по этому достижению
        const achievement = await Achievement.findOne({ code: 'COLLABORATIVE_CARDS_100' });
        if (achievement) {
          let userAchievement = await UserAchievement.findOne({ userId, achievementId: achievement._id });
          if (userAchievement) {
            const newProgress = Math.min(userAchievement.progress + 1, 100);
            userAchievement.progress = newProgress;
            if (newProgress >= 100 && !userAchievement.isUnlocked) {
              userAchievement.isUnlocked = true;
              userAchievement.unlockedAt = new Date();
              userAchievement.notified = false;
              await this.sendAchievementNotification(userId, achievement, userAchievement);
            }
            await userAchievement.save();
          } else {
            // Создаём новое
            const newUserAchievement = new UserAchievement({
              userId,
              achievementId: achievement._id,
              progress: 1,
              isUnlocked: false,
              notified: false
            });
            await newUserAchievement.save();
          }
        }
      }
    } catch (error) {
      console.error('Error in onStudySessionFlashcardAnswered trigger:', error);
    }
  }

  // Триггер для завершения сессии
  async onStudySessionCompleted(userId, sessionData) {
    try {
      const session = sessionData.session;
      // Достижение "Полное прохождение сессии" (если изучены все карточки)
      if (session && session.flashcards.length > 0 && 
          session.sessionStats.totalCardsReviewed >= session.flashcards.length) {
        let userAchievement = await Achievement.checkAchievement(userId, 'SESSION_COMPLETE_ALL_CARDS');
        let achievement = await Achievement.findOne({ code: 'SESSION_COMPLETE_ALL_CARDS' });
        if (achievement) {
          await this.sendAchievementNotification(userId, achievement, userAchievement);
        }
      }
    } catch (error) {
      console.error('Error in onStudySessionCompleted trigger:', error);
    }
  }

  // Триггер для завершения таймера Pomodoro (полный цикл)
  async onPomodoroComplete(userId, sessionId, cycleCount) {
    try {
      // Достижение "Мастер Pomodoro" за 1 полный цикл (work + break)
      let userAchievement = await Achievement.checkAchievement(userId, 'POMODORO_MASTER', Math.min(cycleCount, 100));
      let achievement = await Achievement.findOne({ code: 'POMODORO_MASTER' });
      if (achievement) {
        await this.sendAchievementNotification(userId, achievement, userAchievement);
      }
    } catch (error) {
      console.error('Error in onPomodoroComplete trigger:', error);
    }
  }
}

module.exports = AchievementTriggers;