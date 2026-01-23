// server/services/achievementTriggers.js

const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');

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
      const flashcardCount = await require('../models/Flashcard').countDocuments({ authorId: userId });
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
      const Flashcard = require('../models/Flashcard');
      const correctCount = await Flashcard.aggregate([
        { $match: { authorId: new require('mongoose').Types.ObjectId(userId) } },
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

      // Достижение "Серия правильных ответов" (5 подряд)
      // Здесь нужно хранить состояние серии в кэше или сессии
      // Пока пропускаем, реализуем позже

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
      const noteCount = await require('../models/Note').countDocuments({ authorId: userId });
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
      const groupCount = await require('../models/Group').countDocuments({ createdBy: userId });
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
      const Group = require('../models/Group');
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
      const inviteCount = await require('../models/GroupInvite').countDocuments({ invitedBy: userId, status: 'accepted' });
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
      // Достижение "Ежедневный посетитель" (войти 3 дня подряд)
      // Здесь нужна логика отслеживания серий
      // Пока пропускаем, реализуем позже

      // Достижение "Неделя активности" (войти 7 дней)
      // Аналогично

    } catch (error) {
      console.error('Error in onDailyLogin trigger:', error);
    }
  }

  // Триггер для заполнения профиля
  async onProfileUpdated(userId, profileData) {
    try {
      // Достижение "Профиль завершен" (заполнить все поля профиля)
      const User = require('../models/User');
      const user = await User.findById(userId);
      
      let completionPercentage = 0;
      if (user.name && user.name.trim().length > 0) completionPercentage += 25;
      if (user.email && user.email.trim().length > 0) completionPercentage += 25;
      // Добавьте другие поля профиля по необходимости
      
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
      // Достижение "Предмет освоен" (изучить все карточки в предмете)
      const Flashcard = require('../models/Flashcard');
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
}

module.exports = AchievementTriggers;