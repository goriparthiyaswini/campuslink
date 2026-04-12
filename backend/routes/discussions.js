const express = require('express');
const router = express.Router();
const Discussion = require('../models/Discussion');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Get all discussions
router.get('/', protect, async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};
    if (category && category !== 'All') query.category = category;
    if (search) query.$or = [
      { title: new RegExp(search, 'i') },
      { content: new RegExp(search, 'i') }
    ];
    const discussions = await Discussion.find(query)
      .populate('author', 'name college avatar')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(discussions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single discussion
router.get('/:id', protect, async (req, res) => {
  try {
    const disc = await Discussion.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate('author', 'name college avatar')
      .populate('replies.author', 'name college avatar');
    if (!disc) return res.status(404).json({ message: 'Discussion not found' });
    res.json(disc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create discussion
router.post('/', protect, async (req, res) => {
  try {
    const { title, content, category, tags } = req.body;
    const disc = await Discussion.create({
      title, content,
      author: req.user._id,
      category: category || 'General',
      tags: tags || []
    });
    await disc.populate('author', 'name college avatar');
    await User.findByIdAndUpdate(req.user._id, { $inc: { points: 10 } });
    res.status(201).json(disc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reply to discussion
router.post('/:id/reply', protect, async (req, res) => {
  try {
    const disc = await Discussion.findById(req.params.id);
    if (!disc) return res.status(404).json({ message: 'Discussion not found' });
    disc.replies.push({ author: req.user._id, content: req.body.content });
    await disc.save();
    await disc.populate('replies.author', 'name college avatar');
    await User.findByIdAndUpdate(req.user._id, { $inc: { points: 5 } });
    res.json(disc.replies[disc.replies.length - 1]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark as solved
router.patch('/:id/solve', protect, async (req, res) => {
  try {
    const disc = await Discussion.findById(req.params.id);
    if (!disc) return res.status(404).json({ message: 'Not found' });
    if (disc.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only author can mark as solved' });
    }
    disc.isSolved = !disc.isSolved;
    await disc.save();
    res.json({ isSolved: disc.isSolved });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
