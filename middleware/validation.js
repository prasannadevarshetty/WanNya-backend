const { body, validationResult } = require('express-validator');

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
    .isLength({ min: 5, max: 200 })
    .withMessage('Street address must be between 5 and 200 characters'),
  
  body('city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),
  
  body('state')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('State must be between 2 and 50 characters'),
  
  body('country')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Country must be between 2 and 50 characters'),
  
  body('zip')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('ZIP code must be between 3 and 20 characters'),
  
  handleValidationErrors
];

// Order validation
const validateOrder = [
  body('type')
    .isIn(['shop', 'booking', 'bento'])
    .withMessage('Order type must be shop, booking, or bento'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Item quantity must be at least 1'),
  
  body('items.*.price')
    .isFloat({ min: 0 })
    .withMessage('Item price must be a positive number'),
  
  body('totalAmount')
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a positive number'),
  
  body('paymentMethod')
    .isIn(['card', 'cash', 'online'])
    .withMessage('Payment method must be card, cash, or online'),
  
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validatePetCreation,
  validateAddress,
  validateOrder,
  handleValidationErrors
};
