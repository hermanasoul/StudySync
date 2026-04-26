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

  async sendAchievementNotification(userId, achievement, userAchievement) {
    try {
      if (this.wsServer && userAchievement.isUnlocked && !userAchievement.notified) {
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
        userAchievement.notified = true;
        await userAchievement.save();
      }
    } catch (error) {
      console.error('Error sending achievement notification:', error);
    }
  }

  // Безопасная обёртка для checkAchievement, подавляющая дубликаты
  async safeCheckAchievement(userId, code, progress) {
    try {
      return await Achievement.checkAchievement(userId, code, progress);
    } catch (error) {
      if (error.code === 11000) {
        // Достижение уже существует, это нормально
        console.log(`Achievement ${code} already exists for user ${userId}, skipping.`);
        // Возвращаем существующее или null
        const achievement = await Achievement.findOne({ code });
        if (achievement) {
          return await UserAchievement.findOne({ userId, achievementId: achievement._id });
        }
        return null;
      }
      throw error; // пробрасываем другие ошибки
    }
  }

  async onFlashcardCreated(userId, flashcardData) {
    try {
      let userAchievement = await this.safeCheckAchievement(userId, 'FIRST_FLASHCARD');
      let achievement = await Achievement.findOne({ code: 'FIRST_FLASHCARD' });
      if (achievement && userAchievement) await this.sendAchievementNotification(userId, achievement, userAchievement);

      const flashcardCount = await Flashcard.countDocuments({ authorId: userId });
      userAchievement = await this.safeCheckAchievement(userId, 'FLASHCARD_CREATOR_5', Math.min(flashcardCount / 5 * 100, 100));
      achievement = await Achievement.findOne({ code: 'FLASHCARD_CREATOR_5' });
      if (achievement && userAchievement) await this.sendAchievementNotification(userId, achievement, userAchievement);

      userAchievement = await this.safeCheckAchievement(userId, 'FLASHCARD_MASTER_20', Math.min(flashcardCount / 20 * 100, 100));
      achievement = await Achievement.findOne({ code: 'FLASHCARD_MASTER_20' });
      if (achievement && userAchievement) await this.sendAchievementNotification(userId, achievement, userAchievement);
    } catch (error) {
      console.error('Error in onFlashcardCreated trigger:', error);
    }
  }

  async onFlashcardStudied(userId, isCorrect) {
    try {
      let userAchievement = await this.safeCheckAchievement(userId, 'FIRST_STUDY');
      let achievement = await Achievement.findOne({ code: 'FIRST_STUDY' });
      if (achievement && userAchievement) await this.sendAchievementNotification(userId, achievement, userAchievement);

      const correctCount = await Flashcard.aggregate([
        { $match: { authorId: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, total: { $sum: '$knowCount' } } }
      ]);
      const totalCorrect = correctCount[0]?.total || 0;
      userAchievement = await this.safeCheckAchievement(userId, 'STUDY_DILIGENT_10', Math.min(totalCorrect / 10 * 100, 100));
      achievement = await Achievement.findOne({ code: 'STUDY_DILIGENT_10' });
      if (achievement && userAchievement) await this.sendAchievementNotification(userId, achievement, userAchievement);

      userAchievement = await this.safeCheckAchievement(userId, 'STUDY_EXPERT_50', Math.min(totalCorrect / 50 * 100, 100));
      achievement = await Achievement.findOne({ code: 'STUDY_EXPERT_50' });
      if (achievement && userAchievement) await this.sendAchievementNotification(userId, achievement, userAchievement);
    } catch (error) {
      console.error('Error in onFlashcardStudied trigger:', error);
    }
  }

  async onNoteCreated(userId, noteData) {
    try {
      let userAchievement = await this.safeCheckAchievement(userId, 'FIRST_NOTE');
      let achievement = await Achievement.findOne({ code: 'FIRST_NOTE' });
      if (achievement && userAchievement) await this.sendAchievementNotification(userId, achievement, userAchievement);

      const Note = require('../models/Note');
      const noteCount = await Note.countDocuments({ authorId: userId });
      userAchievement = await this.safeCheckAchievement(userId, 'NOTE_AUTHOR_5', Math.min(noteCount / 5 * 100, 100));
      achievement = await Achievement.findOne({ code: 'NOTE_AUTHOR_5' });
      if (achievement && userAchievement) await this.sendAchievementNotification(userId, achievement, userAchievement);
    } catch (error) {
      console.error('Error in onNoteCreated trigger:', error);
    }
  }

  async onGroupCreated(userId, groupData) {
    try {
      let userAchievement = await this.safeCheckAchievement(userId, 'FIRST_GROUP');
      let achievement = await Achievement.findOne({ code: 'FIRST_GROUP' });
      if (achievement && userAchievement) await this.sendAchievementNotification(userId, achievement, userAchievement);

      const groupCount = await Group.countDocuments({ createdBy: userId });
      userAchievement = await this.safeCheckAchievement(userId, 'GROUP_ORGANIZER_3', Math.min(groupCount / 3 * 100, 100));
      achievement = await Achievement.findOne({ code: 'GROUP_ORGANIZER_3' });
      if (achievement && userAchievement) await this.sendAchievementNotification(userId, achievement, userAchievement);
    } catch (error) {
      console.error('Error in onGroupCreated trigger:', error);
    }
  }

  async onGroupJoined(userId, groupData) {
    try {
      let userAchievement = await this.safeCheckAchievement(userId, 'SOCIAL_LEARNER');
      let achievement = await Achievement.findOne({ code: 'SOCIAL_LEARNER' });
      if (achievement && userAchievement) await this.sendAchievementNotification(userId, achievement, userAchievement);

      const userGroups = await Group.countDocuments({ 'members.user': userId });
      userAchievement = await this.safeCheckAchievement(userId, 'ACTIVE_MEMBER_3', Math.min(userGroups / 3 * 100, 100));
      achievement = await Achievement.findOne({ code: 'ACTIVE_MEMBER_3' });
      if (achievement && userAchievement) await this.sendAchievementNotification(userId, achievement, userAchievement);
    } catch (error) {
      console.error('Error in onGroupJoined trigger:', error);
    }
  }

  async onMemberInvited(userId, inviteData) {
    try {
      let userAchievement = await this.safeCheckAchievement(userId, 'FIRST_INVITE');
      let achievement = await Achievement.findOne({ code: 'FIRST_INVITE' });
      if (achievement && userAchievement) await this.sendAchievementNotification(userId, achievement, userAchievement);

      const GroupInvite = require('../models/GroupInvite');
      const inviteCount = await GroupInvite.countDocuments({ invitedBy: userId, status: 'accepted' });
      userAchievement = await this.safeCheckAchievement(userId, 'MENTOR_5', Math.min(inviteCount / 5 * 100, 100));
      achievement = await Achievement.findOne({ code: 'MENTOR_5' });
      if (achievement && userAchievement) await this.sendAchievementNotification(userId, achievement, userAchievement);
    } catch (error) {
      console.error('Error in onMemberInvited trigger:', error);
    }
  }

  async onDailyLogin(userId) {
    try {
      // Здесь будет логика отслеживания серий
    } catch (error) {
      console.error('Error in onDailyLogin trigger:', error);
    }
  }

  async onProfileUpdated(userId, profileData) {
    try {
      const user = await User.findById(userId);
      let completionPercentage = 0;
      if (user.name && user.name.trim().length > 0) completionPercentage += 25;
      if (user.email && user.email.trim().length > 0) completionPercentage += 25;
      if (user.avatarUrl && user.avatarUrl.trim().length > 0) completionPercentage += 25;
      if (user.bio && user.bio.trim().length > 0) completionPercentage += 25;
      
      const userAchievement = await this.safeCheckAchievement(userId, 'PROFILE_COMPLETE', completionPercentage);
      const achievement = await Achievement.findOne({ code: 'PROFILE_COMPLETE' });
      if (achievement && userAchievement) await this.sendAchievementNotification(userId, achievement, userAchievement);
    } catch (error) {
      console.error('Error in onProfileUpdated trigger:', error);
    }
  }

  async onSubjectCompleted(userId, subjectId) {
    try {
      const totalFlashcards = await Flashcard.countDocuments({ subjectId, authorId: userId });
      const studiedFlashcards = await Flashcard.countDocuments({ subjectId, authorId: userId, knowCount: { $gt: 0 } });
      const progress = totalFlashcards > 0 ? (studiedFlashcards / totalFlashcards) * 100 : 0;
      const userAchievement = await this.safeCheckAchievement(userId, 'SUBJECT_MASTER', progress);
      const achievement = await Achievement.findOne({ code: 'SUBJECT_MASTER' });
      if (achievement && userAchievement) await this.sendAchievementNotification(userId, achievement, userAchievement);
    } catch (error) {
      console.error('Error in onSubjectCompleted trigger:', error);
    }
  }

  async onStudySessionCreated(userId, sessionData) {
    try {
      let userAchievement = await this.safeCheckAchievement(userId, 'FIRST_STUDY_SESSION');
      let achievement = await Achievement.findOne({ code: 'FIRST_STUDY_SESSION' });
      if (achievement && userAchievement) await this.sendAchievementNotification(userId, achievement, userAchievement);

      const sessionCount = await StudySession.countDocuments({ host: userId });
      userAchievement = await this.safeCheckAchievement(userId, 'STUDY_SESSION_CREATOR_5', Math.min(sessionCount / 5 * 100, 100));
      achievement = await Achievement.findOne({ code: 'STUDY_SESSION_CREATOR_5' });
      if (achievement && userAchievement) await this.sendAchievementNotification(userId, achievement, userAchievement);
    } catch (error) {
      console.error('Error in onStudySessionCreated trigger:', error);
    }
  }

  async onStudySessionJoined(userId, sessionData) {
    try {
      const participatedCount = await StudySessionParticipant.countDocuments({ user: userId, status: { $in: ['active', 'left'] } });
      let userAchievement = await this.safeCheckAchievement(userId, 'STUDY_SESSION_PARTICIPANT_5', Math.min(participatedCount / 5 * 100, 100));
      let achievement = await Achievement.findOne({ code: 'STUDY_SESSION_PARTICIPANT_5' });
      if (achievement && userAchievement) await this.sendAchievementNotification(userId, achievement, userAchievement);
    } catch (error) {
      console.error('Error in onStudySessionJoined trigger:', error);
    }
  }

  async onStudySessionFlashcardAnswered(userId, sessionId, flashcardId, isCorrect) {
    try {
      const session = await StudySession.findById(sessionId).populate('participants');
      if (session && session.participants.length > 1) {
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
            try {
              const newUserAchievement = new UserAchievement({ userId, achievementId: achievement._id, progress: 1, isUnlocked: false, notified: false });
              await newUserAchievement.save();
            } catch (err) {
              if (err.code === 11000) {
                // уже существует
                console.log('Collaborative achievement record already exists, ignoring.');
              } else {
                throw err;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in onStudySessionFlashcardAnswered trigger:', error);
    }
  }

  async onStudySessionCompleted(userId, sessionData) {
    try {
      const session = sessionData.session;
      if (session && session.flashcards.length > 0 && session.sessionStats.totalCardsReviewed >= session.flashcards.length) {
        let userAchievement = await this.safeCheckAchievement(userId, 'SESSION_COMPLETE_ALL_CARDS');
        let achievement = await Achievement.findOne({ code: 'SESSION_COMPLETE_ALL_CARDS' });
        if (achievement && userAchievement) await this.sendAchievementNotification(userId, achievement, userAchievement);
      }
    } catch (error) {
      console.error('Error in onStudySessionCompleted trigger:', error);
    }
  }

  async onPomodoroComplete(userId, sessionId, cycleCount) {
    try {
      let userAchievement = await this.safeCheckAchievement(userId, 'POMODORO_MASTER', Math.min(cycleCount, 100));
      let achievement = await Achievement.findOne({ code: 'POMODORO_MASTER' });
      if (achievement && userAchievement) await this.sendAchievementNotification(userId, achievement, userAchievement);
    } catch (error) {
      console.error('Error in onPomodoroComplete trigger:', error);
    }
  }
}

module.exports = AchievementTriggers;