const express = require('express');
const mongoose = require('mongoose');
const Group = require('../models/Group');
const GroupInvite = require('../models/GroupInvite');
const Flashcard = require('../models/Flashcard');
const Note = require('../models/Note');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { name, description, subjectId, isPublic, settings } = req.body;
    let validSubjectId = subjectId;
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      validSubjectId = new mongoose.Types.ObjectId(); // Fallback для demo
    }
    const group = new Group({
      name,
      description,
      subjectId: validSubjectId,
      isPublic: isPublic || false,
      settings: settings || {},
      createdBy: req.user.id,
      members: [{
        user: req.user.id,
        role: 'owner',
        joinedAt: new Date()
      }]
    });
    await group.save();
    let populatedGroup = group;
    try {
      populatedGroup = await Group.findById(group._id)
        .populate('createdBy', 'name email')
        .populate('members.user', 'name email')
        .populate('subjectId', 'name');
    } catch (populateError) {
      console.log('Populate failed in create, using basic group data');
      populatedGroup = group;
    }
    res.status(201).json({
      success: true,
      group: populatedGroup
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    const groups = await Group.find({
      'members.user': req.user.id
    })
    .populate('createdBy', 'name email')
    .populate('members.user', 'name email')
    .populate('subjectId', 'name color')
    .sort({ createdAt: -1 });
    res.json({
      success: true,
      groups: groups.length > 0 ? groups : []
    });
  } catch (error) {
    console.error('Get my groups error:', error);
    res.json({
      success: true,
      groups: []
    });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      'members.user': req.user.id
    })
    .populate('createdBy', 'name email')
    .populate('members.user', 'name email')
    .populate('subjectId', 'name color description');
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found or access denied'
      });
    }
    res.json({
      success: true,
      group
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      'members.user': req.user.id,
      'members.role': { $in: ['owner', 'admin'] }
    });
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found or insufficient permissions'
      });
    }
    const allowedUpdates = ['name', 'description', 'isPublic', 'settings'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        group[field] = req.body[field];
      }
    });
    await group.save();
    let populatedGroup = group;
    try {
      populatedGroup = await Group.findById(group._id)
        .populate('createdBy', 'name email')
        .populate('members.user', 'name email')
        .populate('subjectId', 'name');
    } catch (populateError) {
      console.log('Populate failed in update, using basic group data');
      populatedGroup = group;
    }
    res.json({
      success: true,
      group: populatedGroup
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:id/invite', auth, async (req, res) => {
  try {
    const { email } = req.body;
    const group = await Group.findOne({
      _id: req.params.id,
      'members.user': req.user.id,
      'members.role': { $in: ['owner', 'admin'] }
    });
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found or insufficient permissions'
      });
    }
    const invite = new GroupInvite({
      groupId: group._id,
      invitedBy: req.user.id,
      email: email,
      token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    });
    await invite.save();
    res.json({
      success: true,
      message: 'Invitation sent successfully',
      invite: {
        id: invite._id,
        email: invite.email,
        expiresAt: invite.expiresAt
      }
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/join/:inviteCode', auth, async (req, res) => {
  try {
    const group = await Group.findOne({ inviteCode: req.params.inviteCode.toUpperCase() });
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Группа с таким кодом не найдена'
      });
    }
    const isAlreadyMember = group.members.some(member =>
      member.user.toString() === req.user.id
    );
    if (isAlreadyMember) {
      return res.status(400).json({
        success: false,
        error: 'Вы уже состоите в этой группе'
      });
    }
    group.members.push({
      user: req.user.id,
      role: 'member',
      joinedAt: new Date()
    });
    await group.save();
    let populatedGroup = group;
    try {
      populatedGroup = await Group.findById(group._id)
        .populate('createdBy', 'name email')
        .populate('members.user', 'name email')
        .populate('subjectId', 'name color');
    } catch (populateError) {
      console.log('Populate failed in join, using basic group data');
      populatedGroup = group;
    }
    res.json({
      success: true,
      message: 'Вы успешно присоединились к группе!',
      group: populatedGroup
    });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Ошибка при присоединении к группе'
    });
  }
});

