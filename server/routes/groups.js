const express = require('express');
const Group = require('../models/Group');
const GroupInvite = require('../models/GroupInvite');
const Flashcard = require('../models/Flashcard');
const Note = require('../models/Note');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { name, description, subjectId, isPublic, settings } = req.body;

    const group = new Group({
      name,
      description,
      subjectId,
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
    
    const populatedGroup = await Group.findById(group._id)
      .populate('createdBy', 'name email')
      .populate('members.user', 'name email')
      .populate('subjectId', 'name');

    res.status(201).json({
      success: true,
      group: populatedGroup
    });
  } catch (error) {
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
      groups
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
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
    
    const populatedGroup = await Group.findById(group._id)
      .populate('createdBy', 'name email')
      .populate('members.user', 'name email')
      .populate('subjectId', 'name');

    res.json({
      success: true,
      group: populatedGroup
    });
  } catch (error) {
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
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/join/:inviteCode', auth, async (req, res) => {
  try {
    const group = await Group.findOne({ inviteCode: req.params.inviteCode });

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Invalid invite code'
      });
    }

    const isAlreadyMember = group.members.some(member => 
      member.user.toString() === req.user.id
    );

    if (isAlreadyMember) {
      return res.status(400).json({
        success: false,
        error: 'You are already a member of this group'
      });
    }

    group.members.push({
      user: req.user.id,
      role: 'member',
      joinedAt: new Date()
    });

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate('createdBy', 'name email')
      .populate('members.user', 'name email')
      .populate('subjectId', 'name color');

    res.json({
      success: true,
      message: 'Successfully joined the group',
      group: populatedGroup
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;