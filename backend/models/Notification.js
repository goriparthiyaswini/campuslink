const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['like', 'comment', 'connection', 'message', 'reply'], required: true },
  message: String,
  read: { type: Boolean, default: false },
  link: String
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);