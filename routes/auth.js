const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { sendOtpEmail } = require('../utils/emailService');
const { catchAsync } = require('../middleware/errorHandler');
const { logAuth } = require('../utils/logger');
const { generateOTP } = require('../utils/otpGenerator');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// ======================
// REGISTER
// ======================
router.post('/register', validateUserRegistration, catchAsync(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const user = new User({ name, email, password });
  await user.save();

  const token = generateToken(user._id);

  res.status(201).json({
    message: 'User registered successfully',
    token,
    user: user.toPublicJSON()
  });
}));

// ======================
// LOGIN
// ======================
router.post('/login', validateUserLogin, catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const isValid = await user.comparePassword(password);
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const token = generateToken(user._id);

  res.json({
    message: 'Login successful',
    token,
    user: user.toPublicJSON()
  });
}));

// ======================
// FORGOT PASSWORD (OTP)
// ======================
router.post('/forgot-password', catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    logAuth('forgot_password_attempt', null, false, { email });
    return res.status(404).json({ message: 'No account found with this email' });
  }

  const otp = generateOTP();

  user.otp = otp;
  user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
  await user.save();

  // ✅ SEND EMAIL (awaited)
  const sent = await sendOtpEmail(email, otp);

  if (!sent) {
    return res.status(500).json({
      message: 'Failed to send OTP email'
    });
  }

  logAuth('forgot_password', user._id, true, { email });

  res.json({
    message: 'OTP sent to your email'
  });
}));

// ======================
// VERIFY OTP
// ======================
router.post('/verify-otp', catchAsync(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });

  if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  res.json({ message: 'OTP verified' });
}));

// ======================
// RESET PASSWORD
// ======================
router.post('/reset-password', catchAsync(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({ email });

  if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  user.password = newPassword;
  user.otp = undefined;
  user.otpExpires = undefined;

  await user.save();

  res.json({ message: 'Password reset successful' });
}));

// ======================
// CURRENT USER
// ======================
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
});

module.exports = router;
