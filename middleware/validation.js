const { body, param, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// User registration validation
const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .if(body('password').exists())
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Pet creation validation
const validatePetCreation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Pet name must be between 1 and 50 characters'),
  
  body('breed')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Breed must be between 1 and 50 characters'),
  
  body('type')
    .isIn(['dog', 'cat'])
    .withMessage('Pet type must be either dog or cat'),
  
  body('gender')
    .optional()
    .isIn(['M', 'F'])
    .withMessage('Gender must be either M or F'),
  
  body('dob.date')
    .notEmpty()
    .withMessage('Date of birth date is required'),
  
  body('dob.month')
    .notEmpty()
    .withMessage('Date of birth month is required'),
  
  body('dob.year')
    .notEmpty()
    .withMessage('Date of birth year is required'),
  
  handleValidationErrors
];

// Address validation
const validateAddress = [
  body('label')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Address label must be between 1 and 50 characters'),
  
  body('street')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Street address must be between 2 and 200 characters'),
  
  body('city')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('City must be between 1 and 50 characters'),
  
  body('country')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Country must be between 1 and 50 characters'),
  
  handleValidationErrors
];

// Order creation validation (server-side) 
const validateCreateOrder = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),

  body('items.*.quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Item quantity must be between 1 and 100'),

  // Price must be a positive number and capped to avoid abuse
  body('items.*.price')
    .isFloat({ min: 0.01, max: 1_000_000 })
    .withMessage('Item price must be a positive number'),

  body('totalAmount')
    .isFloat({ min: 0.01, max: 10_000_000 })
    .withMessage('Total amount must be a positive number'),

  // Shipping address fields are required
  body('shippingAddress.street')
    .trim()
    .notEmpty()
    .withMessage('Shipping street address is required'),

  body('shippingAddress.city')
    .trim()
    .notEmpty()
    .withMessage('Shipping city is required'),

  body('shippingAddress.country')
    .trim()
    .notEmpty()
    .withMessage('Shipping country is required'),

  handleValidationErrors
];

// OTP fields validation (forgot-password / verify-otp / reset-password)
const validateOtpRequest = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  handleValidationErrors
];

const validateOtpVerify = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('otp')
    .trim()
    .isLength({ min: 4, max: 10 })
    .isNumeric()
    .withMessage('OTP must be a numeric code'),
  handleValidationErrors
];

const validateResetPassword = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('otp')
    .trim()
    .isLength({ min: 4, max: 10 })
    .isNumeric()
    .withMessage('OTP must be a numeric code'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
  handleValidationErrors
];

// Review creation validation
const validateReview = [
  body('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters'),
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validatePetCreation,
  validateAddress,
  validateOrder: validateCreateOrder,  // keep old export name for compatibility
  validateCreateOrder,
  validateOtpRequest,
  validateOtpVerify,
  validateResetPassword,
  validateReview,
  handleValidationErrors
};