// server/models/UserAchievement.js

const mongoose = require('mongoose');

const userAchievementSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'ID пользователя обязательно'],
    index: true
  },
  achievementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement',
    required: [true, 'ID достижения обязательно'],
    index: true
  },
  progress: {
    type: Number,
    default: 0,
    min: [0, 'Прогресс не может быть отрицательным'],
    max: [100, 'Прогресс не может превышать 100%']
  },
  isUnlocked: {
    type: Boolean,
    default: false,
    index: true
  },
  unlockedAt: {
    type: Date,
    index: true
  },
  notified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Составной индекс для быстрого поиска достижений пользователя
userAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });
userAchievementSchema.index({ userId: 1, isUnlocked: 1 });
userAchievementSchema.index({ unlockedAt: -1 });

// Предварительная обработка перед сохранением
userAchievementSchema.pre('save', function(next) {
  // Если прогресс достиг 100% и достижение еще не разблокировано
  if (this.progress >= 100 && !this.isUnlocked) {
    this.isUnlocked = true;
    this.unlockedAt = new Date();
    this.notified = false; // Помечаем для отправки уведомления
  }
  
  next();
});

// Статический метод для разблокировки достижения
userAchievementSchema.statics.unlockAchievement = async function(userId, achievementId) {
  const userAchievement = await this.findOne({ userId, achievementId });
  
  if (!userAchievement) {
    throw new Error('Достижение пользователя не найдено');
  }
  
  if (!userAchievement.isUnlocked) {
    userAchievement.progress = 100;
    userAchievement.isUnlocked = true;
    userAchievement.unlockedAt = new Date();
    userAchievement.notified = false;
    await userAchievement.save();
  }
  
  return userAchievement;
};

// Статический метод для получения прогресса пользователя
userAchievementSchema.statics.getUserProgress = async function(userId) {
  const achievements = await this.aggregate([
    {
      $match: { userId: new mongoose.Types.ObjectId(userId) }
    },
    {
      $lookup: {
        from: 'achievements',
        localField: 'achievementId',
        foreignField: '_id',
        as: 'achievement'
      }
    },
    {
      $unwind: '$achievement'
    },
    {
      $group: {
        _id: null,
        totalPoints: { $sum: { $cond: [{ $eq: ['$isUnlocked', true] }, '$achievement.points', 0] } },
        unlockedCount: { $sum: { $cond: [{ $eq: ['$isUnlocked', true] }, 1, 0] } },
        totalCount: { $sum: 1 },
        byCategory: {
          $push: {
            category: '$achievement.category',
            unlocked: '$isUnlocked',
            points: '$achievement.points'
          }
        },
        byDifficulty: {
          $push: {
            difficulty: '$achievement.difficulty',
            unlocked: '$isUnlocked'
          }
        }
      }
    },
    {
      $project: {
        totalPoints: 1,
        unlockedCount: 1,
        totalCount: 1,
        progress: {
          $cond: [
            { $eq: ['$totalCount', 0] },
            0,
            { $multiply: [{ $divide: ['$unlockedCount', '$totalCount'] }, 100] }
          ]
        },
        byCategory: {
          $map: {
            input: ['study', 'group', 'flashcard', 'note', 'social', 'system'],
            as: 'category',
            in: {
              category: '$$category',
              unlocked: {
                $size: {
                  $filter: {
                    input: '$byCategory',
                    as: 'item',
                    cond: {
                      $and: [
                        { $eq: ['$$item.category', '$$category'] },
                        { $eq: ['$$item.unlocked', true] }
                      ]
                    }
                  }
                }
              },
              total: {
                $size: {
                  $filter: {
                    input: '$byCategory',
                    as: 'item',
                    cond: { $eq: ['$$item.category', '$$category'] }
                  }
                }
              },
              points: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: '$byCategory',
                        as: 'item',
                        cond: {
                          $and: [
                            { $eq: ['$$item.category', '$$category'] },
                            { $eq: ['$$item.unlocked', true] }
                          ]
                        }
                      }
                    },
                    as: 'item',
                    in: '$$item.points'
                  }
                }
              }
            }
          }
        },
        byDifficulty: {
          $map: {
            input: ['bronze', 'silver', 'gold', 'platinum'],
            as: 'difficulty',
            in: {
              difficulty: '$$difficulty',
              unlocked: {
                $size: {
                  $filter: {
                    input: '$byDifficulty',
                    as: 'item',
                    cond: {
                      $and: [
                        { $eq: ['$$item.difficulty', '$$difficulty'] },
                        { $eq: ['$$item.unlocked', true] }
                      ]
                    }
                  }
                }
              },
              total: {
                $size: {
                  $filter: {
                    input: '$byDifficulty',
                    as: 'item',
                    cond: { $eq: ['$$item.difficulty', '$$difficulty'] }
                  }
                }
              }
            }
          }
        }
      }
    }
  ]);
  
  return achievements[0] || {
    totalPoints: 0,
    unlockedCount: 0,
    totalCount: 0,
    progress: 0,
    byCategory: [],
    byDifficulty: []
  };
};

module.exports = mongoose.model('UserAchievement', userAchievementSchema);