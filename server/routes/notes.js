// server/routes/notes.js

const { body, param, query } = require('express-validator');
const express = require('express');
const mongoose = require('mongoose');
const Note = require('../models/Note');
const { auth } = require('../middleware/auth');
const { 
  noteValidation, 
  idValidation, 
  subjectIdValidation,
  sanitizeInput 
} = require('../middleware/validation');
const { AppError, catchAsync } = require('../middleware/errorHandler');

const router = express.Router();

// Получение заметок по предмету
router.get('/subject/:subjectId',
  auth,
  subjectIdValidation,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sort').optional().isIn(['createdAt', 'updatedAt', 'title']),
    query('order').optional().isIn(['asc', 'desc']),
    query('tag').optional().trim().isLength({ max: 20 })
  ],
  catchAsync(async (req, res) => {
    const { page = 1, limit = 20, sort = 'updatedAt', order = 'desc', tag } = req.query;
    const skip = (page - 1) * limit;
    const sortOrder = order === 'asc' ? 1 : -1;

    const filter = {
      subjectId: req.params.subjectId,
      $or: [{ authorId: req.user.id }, { isPublic: true }]
    };
    if (tag) filter.tags = { $in: [tag] };

    const [notes, total] = await Promise.all([
      Note.find(filter)
        .populate('authorId', 'name email avatarUrl')
        .sort({ [sort]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v'),
      Note.countDocuments(filter)
    ]);

    res.json({
      success: true,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
      count: notes.length,
      notes: notes.map(note => ({
        _id: note._id,
        title: note.title,
        content: note.content,
        tags: note.tags,
        authorId: { _id: note.authorId._id, name: note.authorId.name, email: note.authorId.email, avatarUrl: note.authorId.avatarUrl },
        subjectId: note.subjectId,
        groupId: note.groupId,
        isPublic: note.isPublic,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt
      }))
    });
  })
);

// Получение заметок текущего пользователя
router.get('/my',
  auth,
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 50 })],
  catchAsync(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [notes, total] = await Promise.all([
      Note.find({ authorId: req.user.id })
        .populate('subjectId', 'name color')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v'),
      Note.countDocuments({ authorId: req.user.id })
    ]);

    res.json({
      success: true,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
      count: notes.length,
      notes: notes.map(note => ({
        _id: note._id,
        title: note.title,
        content: note.content,
        tags: note.tags,
        subjectId: note.subjectId ? { _id: note.subjectId._id, name: note.subjectId.name, color: note.subjectId.color } : null,
        groupId: note.groupId,
        isPublic: note.isPublic,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt
      }))
    });
  })
);

// Создание заметки
router.post('/',
  auth,
  sanitizeInput,
  catchAsync(async (req, res) => {
    const { title, content, subjectId, tags, isPublic, groupId } = req.body;

    if (!title || !title.trim()) throw new AppError('Заголовок обязателен', 400);
    if (!content || !content.trim()) throw new AppError('Содержание обязательно', 400);
    if (!subjectId) throw new AppError('ID предмета обязателен', 400);

    const Subject = require('../models/Subject');
    const subject = await Subject.findById(subjectId);
    if (!subject) throw new AppError('Предмет не найден', 404);

    if (groupId) {
      const Group = require('../models/Group');
      const group = await Group.findOne({ _id: groupId, 'members.user': req.user.id });
      if (!group) throw new AppError('Группа не найдена или доступ запрещен', 404);
    }

    const note = await Note.create({
      title: title.trim(),
      content: content.trim(),
      subjectId,
      authorId: req.user.id,
      groupId: groupId || null,
      tags: tags || [],
      isPublic: isPublic !== undefined ? isPublic : false
    });

    const populatedNote = await Note.findById(note._id)
      .populate('authorId', 'name email avatarUrl')
      .select('-__v');

    res.status(201).json({
      success: true,
      message: 'Заметка успешно создана',
      note: {
        _id: populatedNote._id,
        title: populatedNote.title,
        content: populatedNote.content,
        tags: populatedNote.tags,
        authorId: { _id: populatedNote.authorId._id, name: populatedNote.authorId.name, email: populatedNote.authorId.email, avatarUrl: populatedNote.authorId.avatarUrl },
        subjectId: populatedNote.subjectId,
        groupId: populatedNote.groupId,
        isPublic: populatedNote.isPublic,
        createdAt: populatedNote.createdAt,
        updatedAt: populatedNote.updatedAt
      }
    });
  })
);

// Получение заметки по ID
router.get('/:id',
  auth,
  idValidation,
  catchAsync(async (req, res) => {
    const note = await Note.findOne({ _id: req.params.id, $or: [{ authorId: req.user.id }, { isPublic: true }] })
      .populate('authorId', 'name email avatarUrl')
      .populate('subjectId', 'name color')
      .select('-__v');
    if (!note) throw new AppError('Заметка не найдена или доступ запрещен', 404);

    res.json({
      success: true,
      note: {
        _id: note._id,
        title: note.title,
        content: note.content,
        tags: note.tags,
        authorId: { _id: note.authorId._id, name: note.authorId.name, email: note.authorId.email, avatarUrl: note.authorId.avatarUrl },
        subjectId: note.subjectId ? { _id: note.subjectId._id, name: note.subjectId.name, color: note.subjectId.color } : null,
        groupId: note.groupId,
        isPublic: note.isPublic,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt
      }
    });
  })
);

