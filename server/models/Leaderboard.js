const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['global', 'weekly', 'monthly', 'subject', 'group'],
    required: [true, 'Тип лидерборда обязателен'],
    index: true
  },
  scopeId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
    sparse: true // Может быть null для глобальных лидербордов
  },
  scopeName: {
    type: String,
    default: ''
  },
  period: {
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true }
  },
  rankings: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rank: { type: Number, required: true },
    score: { type: Number, required: true },
    metric: {
      type: String,
      enum: ['experience', 'achievements', 'streak', 'flashcards', 'notes'],
      required: true
    },
    details: {
      name: String,
      avatarUrl: String,
      level: Number,
      additionalStats: mongoose.Schema.Types.Mixed
    },
    previousRank: { type: Number },
    rankChange: { type: Number }
  }],
  totalParticipants: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Составной индекс для быстрого поиска актуальных лидербордов
leaderboardSchema.index({ type: 1, scopeId: 1, 'period.endDate': -1, isActive: 1 });

// Виртуальное поле для пользователей
leaderboardSchema.virtual('users', {
  ref: 'User',
  localField: 'rankings.userId',
  foreignField: '_id',
  justOne: false
});

// Статический метод для обновления лидерборда
leaderboardSchema.statics.updateLeaderboard = async function(type, metric, scopeId = null, scopeName = '') {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  
  // Находим или создаем лидерборд
  let leaderboard = await this.findOne({
    type,
    scopeId,
    'period.endDate': { $gt: today },
    isActive: true
  });
  
  if (!leaderboard) {
    leaderboard = new this({
      type,
      scopeId,
      scopeName,
      period: {
        startDate: startOfWeek,
        endDate: endOfWeek
      },
      rankings: [],
      totalParticipants: 0
    });
  }
  
  let users = [];
  let rankings = [];
  
  // Получаем данные в зависимости от типа лидерборда и метрики
  switch (type) {
    case 'global':
      users = await this.getGlobalUsers(metric);
      break;
    case 'subject':
      users = await this.getSubjectUsers(metric, scopeId);
      break;
    case 'group':
      users = await this.getGroupUsers(metric, scopeId);
      break;
    case 'weekly':
      users = await this.getWeeklyUsers(metric);
      break;
    case 'monthly':
      users = await this.getMonthlyUsers(metric);
      break;
  }
  
  // Сортируем и ранжируем пользователей
  rankings = users.map((user, index) => ({
    userId: user._id || user.userId,
    rank: index + 1,
    score: user.score,
    metric,
    details: {
      name: user.name,
      avatarUrl: user.avatarUrl || '',
      level: user.level || 1,
      additionalStats: user.additionalStats || {}
    }
  }));
  
  // Сохраняем лидерборд
  leaderboard.rankings = rankings;
  leaderboard.totalParticipants = rankings.length;
  leaderboard.lastUpdated = new Date();
  await leaderboard.save();
  
  return leaderboard;
};

// Метод для получения глобальных пользователей
leaderboardSchema.statics.getGlobalUsers = async function(metric) {
  const User = require('./User');
  
  switch (metric) {
    case 'experience':
      return await User.find({ isActive: true })
        .select('_id name avatarUrl level experiencePoints')
        .sort({ experiencePoints: -1 })
        .limit(100);
    
    case 'level':
      return await User.find({ isActive: true })
        .select('_id name avatarUrl level experiencePoints')
        .sort({ level: -1, experiencePoints: -1 })
        .limit(100);
    
    case 'achievements':
      // Нужно агрегировать достижения
      const UserAchievement = require('./UserAchievement');
      const aggResult = await UserAchievement.aggregate([
        { $match: { isUnlocked: true } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 100 },
        { $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        { $project: {
            _id: '$_id',
            name: '$user.name',
            avatarUrl: '$user.avatarUrl',
            level: '$user.level',
            score: '$count'
          }
        }
      ]);
      return aggResult;
    
    case 'streak':
      return await User.find({ isActive: true, 'streaks.current': { $gt: 0 } })
        .select('_id name avatarUrl level streaks')
        .sort({ 'streaks.current': -1 })
        .limit(100)
        .then(users => users.map(user => ({
          _id: user._id,
          name: user.name,
          avatarUrl: user.avatarUrl,
          level: user.level,
          score: user.streaks.current
        })));
    
    default:
      return [];
  }
};

// Метод для получения пользователей по предмету
leaderboardSchema.statics.getSubjectUsers = async function(metric, subjectId) {
  // Здесь нужна логика для конкретного предмета
  // Пока вернем пустой массив
  return [];
};

// Метод для получения пользователей по группе
leaderboardSchema.statics.getGroupUsers = async function(metric, groupId) {
  const Group = require('./Group');
  const group = await Group.findById(groupId).populate('members.user');
  
  if (!group) return [];
  
  const userIds = group.members.map(member => member.user._id);
  const User = require('./User');
  
  switch (metric) {
    case 'experience':
      return await User.find({ _id: { $in: userIds }, isActive: true })
        .select('_id name avatarUrl level experiencePoints')
        .sort({ experiencePoints: -1 })
        .limit(50);
    
    default:
      return [];
  }
};

// Метод для получения еженедельных пользователей
leaderboardSchema.statics.getWeeklyUsers = async function(metric) {
  // Здесь нужна логика для еженедельного прогресса
  // Пока вернем пустой массив
  return [];
};

// Метод для получения ежемесячных пользователей
leaderboardSchema.statics.getMonthlyUsers = async function(metric) {
  // Здесь нужна логика для ежемесячного прогресса
  // Пока вернем пустой массив
  return [];
};

// Статический метод для получения лидерборда
leaderboardSchema.statics.getLeaderboard = async function(type, metric, scopeId = null, limit = 50) {
  const today = new Date();
  
  const leaderboard = await this.findOne({
    type,
    scopeId,
    'period.endDate': { $gt: today },
    isActive: true
  })
    .populate('rankings.userId', 'name avatarUrl level')
    .sort({ 'period.endDate': -1 })
    .limit(1);
  
  if (!leaderboard) {
    // Если нет активного лидерборда, создаем новый
    return await this.updateLeaderboard(type, metric, scopeId);
  }
  
  // Ограничиваем количество возвращаемых записей
  leaderboard.rankings = leaderboard.rankings.slice(0, limit);
  
  return leaderboard;
};

// Статический метод для получения позиции пользователя в лидерборде
leaderboardSchema.statics.getUserRank = async function(userId, type, metric, scopeId = null) {
  const leaderboard = await this.getLeaderboard(type, metric, scopeId);
  
  if (!leaderboard || !leaderboard.rankings) return null;
  
  const userRank = leaderboard.rankings.find(ranking => 
    ranking.userId.toString() === userId.toString()
  );
  
  return userRank ? {
    rank: userRank.rank,
    score: userRank.score,
    totalParticipants: leaderboard.totalParticipants,
    percentile: Math.round((userRank.rank / leaderboard.totalParticipants) * 100)
  } : null;
};

module.exports = mongoose.model('Leaderboard', leaderboardSchema);