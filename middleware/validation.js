const { body, validationResult } = require('express-validator');
const { getTranslations } = require('../utils/translate');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const lang = req.query.lang || 'en';
  const translations = getTranslations(lang);

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: translations.validationFailed,
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }

  next();
};

// Email normalization
const normalizeEmailOptions = {
  gmail_remove_dots: false
};

// User registration validation
const validateUserRegistration = [
  (req, res, next) => {
    req.translations = getTranslations(req.query.lang || 'en');
    next();
  },

  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage((value, { req }) => req.translations.nameLength),

  body('email')
    .isEmail()
    .normalizeEmail(normalizeEmailOptions)
    .withMessage((value, { req }) => req.translations.validEmailRequired),

  body('password')
    .if(body('password').exists())
    .isLength({ min: 6 })
    .withMessage((value, { req }) => req.translations.passwordMinLength)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage((value, { req }) => req.translations.passwordRequirements),

  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  (req, res, next) => {
    req.translations = getTranslations(req.query.lang || 'en');
    next();
  },

  body('email')
    .isEmail()
    .normalizeEmail(normalizeEmailOptions)
    .withMessage((value, { req }) => req.translations.validEmailRequired),

  body('password')
    .notEmpty()
    .withMessage((value, { req }) => req.translations.passwordRequired),

  handleValidationErrors
];

// OTP request validation
const validateOtpRequest = [
  (req, res, next) => {
    req.translations = getTranslations(req.query.lang || 'en');
    next();
  },

  body('email')
    .isEmail()
    .normalizeEmail(normalizeEmailOptions)
    .withMessage((value, { req }) => req.translations.validEmailRequired),

  handleValidationErrors
];

// OTP verify validation
const validateOtpVerify = [
  (req, res, next) => {
    req.translations = getTranslations(req.query.lang || 'en');
    next();
  },

  body('email')
    .isEmail()
    .normalizeEmail(normalizeEmailOptions)
    .withMessage((value, { req }) => req.translations.validEmailRequired),

  body('otp')
    .trim()
    .isLength({ min: 4, max: 10 })
    .isNumeric()
    .withMessage((value, { req }) => req.translations.otpNumeric),

  handleValidationErrors
];

// Reset password validation
const validateResetPassword = [
  (req, res, next) => {
    req.translations = getTranslations(req.query.lang || 'en');
    next();
  },

  body('email')
    .isEmail()
    .normalizeEmail(normalizeEmailOptions)
    .withMessage((value, { req }) => req.translations.validEmailRequired),

  body('otp')
    .trim()
    .isLength({ min: 4, max: 10 })
    .isNumeric()
    .withMessage((value, { req }) => req.translations.otpNumeric),

  body('newPassword')
    .isLength({ min: 6 })
    .withMessage((value, { req }) => req.translations.newPasswordMinLength),

  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateOtpRequest,
  validateOtpVerify,
  validateResetPassword,
  handleValidationErrors
};
