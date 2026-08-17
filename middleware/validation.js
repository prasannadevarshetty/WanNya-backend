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
      key: 'validationFailed',
      errors: errors.array().map(error => {
        const msgKey = error.msg;
        const translatedMsg = translations[msgKey] || msgKey;
        return {
          field: error.path,
          message: translatedMsg,
          key: msgKey
        };
      })
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
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('nameLength'),

  body('email')
    .isEmail()
    .normalizeEmail(normalizeEmailOptions)
    .withMessage('validEmailRequired'),

  body('password')
    .if(body('password').exists())
    .isLength({ min: 6 })
    .withMessage('passwordMinLength')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('passwordRequirements'),

  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail(normalizeEmailOptions)
    .withMessage('validEmailRequired'),

  body('password')
    .notEmpty()
    .withMessage('passwordRequired'),

  handleValidationErrors
];

// OTP request validation
const validateOtpRequest = [
  body('email')
    .isEmail()
    .normalizeEmail(normalizeEmailOptions)
    .withMessage('validEmailRequired'),

  handleValidationErrors
];

// OTP verify validation
const validateOtpVerify = [
  body('email')
    .isEmail()
    .normalizeEmail(normalizeEmailOptions)
    .withMessage('validEmailRequired'),

  body('otp')
    .trim()
    .isLength({ min: 4, max: 10 })
    .withMessage('otpNumeric')
    .isNumeric()
    .withMessage('otpNumeric'),

  handleValidationErrors
];

// Reset password validation
const validateResetPassword = [
  body('email')
    .isEmail()
    .normalizeEmail(normalizeEmailOptions)
    .withMessage('validEmailRequired'),

  body('otp')
    .trim()
    .isLength({ min: 4, max: 10 })
    .withMessage('otpNumeric')
    .isNumeric()
    .withMessage('otpNumeric'),

  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('newPasswordMinLength'),

  handleValidationErrors
];

// Review validation
const validateReview = [
  body('productId')
    .notEmpty()
    .isMongoId()
    .withMessage('invalidInputData'),

  body('rating')
    .notEmpty()
    .isInt({ min: 1, max: 5 })
    .withMessage('invalidInputData'),

  body('comment')
    .trim()
    .isLength({ min: 2, max: 1000 })
    .withMessage('invalidInputData'),

  handleValidationErrors
];

// Pet creation validation
const validatePetCreation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('invalidInputData'),

  body('breed')
    .trim()
    .notEmpty()
    .withMessage('invalidInputData'),

  body('type')
    .trim()
    .isIn(['dog', 'cat'])
    .withMessage('invalidInputData'),

  body('dob')
    .notEmpty()
    .withMessage('invalidInputData'),

  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateOtpRequest,
  validateOtpVerify,
  validateResetPassword,
  validateReview,
  validatePetCreation,
  handleValidationErrors
};
