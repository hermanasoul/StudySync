const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: 'blue-500'
  },
  icon: {
    type: String,
    default: '📚'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Subject', subjectSchema);