const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'ID пользователя обязательно'],
    index: true
  },
  type: {
    type: String,
    required: [true, 'Тип уведомления обязательно'],
    enum: {
      values: [
        'group_invitation',
        'group_join',
        'flashcard_created',
        'note_created',
        'study_reminder',
        'achievement',
        'system',
        'friend_request',
        'friend_accept',
        'friend_request_accepted', // <-- добавлено
        'study_session_invite',
        'study_session_started'
      ],
      message: 'Недопустимый тип уведомления'
    }
  },
  title: {
    type: String,
    required: [true, 'Заголовок обязателен'],
    trim: true,
    maxlength: [200, 'Заголовок не должен превышать 200 символов']
  },
  message: {
    type: String,
    required: [true, 'Сообщение обязательно'],
    trim: true,
    maxlength: [500, 'Сообщение не должно превышать 500 символов']
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  expiresAt: {
    type: Date,
    index: true,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  }
}, {
  timestamps: true
});

notificationSchema.index({ userId: 1, isRead: 1, isArchived: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

notificationSchema.pre('save', function(next) {
  if (this.title) this.title = this.title.trim();
  if (this.message) this.message = this.message.trim();
  next();
});

notificationSchema.virtual('formattedDate').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const diffMinutes = Math.floor(diff / (1000 * 60));
  const diffHours = Math.floor(diff / (1000 * 60 * 60));
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Только что';
  if (diffMinutes < 60) return `${diffMinutes} мин. назад`;
  if (diffHours < 24) return `${diffHours} ч. назад`;
  if (diffDays < 7) return `${diffDays} дн. назад`;
  return this.createdAt.toLocaleDateString('ru-RU');
});

notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  return this.save();
};

notificationSchema.methods.archive = function() {
  this.isArchived = true;
  return this.save();
};

notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { userId, isRead: false, isArchived: false },
    { isRead: true }
  );
};

notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ userId, isRead: false, isArchived: false });
};

module.exports = mongoose.model('Notification', notificationSchema);