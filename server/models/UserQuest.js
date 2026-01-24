// server/models/UserQuest.js

const mongoose = require('mongoose');

const userQuestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'ID пользователя обязательно'],
    index: true
  },
  questId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quest',
    required: [true, 'ID задания обязательно'],
    index: true
  },
  progress: {
    type: Number,
    default: 0,
    min: [0, 'Прогресс не может быть отрицательным']
  },
  requiredProgress: {
    type: Number,
    required: [true, 'Требуемый прогресс обязателен'],
    min: [1, 'Требуемый прогресс должен быть положительным']
  },
  isCompleted: {
    type: Boolean,
    default: false,
    index: true
  },
  completedAt: {
    type: Date,
    index: true
  },
  claimed: {
    type: Boolean,
    default: false
  },
  claimedAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    index: true
  },
  attempts: {
    type: Number,
    default: 0,
    min: [0, 'Попытки не могут быть отрицательными']
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Составной индекс для быстрого поиска заданий пользователя
userQuestSchema.index({ userId: 1, questId: 1 }, { unique: true });
userQuestSchema.index({ userId: 1, isCompleted: 1 });
userQuestSchema.index({ userId: 1, expiresAt: 1 });
userQuestSchema.index({ completedAt: -1 });

// Предварительная обработка перед сохранением
userQuestSchema.pre('save', function(next) {
  // Если прогресс достиг требуемого и задание еще не выполнено
  if (this.progress >= this.requiredProgress && !this.isCompleted) {
    this.isCompleted = true;
    this.completedAt = new Date();
  }
  
  next();
});

// Статический метод для обновления прогресса задания
userQuestSchema.statics.updateQuestProgress = async function(userId, questCode, progress = 1) {
  const Quest = require('./Quest');
  const quest = await Quest.findOne({ code: questCode, isActive: true });
  
  if (!quest) {
    throw new Error(`Quest ${questCode} not found`);
  }
  
  let userQuest = await this.findOne({
    userId,
    questId: quest._id
  });
  
  if (!userQuest) {
    // Создаем новое задание пользователя
    const requiredProgress = quest.requirements.count || 1;
    
    // Рассчитываем дату истечения
    let expiresAt = null;
    if (quest.timeLimit > 0) {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + quest.timeLimit);
    } else if (quest.type === 'daily') {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);
      expiresAt.setHours(0, 0, 0, 0);
    } else if (quest.type === 'weekly') {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      expiresAt.setHours(0, 0, 0, 0);
    }
    
    userQuest = new this({
      userId,
      questId: quest._id,
      progress: 0,
      requiredProgress,
      expiresAt
    });
  }
  
  // Проверяем срок действия
  if (userQuest.expiresAt && new Date() > userQuest.expiresAt) {
    // Задание истекло
    userQuest.progress = 0;
    userQuest.isCompleted = false;
    
    // Обновляем дату истечения для ежедневных/еженедельных заданий
    if (quest.type === 'daily') {
      userQuest.expiresAt = new Date();
      userQuest.expiresAt.setDate(userQuest.expiresAt.getDate() + 1);
      userQuest.expiresAt.setHours(0, 0, 0, 0);
    } else if (quest.type === 'weekly') {
      userQuest.expiresAt = new Date();
      userQuest.expiresAt.setDate(userQuest.expiresAt.getDate() + 7);
      userQuest.expiresAt.setHours(0, 0, 0, 0);
    }
  }
  
  // Увеличиваем прогресс
  userQuest.progress = Math.min(userQuest.progress + progress, userQuest.requiredProgress);
  userQuest.attempts += 1;
  
  await userQuest.save();
  return userQuest;
};

