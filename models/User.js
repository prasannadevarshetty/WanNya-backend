const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId && !this.appleId; // Password not required for social auth
    },
    minlength: [6, 'Password must be at least 6 characters']
  },
  avatar: {
    type: String,
    default: ''
  },
  points: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  googleId: String,
  appleId: String,
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  // One-time password (OTP) for password reset flows
  otp: String,
  otpExpires: Date,
  lastLogin: Date,
  role: {
  type: String,
  enum: ['user', 'admin'],
  default: 'user'
},
isDeleted: {
  type: Boolean,
  default: false
},
deletedAt: {
  type: Date,
  default: null
},
deletedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  default: null
},
deleteReason: {
  type: String,
  default: ''
}
}, {
  timestamps: true
});

// Indexes for fast querying
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ appleId: 1 }, { sparse: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10); // Changed from 12 to 10 for performance
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get public user data (exclude sensitive info)
userSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    points: this.points,
    rating: this.rating,
    isEmailVerified: this.isEmailVerified,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