// Обновление заметки
router.put('/:id',
  auth,
  idValidation,
  sanitizeInput,
  [
    body('title').optional().trim().isLength({ min: 3, max: 100 }).withMessage('Заголовок должен быть от 3 до 100 символов'),
    body('content').optional().trim().isLength({ min: 10, max: 10000 }).withMessage('Содержание должно быть от 10 до 10000 символов'),
    body('tags').optional().isArray().withMessage('Теги должны быть массивом'),
    body('tags.*').optional().isString().trim().isLength({ max: 20 }).withMessage('Тег не должен превышать 20 символов'),
    body('isPublic').optional().isBoolean().withMessage('Публичность должна быть true или false')
  ],
  catchAsync(async (req, res) => {
    const { title, content, tags, isPublic } = req.body;

    const note = await Note.findById(req.params.id);
    if (!note) throw new AppError('Заметка не найдена', 404);

    if (title !== undefined) note.title = title.trim();
    if (content !== undefined) note.content = content.trim();
    if (tags !== undefined) note.tags = tags;
    if (isPublic !== undefined) note.isPublic = isPublic;
    await note.save();

    const updatedNote = await Note.findById(note._id)
      .populate('authorId', 'name email avatarUrl')
      .populate('subjectId', 'name color')
      .select('-__v');

    res.json({
      success: true,
      message: 'Заметка успешно обновлена',
      note: {
        _id: updatedNote._id,
        title: updatedNote.title,
        content: updatedNote.content,
        tags: updatedNote.tags,
        authorId: { _id: updatedNote.authorId._id, name: updatedNote.authorId.name, email: updatedNote.authorId.email, avatarUrl: updatedNote.authorId.avatarUrl },
        subjectId: updatedNote.subjectId ? { _id: updatedNote.subjectId._id, name: updatedNote.subjectId.name, color: updatedNote.subjectId.color } : null,
        groupId: updatedNote.groupId,
        isPublic: updatedNote.isPublic,
        updatedAt: updatedNote.updatedAt
      }
    });
  })
);

// Удаление заметки
router.delete('/:id',
  auth,
  idValidation,
  catchAsync(async (req, res) => {
    const note = await Note.findByIdAndDelete(req.params.id);
    if (!note) throw new AppError('Заметка не найдена', 404);
    res.json({ success: true, message: 'Заметка успешно удалена' });
  })
);

// Поиск заметок
router.get('/search',
  auth,
  [
    query('q').trim().notEmpty().isLength({ min: 2 }),
    query('subjectId').optional().isMongoId(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  catchAsync(async (req, res) => {
    const { q: searchQuery, subjectId, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {
      $or: [{ authorId: req.user.id }, { isPublic: true }],
      $and: [{
        $or: [
          { title: { $regex: searchQuery, $options: 'i' } },
          { content: { $regex: searchQuery, $options: 'i' } },
          { tags: { $in: [new RegExp(searchQuery, 'i')] } }
        ]
      }]
    };
    if (subjectId) filter.subjectId = subjectId;

    const [notes, total] = await Promise.all([
      Note.find(filter)
        .populate('authorId', 'name email')
        .populate('subjectId', 'name color')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v'),
      Note.countDocuments(filter)
    ]);

    res.json({
      success: true,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
      count: notes.length,
      notes: notes.map(note => ({
        _id: note._id,
        title: note.title,
        content: note.content.substring(0, 200) + (note.content.length > 200 ? '...' : ''),
        tags: note.tags,
        authorId: { _id: note.authorId._id, name: note.authorId.name },
        subjectId: note.subjectId ? { _id: note.subjectId._id, name: note.subjectId.name, color: note.subjectId.color } : null,
        updatedAt: note.updatedAt
      }))
    });
  })
);

// Статистика заметок
router.get('/stats/overview',
  auth,
  catchAsync(async (req, res) => {
    const stats = await Note.aggregate([
      { $match: { authorId: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $group: {
          _id: null,
          totalNotes: { $sum: 1 },
          totalSubjects: { $addToSet: "$subjectId" },
          totalTags: { $addToSet: "$tags" },
          lastCreated: { $max: "$createdAt" },
          lastUpdated: { $max: "$updatedAt" }
        }
      },
      {
        $project: {
          totalNotes: 1,
          totalSubjects: { $size: "$totalSubjects" },
          totalTags: { $size: { $reduce: { input: "$totalTags", initialValue: [], in: { $setUnion: ["$$value", "$$this"] } } } },
          lastCreated: 1,
          lastUpdated: 1
        }
      }
    ]);

    const result = stats[0] || { totalNotes: 0, totalSubjects: 0, totalTags: 0, lastCreated: null, lastUpdated: null };
    res.json({ success: true, stats: result });
  })
);

module.exports = router;