// Статический метод для получения текущих заданий пользователя
userQuestSchema.statics.getUserQuests = async function(userId) {
  const now = new Date();
  
  const userQuests = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: now } }
        ]
      }
    },
    {
      $lookup: {
        from: 'quests',
        localField: 'questId',
        foreignField: '_id',
        as: 'quest'
      }
    },
    {
      $unwind: '$quest'
    },
    {
      $match: {
        'quest.isActive': true
      }
    },
    {
      $project: {
        _id: 1,
        questId: 1,
        progress: 1,
        requiredProgress: 1,
        isCompleted: 1,
        completedAt: 1,
        claimed: 1,
        claimedAt: 1,
        expiresAt: 1,
        attempts: 1,
        createdAt: 1,
        updatedAt: 1,
        quest: {
          code: 1,
          name: 1,
          description: 1,
          icon: 1,
          type: 1,
          category: 1,
          difficulty: 1,
          difficultyClass: 1,
          difficultyColor: 1,
          points: 1,
          rewards: 1,
          timeLimit: 1
        }
      }
    },
    {
      $sort: {
        'quest.type': 1,
        isCompleted: 1,
        createdAt: 1
      }
    }
  ]);
  
  return userQuests;
};

// Статический метод для получения статистики заданий
userQuestSchema.statics.getQuestStats = async function(userId) {
  const stats = await this.aggregate([
    {
      $match: { userId: new mongoose.Types.ObjectId(userId) }
    },
    {
      $lookup: {
        from: 'quests',
        localField: 'questId',
        foreignField: '_id',
        as: 'quest'
      }
    },
    {
      $unwind: '$quest'
    },
    {
      $group: {
        _id: null,
        totalCompleted: {
          $sum: { $cond: [{ $eq: ['$isCompleted', true] }, 1, 0] }
        },
        totalClaimed: {
          $sum: { $cond: [{ $eq: ['$claimed', true] }, 1, 0] }
        },
        totalPoints: {
          $sum: { $cond: [{ $eq: ['$claimed', true] }, '$quest.points', 0] }
        },
        totalExperience: {
          $sum: { $cond: [{ $eq: ['$claimed', true] }, '$quest.rewards.experience', 0] }
        },
        byType: {
          $push: {
            type: '$quest.type',
            completed: '$isCompleted',
            claimed: '$claimed',
            points: '$quest.points'
          }
        },
        byCategory: {
          $push: {
            category: '$quest.category',
            completed: '$isCompleted',
            claimed: '$claimed',
            points: '$quest.points'
          }
        },
        dailyStreak: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$quest.type', 'daily'] },
                  { $eq: ['$isCompleted', true] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
  
  if (stats.length === 0) {
    return {
      totalCompleted: 0,
      totalClaimed: 0,
      totalPoints: 0,
      totalExperience: 0,
      dailyStreak: 0,
      byType: {},
      byCategory: {}
    };
  }
  
  const result = stats[0];
  
  // Преобразуем массивы в объекты
  result.byType = {};
  result.byCategory = {};
  
  stats[0].byType.forEach(item => {
    if (!result.byType[item.type]) {
      result.byType[item.type] = {
        completed: 0,
        claimed: 0,
        points: 0
      };
    }
    
    if (item.completed) result.byType[item.type].completed += 1;
    if (item.claimed) result.byType[item.type].claimed += 1;
    if (item.claimed) result.byType[item.type].points += item.points;
  });
  
  stats[0].byCategory.forEach(item => {
    if (!result.byCategory[item.category]) {
      result.byCategory[item.category] = {
        completed: 0,
        claimed: 0,
        points: 0
      };
    }
    
    if (item.completed) result.byCategory[item.category].completed += 1;
    if (item.claimed) result.byCategory[item.category].claimed += 1;
    if (item.claimed) result.byCategory[item.category].points += item.points;
  });
  
  delete result._id;
  delete result.byType; // Удаляем исходный массив
  delete result.byCategory; // Удаляем исходный массив
  
  return {
    ...result,
    byType: result.byType,
    byCategory: result.byCategory
  };
};

module.exports = mongoose.model('UserQuest', userQuestSchema);