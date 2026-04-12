const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');

// Create uploads folders
const dirs = ['uploads/images','uploads/videos','uploads/audio','uploads/documents','uploads/avatars'];
dirs.forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const mime = file.mimetype;
    if (mime.startsWith('image/')) cb(null, 'uploads/images');
    else if (mime.startsWith('video/')) cb(null, 'uploads/videos');
    else if (mime.startsWith('audio/')) cb(null, 'uploads/audio');
    else cb(null, 'uploads/documents');
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random()*1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg','image/png','image/gif','image/webp',
    'video/mp4','video/webm',
    'audio/mpeg','audio/wav','audio/ogg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('File type not allowed'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

// Upload single file
router.post('/single', protect, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const url = `http://localhost:5000/uploads/${req.file.destination.split('/')[1]}/${req.file.filename}`;
  res.json({
    url,
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
});

// Upload avatar
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/avatars'),
  filename: (req, file, cb) => cb(null, req.user._id + path.extname(file.originalname))
});
const avatarUpload = multer({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/avatar', protect, avatarUpload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const url = `http://localhost:5000/uploads/avatars/${req.file.filename}`;
  const User = require('../models/User');
  await User.findByIdAndUpdate(req.user._id, { avatar: url });
  res.json({ url });
});

module.exports = router;