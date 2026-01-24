// server/models/StudySessionParticipant.js

const mongoose = require('mongoose');

const studySessionParticipantSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudySession',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stats: {
    timeSpent: {
      type: Number,
      default: 0
    },
    cardsReviewed: {
      type: Number,
      default: 0
    },
    correctAnswers: {
      type: Number,
      default: 0
    },
    streak: {
      type: Number,
      default: 0
    },
    totalPoints: {
      type: Number,
      default: 0
    }
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  leftAt: Date,
  status: {
    type: String,
    enum: ['active', 'away', 'left', 'kicked'],
    default: 'active'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

studySessionParticipantSchema.index({ session: 1, user: 1 }, { unique: true });
studySessionParticipantSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('StudySessionParticipant', studySessionParticipantSchema);