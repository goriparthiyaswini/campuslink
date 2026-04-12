const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// Get all users (with filters)
router.get('/', protect, async (req, res) => {
  try {
    const { college, skill, search } = req.query;
    let query = { _id: { $ne: req.user._id } };
    if (college) query.college = new RegExp(college, 'i');
    if (skill) query.skills = { $in: [new RegExp(skill, 'i')] };
    if (search) query.$or = [
      { name: new RegExp(search, 'i') },
      { college: new RegExp(search, 'i') },
      { branch: new RegExp(search, 'i') }
    ];
    const users = await User.find(query).select('-password').limit(50);
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ FIXED: leaderboard ABOVE /:id (specific routes before dynamic params)
router.get('/leaderboard/top', protect, async (req, res) => {
  try {
    const users = await User.find().sort({ points: -1 }).limit(10).select('name college points badges avatar');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('connections', 'name college avatar');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, bio, college, year, branch, skills, interests } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, bio, college, year, branch, skills, interests },
      { new: true, runValidators: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send connection request
router.post('/:id/connect', protect, async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (target.connectionRequests.includes(req.user._id))
      return res.status(400).json({ message: 'Request already sent' });
    if (target.connections.includes(req.user._id))
      return res.status(400).json({ message: 'Already connected' });
    target.connectionRequests.push(req.user._id);
    await target.save();
    await Notification.create({
      recipient: target._id,
      sender: req.user._id,
      type: 'connection',
      message: `${req.user.name} sent you a connection request`,
      link: `/profile/${req.user._id}`
    });
    res.json({ message: 'Connection request sent' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Accept connection request
router.post('/:id/accept', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id);
    const other = await User.findById(req.params.id);
    if (!me.connectionRequests.includes(req.params.id))
      return res.status(400).json({ message: 'No pending request from this user' });
    me.connectionRequests = me.connectionRequests.filter(r => r.toString() !== req.params.id);
    me.connections.push(req.params.id);
    other.connections.push(req.user._id);
    await me.save();
    await other.save();
    await Notification.create({
      recipient: other._id,
      sender: req.user._id,
      type: 'connection',
      message: `${req.user.name} accepted your connection request`,
      link: `/profile/${req.user._id}`
    });
    res.json({ message: 'Connection accepted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;