// server/models/Group.js

const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Название группы обязательно'],
    trim: true,
    minlength: [3, 'Название должно быть не менее 3 символов'],
    maxlength: [50, 'Название не должно превышать 50 символов']
  },
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: [500, 'Описание не должно превышать 500 символов']
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: [true, 'ID предмета обязателен'],
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'ID создателя обязателен'],
    index: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'ID пользователя обязательно']
    },
    role: {
      type: String,
      enum: {
        values: ['owner', 'admin', 'member'],
        message: 'Роль должна быть: owner, admin или member'
      },
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  inviteCode: {
    type: String,
    unique: true,
    uppercase: true,
    minlength: [6, 'Код приглашения должен быть не менее 6 символов'],
    maxlength: [10, 'Код приглашения не должен превышать 10 символов']
  },
  settings: {
    allowMemberInvites: { type: Boolean, default: true },
    allowMemberCreateCards: { type: Boolean, default: true },
    allowMemberCreateNotes: { type: Boolean, default: true },
    allowMemberDeleteContent: { type: Boolean, default: false },
    requireApprovalToJoin: { type: Boolean, default: false },
    maxMembers: { type: Number, default: 50, min: [2, 'Максимальное количество участников должно быть не менее 2'], max: [1000, 'Максимальное количество участников не должно превышать 1000'] }
  },
  bannerUrl: {
    type: String,
    default: '',
    validate: {
      validator: function(v) { if (!v) return true; return /^https?:\/\/.+/.test(v); },
      message: 'Некорректный URL баннера'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Виртуальное поле для количества участников
groupSchema.virtual('memberCount').get(function() {
  return this.members ? this.members.length : 0;
});

// Виртуальное поле для проверки, является ли пользователь владельцем
groupSchema.virtual('isOwner').get(function() {
  return (userId) => {
    const member = this.members ? this.members.find(m => m.user.toString() === userId) : null;
    return member && member.role === 'owner';
  };
});

// Виртуальное поле для проверки, является ли пользователь администратором
groupSchema.virtual('isAdmin').get(function() {
  return (userId) => {
    const member = this.members ? this.members.find(m => m.user.toString() === userId) : null;
    return member && (member.role === 'owner' || member.role === 'admin');
  };
});

// Предварительная валидация перед сохранением
groupSchema.pre('save', function(next) {
  if (this.name) this.name = this.name.trim();
  if (this.description) this.description = this.description.trim();
  if (!this.inviteCode) this.inviteCode = this.generateInviteCode();
  if (this.members && this.members.length > this.settings.maxMembers) {
    return next(new Error(`Превышено максимальное количество участников (${this.settings.maxMembers})`));
  }
  if (this.members && this.members.length > 0) {
    const hasOwner = this.members.some(member => member.role === 'owner');
    if (!hasOwner) this.members[0].role = 'owner';
  }
  next();
});

groupSchema.methods.generateInviteCode = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
};

groupSchema.methods.addMember = function(userId, role = 'member') {
  if (!this.members) this.members = [];
  const isAlreadyMember = this.members.some(member => member.user.toString() === userId.toString());
  if (isAlreadyMember) throw new Error('Пользователь уже является участником группы');
  if (this.members.length >= this.settings.maxMembers) throw new Error(`Достигнуто максимальное количество участников (${this.settings.maxMembers})`);
  this.members.push({ user: userId, role, joinedAt: new Date() });
  return this.save();
};

groupSchema.methods.removeMember = function(userId) {
  if (!this.members) return this.save();
  const initialLength = this.members.length;
  this.members = this.members.filter(member => member.user.toString() !== userId.toString());
  if (this.members.length === initialLength) throw new Error('Пользователь не найден в группе');
  const hasOwner = this.members.some(member => member.role === 'owner');
  if (!hasOwner && this.members.length > 0) this.members[0].role = 'owner';
  return this.save();
};

groupSchema.methods.changeMemberRole = function(userId, newRole) {
  if (!this.members) throw new Error('Пользователь не найден в группе');
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (!member) throw new Error('Пользователь не найден в группе');
  member.role = newRole;
  return this.save();
};

groupSchema.methods.hasPermission = function(userId, permission) {
  if (!this.members) return false;
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (!member) return false;
  switch (permission) {
    case 'create_cards': return this.settings.allowMemberCreateCards || member.role !== 'member';
    case 'create_notes': return this.settings.allowMemberCreateNotes || member.role !== 'member';
    case 'delete_content': return this.settings.allowMemberDeleteContent || member.role !== 'member';
    case 'invite_members': return this.settings.allowMemberInvites || member.role !== 'member';
    case 'manage_group': return member.role === 'owner' || member.role === 'admin';
    default: return false;
  }
};

// Индексы
groupSchema.index({ createdBy: 1, createdAt: -1 });
groupSchema.index({ subjectId: 1, isPublic: 1, createdAt: -1 });
groupSchema.index({ 'members.user': 1, createdAt: -1 });
groupSchema.index({ isPublic: 1, memberCount: -1 });
groupSchema.index({ name: 'text', description: 'text' });
groupSchema.index({ inviteCode: 1 }, { unique: true });
groupSchema.index({ createdAt: -1 });
groupSchema.index({ updatedAt: -1 });
groupSchema.index({ isActive: 1 });

module.exports = mongoose.model('Group', groupSchema);