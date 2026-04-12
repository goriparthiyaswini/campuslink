const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const pollOptionSchema = new mongoose.Schema({
  text: String,
  votes: { type: Number, default: 0 },
  voters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  tags: [String],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
  type: { type: String, enum: ['post','question','project','event'], default: 'post' },
  college: { type: String },
  media: {
    url: String,
    type: { type: String, enum: ['image','video','audio','document'] },
    filename: String,
    mimetype: String
  },
  poll: {
    question: String,
    options: [pollOptionSchema]
  },
  link: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);