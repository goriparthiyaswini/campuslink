const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  college: { type: String, required: true },
  skills: [String],
  interests: [String],
  bio: { type: String, default: '' },
  avatar: { type: String, default: '' },
  year: { type: String, default: '' },
  branch: { type: String, default: '' },
  points: { type: Number, default: 0 },
  badges: [String],
  connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  connectionRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now }
}, { timestamps: true });

// ✅ FIXED: Don't mix async + next in Mongoose 7+
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);