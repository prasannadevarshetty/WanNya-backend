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

    // Unexpected failures (e.g. database errors) are propagated so they are
    // logged and reported by the global error handler instead of being
    // flattened into an opaque 500 here.
    error.statusCode = error.statusCode || 500;
    error.key = error.key || 'serverErrorDuringAuthentication';
    next(error);
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
    // An invalid or expired token just means "not logged in" for optional auth,
    // but anything else (e.g. a database error) must not be swallowed.
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next();
    }

    next(error);
  }
};

// Check if user is verified
const requireEmailVerification = (req, res, next) => {
  const lang = req.query.lang || 'en';
  const translations = getTranslations(lang);

  if (!req.user) {
    return res.status(401).json({
      message: translations.accessDeniedNoToken,
      key: 'accessDeniedNoToken'
    });
  }

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
