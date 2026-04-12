const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// ✅ FIXED: '/' ABOVE '/:userId' (specific routes before dynamic params)
// Get all conversations for current user
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const messages = await Message.find({
      roomId: new RegExp(userId)
    }).sort({ timestamp: -1 });

    const roomMap = new Map();
    for (const msg of messages) {
      if (!roomMap.has(msg.roomId)) {
        roomMap.set(msg.roomId, msg);
      }
    }
    res.json(Array.from(roomMap.values()));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get chat history between two users
router.get('/:userId', protect, async (req, res) => {
  try {
    const roomId = [req.user._id.toString(), req.params.userId].sort().join('_');
    const messages = await Message.find({ roomId })
      .populate('sender', 'name college avatar')
      .sort({ timestamp: 1 })
      .limit(100);
    res.json({ roomId, messages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;