const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const LoginActivity = require('../models/LoginActivity');
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
const { getTranslations, translate } = require('../utils/translate');

console.log({
  validateOtpRequest,
  validateOtpVerify,
  validateResetPassword,
  validateUserLogin,
  validateUserRegistration,
  authenticate,
  catchAsync
});

const router = express.Router();

// RATE LIMITERS
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  skip: (req) => req.method === 'OPTIONS',
  handler: (req, res) => {
    const lang = req.query.lang || 'en';
    const translations = getTranslations(lang);
    res.status(429).json({
      message: translations.tooManyLoginAttempts || 'Too many login attempts. Please try again later.',
      key: 'tooManyLoginAttempts'
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  skip: (req) => req.method === 'OPTIONS',
  handler: (req, res) => {
    const lang = req.query.lang || 'en';
    const translations = getTranslations(lang);
    res.status(429).json({
      message: translations.tooManyPasswordResetRequests || 'Too many password reset requests. Please try again later.',
      key: 'tooManyPasswordResetRequests'
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  skip: (req) => req.method === 'OPTIONS',
  handler: (req, res) => {
    const lang = req.query.lang || 'en';
    const translations = getTranslations(lang);
    res.status(429).json({
      message: translations.tooManyVerificationAttempts || 'Too many verification attempts. Please try again later.',
      key: 'tooManyVerificationAttempts'
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  skip: (req) => req.method === 'OPTIONS',
  handler: (req, res) => {
    const lang = req.query.lang || 'en';
    const translations = getTranslations(lang);
    res.status(429).json({
      message: translations.tooManyAccountsCreated || 'Too many accounts created. Please try again later.',
      key: 'tooManyAccountsCreated'
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

// TOKEN
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// REGISTER
router.post('/register', registerLimiter, validateUserRegistration, catchAsync(async (req, res) => {
  const lang = req.query.lang || 'en';
  const translations = getTranslations(lang);

  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.status(400).json({
      message: translations.userAlreadyExists,
      key: 'userAlreadyExists'
    });
  }

  const user = new User({ name, email, password });
  await user.save();

  const token = generateToken(user._id);

  res.status(201).json({
    message: translations.userRegisteredSuccessfully,
    key: 'userRegisteredSuccessfully',
    token,
    user: user.toPublicJSON()
  });
}));

// LOGIN
router.post('/login', loginLimiter, validateUserLogin, catchAsync(async (req, res) => {
  const lang = req.query.lang || 'en';
  const translations = getTranslations(lang);

  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user || !user.password) {
    return res.status(401).json({
      message: translations.invalidEmailOrPassword,
      key: 'invalidEmailOrPassword'
    });
  }

  const isValid = await user.comparePassword(password);

  if (!isValid) {
    return res.status(401).json({
      message: translations.invalidEmailOrPassword,
      key: 'invalidEmailOrPassword'
    });
  }

  const token = generateToken(user._id);

  // SAVE LOGIN ACTIVITY
  await LoginActivity.create({
    user: user._id,
    loginTime: new Date(),
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    isActive: true
  });

  res.json({
    message: translations.loginSuccessful,
    key: 'loginSuccessful',
    token,
    user: user.toPublicJSON()
  });
}));

// FORGOT PASSWORD
router.post('/forgot-password', forgotPasswordLimiter, validateOtpRequest, catchAsync(async (req, res) => {
  const lang = req.query.lang || 'en';
  const translations = getTranslations(lang);

  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    logAuth('forgot_password_attempt', null, false, { email });

    return res.status(404).json({
      message: translations.userNotFound || 'User not found',
      key: 'userNotFound'
    });
  }

  // allow resend after 60 sec
  if (user.otpExpires && user.otpExpires > Date.now()) {
    const otpCreatedAt = user.otpExpires.getTime() - 5 * 60 * 1000;
    const resendAllowedAt = otpCreatedAt + 60 * 1000;

    if (Date.now() < resendAllowedAt) {
      const remainingSecs = Math.ceil((resendAllowedAt - Date.now()) / 1000);

      return res.status(429).json({
        message: translate(
          'waitBeforeNewOtp',
          { seconds: remainingSecs },
          translations
        ),
        key: 'waitBeforeNewOtp',
        remainingSeconds: remainingSecs
      });
    }
  }

  const otp = String(generateOTP()).trim();

  user.otp = otp;
  user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);

  await user.save();

  // Send email without blocking API response
  sendOtpEmail(email, otp).catch(async (err) => {
    console.error('OTP email failed:', err);

    try {
      await User.findByIdAndUpdate(user._id, {
        $unset: {
          otp: '',
          otpExpires: ''
        }
      });
    } catch (cleanupErr) {
      console.error('Failed to clear OTP after email failure:', cleanupErr);
    }
  });

  logAuth('forgot_password', user._id, true, { email });

  return res.json({
    message: translations.otpSentMessage,
    key: 'otpSentMessage'
  });
}));

// VERIFY OTP
router.post('/verify-otp', otpLimiter, validateOtpVerify, catchAsync(async (req, res) => {
  const lang = req.query.lang || 'en';
  const translations = getTranslations(lang);

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
    return res.status(400).json({
      message: translations.invalidOrExpiredOtp,
      key: 'invalidOrExpiredOtp'
    });
  }

  res.json({
    message: translations.otpVerified,
    key: 'otpVerified'
  });
}));

// RESET PASSWORD
router.post('/reset-password', otpLimiter, validateResetPassword, catchAsync(async (req, res) => {
  const lang = req.query.lang || 'en';
  const translations = getTranslations(lang);

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
    return res.status(400).json({
      message: translations.invalidOrExpiredOtp,
      key: 'invalidOrExpiredOtp'
    });
  }

  user.password = newPassword;
  user.otp = undefined;
  user.otpExpires = undefined;

  await user.save();

  res.json({
    message: translations.passwordResetSuccessful,
    key: 'passwordResetSuccessful'
  });
}));

// CURRENT USER
router.get('/me', authenticate, (req, res) => {
  res.json({
    user: req.user.toPublicJSON()
  });
});

// LOGOUT
router.post('/logout', authenticate, catchAsync(async (req, res) => {

  await LoginActivity.findOneAndUpdate(
    {
      user: req.user._id,
      isActive: true
    },
    {
      logoutTime: new Date(),
      isActive: false
    },
    {
      sort: { createdAt: -1 }
    }
  );

  res.json({
    message: 'Logout successful'
  });
}));

module.exports = router;
