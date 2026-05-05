const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const {
  validateUserRegistration,
  validateUserLogin,
  validateOtpRequest,
  validateOtpVerify,
  validateResetPassword
} = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { sendOtpEmail } = require('../utils/emailService');
const { catchAsync } = require('../middleware/errorHandler');
const { logAuth } = require('../utils/logger');
const { generateOTP } = require('../utils/otpGenerator');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  skip: (req) => req.method === 'OPTIONS',
  message: { message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  skip: (req) => req.method === 'OPTIONS',
  message: { message: 'Too many password reset requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  skip: (req) => req.method === 'OPTIONS',
  message: { message: 'Too many verification attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  skip: (req) => req.method === 'OPTIONS',
  message: { message: 'Too many accounts created. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

router.post('/register', registerLimiter, validateUserRegistration, catchAsync(async (req, res) => {
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

router.post('/login', loginLimiter, validateUserLogin, catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user || !user.password) {
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

router.post('/forgot-password', forgotPasswordLimiter, validateOtpRequest, catchAsync(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    logAuth('forgot_password_attempt', null, false, { email });
    return res.json({
      message: 'If an account with that email exists, an OTP has been sent.'
    });
  }

  if (user.otpExpires && user.otpExpires > Date.now()) {
    const otpCreatedAt = user.otpExpires.getTime() - 5 * 60 * 1000;
    const resendAllowedAt = otpCreatedAt + 60 * 1000;

    if (Date.now() < resendAllowedAt) {
      const remainingSecs = Math.ceil((resendAllowedAt - Date.now()) / 1000);

      return res.status(429).json({
        message: `Please wait ${remainingSecs} seconds before requesting a new OTP.`
      });
    }
  }

  const otp = String(generateOTP()).trim();

  user.otp = otp;
  user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
  await user.save();

  const sent = await sendOtpEmail(email, otp);

  if (!sent) {
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    return res.status(500).json({
      message: 'Failed to send OTP email. Please try again.'
    });
  }

  logAuth('forgot_password', user._id, true, { email });

  res.json({
    message: 'If an account with that email exists, an OTP has been sent.'
  });
}));

router.post('/verify-otp', otpLimiter, validateOtpVerify, catchAsync(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  const enteredOtp = String(otp).trim();

  const otpMatch =
    user &&
    user.otp &&
    String(user.otp).trim() === enteredOtp;

  const notExpired =
    user &&
    user.otpExpires &&
    user.otpExpires > Date.now();

  if (!otpMatch || !notExpired) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  res.json({ message: 'OTP verified' });
}));

router.post('/reset-password', otpLimiter, validateResetPassword, catchAsync(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({ email });
  const enteredOtp = String(otp).trim();

  const otpMatch =
    user &&
    user.otp &&
    String(user.otp).trim() === enteredOtp;

  const notExpired =
    user &&
    user.otpExpires &&
    user.otpExpires > Date.now();

  if (!otpMatch || !notExpired) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  user.password = newPassword;
  user.otp = undefined;
  user.otpExpires = undefined;

  await user.save();

  res.json({ message: 'Password reset successful' });
}));

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
});

module.exports = router;