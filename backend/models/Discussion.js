const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  votes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const discussionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, default: 'General' },
  tags: [String],
  replies: [replySchema],
  views: { type: Number, default: 0 },
  votes: { type: Number, default: 0 },
  isSolved: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Discussion', discussionSchema);