router.get('/:id/flashcards', auth, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      'members.user': req.user.id
    });
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found or access denied'
      });
    }
    const flashcards = await Flashcard.find({
      groupId: group._id
    })
    .populate('authorId', 'name email')
    .sort({ createdAt: -1 });
    res.json({
      success: true,
      flashcards
    });
  } catch (error) {
    console.error('Get group flashcards error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:id/flashcards', auth, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      'members.user': req.user.id
    });
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found or access denied'
      });
    }
    const { question, answer, difficulty, subjectId } = req.body;
    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        error: 'Question and answer are required'
      });
    }
    const flashcard = new Flashcard({
      question,
      answer,
      difficulty: difficulty || 'medium',
      subjectId: subjectId || group.subjectId,
      authorId: req.user.id,
      groupId: group._id
    });
    await flashcard.save();
    let populatedFlashcard = flashcard;
    try {
      populatedFlashcard = await Flashcard.findById(flashcard._id)
        .populate('authorId', 'name email');
    } catch (populateError) {
      console.log('Populate failed for flashcard');
      populatedFlashcard = flashcard;
    }
    res.status(201).json({
      success: true,
      flashcard: populatedFlashcard
    });
  } catch (error) {
    console.error('Create group flashcard error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/:id/notes', auth, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      'members.user': req.user.id
    });
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found or access denied'
      });
    }
    const notes = await Note.find({
      groupId: group._id
    })
    .populate('authorId', 'name email')
    .sort({ createdAt: -1 });
    res.json({
      success: true,
      notes
    });
  } catch (error) {
    console.error('Get group notes error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:id/notes', auth, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      'members.user': req.user.id
    });
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found or access denied'
      });
    }
    const { title, content, subjectId, tags } = req.body;
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required'
      });
    }
    const note = new Note({
      title,
      content,
      subjectId: subjectId || group.subjectId,
      authorId: req.user.id,
      groupId: group._id,
      tags: tags || [],
      isPublic: true
    });
    await note.save();
    let populatedNote = note;
    try {
      populatedNote = await Note.findById(note._id)
        .populate('authorId', 'name email');
    } catch (populateError) {
      console.log('Populate failed for note');
      populatedNote = note;
    }
    res.status(201).json({
      success: true,
      note: populatedNote
    });
  } catch (error) {
    console.error('Create group note error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Новый: PUT /:groupId/notes/:noteId (update заметки)
router.put('/:groupId/notes/:noteId', auth, async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required'
      });
    }
    const note = await Note.findOne({
      _id: req.params.noteId,
      groupId: req.params.groupId,
      authorId: req.user.id // Только автор может редактировать
    }).populate('authorId', 'name email');
    if (!note) {
      return res.status(404).json({
        success: false,
        error: 'Note not found or access denied'
      });
    }
    note.title = title;
    note.content = content;
    if (tags !== undefined) note.tags = tags;
    await note.save();
    res.json({
      success: true,
      note
    });
  } catch (error) {
    console.error('Update group note error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Новый: DELETE /:groupId/notes/:noteId (удаление заметки)
router.delete('/:groupId/notes/:noteId', auth, async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.noteId,
      groupId: req.params.groupId,
      authorId: req.user.id // Только автор может удалять
    });
    if (!note) {
      return res.status(404).json({
        success: false,
        error: 'Note not found or access denied'
      });
    }
    await note.deleteOne();
    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    console.error('Delete group note error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/:id/members', auth, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      'members.user': req.user.id
    }).populate('members.user', 'name email avatarUrl');
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found or access denied'
      });
    }
    const members = group.members.map(m => ({
      user: m.user,
      role: m.role,
      joinedAt: m.joinedAt
    }));
    res.json({
      success: true,
      members
    });
  } catch (error) {
    console.error('Get group members error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:id/add-member', auth, async (req, res) => {
  try {
    const { userId, role = 'member' } = req.body;
    const group = await Group.findOne({
      _id: req.params.id,
      'members.user': req.user.id,
      'members.role': { $in: ['owner', 'admin'] }
    });
    if (!group) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to add member'
      });
    }
    if (group.members.some(m => m.user.toString() === userId)) {
      return res.status(400).json({
        success: false,
        error: 'User is already a member'
      });
    }
    group.members.push({
      user: userId,
      role,
      joinedAt: new Date()
    });
    await group.save();
    let populatedGroup = group;
    try {
      populatedGroup = await Group.findById(group._id)
        .populate('members.user', 'name email');
    } catch (populateError) {
      console.log('Populate failed in add-member');
      populatedGroup = group;
    }
    res.json({
      success: true,
      group: populatedGroup,
      message: 'Member added successfully'
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;