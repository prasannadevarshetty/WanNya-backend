const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getTranslations } = require('../utils/translate');

// Protect routes - require authentication
const authenticate = async (req, res, next) => {
  const lang = req.query.lang || 'en';
  const translations = getTranslations(lang);

  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        message: translations.accessDeniedNoToken,
        key: 'accessDeniedNoToken'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        message: translations.invalidTokenUserNotFound,
        key: 'invalidTokenUserNotFound'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: translations.invalidToken,
        key: 'invalidToken'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: translations.tokenExpired,
        key: 'tokenExpired'
      });
    }

    res.status(500).json({
      message: translations.serverErrorDuringAuthentication,
      key: 'serverErrorDuringAuthentication'
    });
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Check if user is verified
const requireEmailVerification = (req, res, next) => {
  const lang = req.query.lang || 'en';
  const translations = getTranslations(lang);

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      message: translations.emailVerificationRequired,
      key: 'emailVerificationRequired'
    });
  }

  next();
};

module.exports = {
  authenticate,
  optionalAuth,
  requireEmailVerification
};
