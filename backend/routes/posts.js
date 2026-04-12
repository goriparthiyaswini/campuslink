const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// Get all posts (feed)
router.get('/', protect, async (req, res) => {
  try {
    const { type, college } = req.query;
    let query = {};
    if (type) query.type = type;
    if (college) query.college = new RegExp(college, 'i');
    const posts = await Post.find(query)
      .populate('author', 'name college avatar')
      .populate('comments.author', 'name college avatar')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create post
router.post('/', protect, async (req, res) => {
  try {
    const { content, tags, type, media, poll, link } = req.body;

    const postData = {
      author: req.user._id,
      content: content || '📎 Shared a file',
      tags: tags || [],
      type: type || 'post',
      college: req.user.college
    };

    // Save media if present
    if (media && media.url) {
      postData.media = {
        url: media.url,
        type: media.type,
        filename: media.filename || 'file',
        mimetype: media.mimetype || ''
      };
    }

    // Save poll if present
    if (poll && poll.options && poll.options.length >= 2) {
      postData.poll = {
        question: poll.question || content,
        options: poll.options.map(o => ({
          text: typeof o === 'string' ? o : o.text,
          votes: 0,
          voters: []
        }))
      };
    }

    // Save link if present
    if (link) postData.link = link;

    const post = await Post.create(postData);
    await post.populate('author', 'name college avatar');

    // Award points
    await User.findByIdAndUpdate(req.user._id, { $inc: { points: 5 } });

    res.status(201).json(post);
  } catch (err) {
    console.error('Post create error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// Like/Unlike post
router.post('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const liked = post.likes.includes(req.user._id);
    if (liked) {
      post.likes = post.likes.filter(l => l.toString() !== req.user._id.toString());
    } else {
      post.likes.push(req.user._id);
      if (post.author.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: post.author,
          sender: req.user._id,
          type: 'like',
          message: `${req.user.name} liked your post`,
          link: `/post/${post._id}`
        });
        await User.findByIdAndUpdate(post.author, { $inc: { points: 2 } });
      }
    }
    await post.save();
    res.json({ likes: post.likes.length, liked: !liked });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Comment on post
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    post.comments.push({ author: req.user._id, content: req.body.content });
    await post.save();
    await post.populate('comments.author', 'name college avatar');
    if (post.author.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: post.author,
        sender: req.user._id,
        type: 'comment',
        message: `${req.user.name} commented on your post`,
        link: `/post/${post._id}`
      });
      await User.findByIdAndUpdate(post.author, { $inc: { points: 1 } });
    }
    res.json(post.comments[post.comments.length - 1]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete post
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;