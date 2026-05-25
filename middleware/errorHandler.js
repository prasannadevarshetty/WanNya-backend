const { getTranslations } = require('../utils/translate');

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, key) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.key = key;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle CastError (invalid ObjectId)
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400, 'invalidInputData');
};

// Handle Duplicate fields error
const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400, 'invalidInputData');
};

// Handle Validation error
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400, 'validationFailed');
};

// Handle JWT error
const handleJWTError = (translations) =>
  new AppError(translations.invalidTokenLoginAgain, 401, 'invalidTokenLoginAgain');

// Handle JWT expired error
const handleJWTExpiredError = (translations) =>
  new AppError(translations.tokenExpiredLoginAgain, 401, 'tokenExpiredLoginAgain');

// Send error response in development
const sendErrorDev = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      key: err.key,
      stack: err.stack
    });
  }

  // B) RENDERED WEBSITE
  console.error('ERROR 💥', err);

  return res.status(err.statusCode).json({
    title: 'Something went wrong!',
    msg: err.message
  });
};

// Send error response in production
const sendErrorProd = (err, req, res, translations) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    // A) Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        key: err.key
      });
    }

    // B) Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);

    return res.status(500).json({
      status: 'error',
      message: translations.somethingWentVeryWrong,
      key: 'somethingWentVeryWrong'
    });
  }

  // B) RENDERED WEBSITE
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      title: translations.somethingWentWrong,
      msg: err.message
    });
  }

  // B) Programming or other unknown error: don't leak error details
  console.error('ERROR 💥', err);

  return res.status(err.statusCode).json({
    title: translations.somethingWentWrong,
    msg: translations.pleaseTryAgainLater
  });
};

// Global error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  const lang = req.query.lang || 'en';
  const translations = getTranslations(lang);

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    if (error.name === 'CastError') {
      error = handleCastErrorDB(error);
    }

    if (error.code === 11000) {
      error = handleDuplicateFieldsDB(error);
    }

    if (error.name === 'ValidationError') {
      error = handleValidationErrorDB(error);
    }

    if (error.name === 'JsonWebTokenError') {
      error = handleJWTError(translations);
    }

    if (error.name === 'TokenExpiredError') {
      error = handleJWTExpiredError(translations);
    }

    sendErrorProd(error, req, res, translations);
  }
};

// Async error wrapper for catching errors in async functions
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// 404 Not Found handler
const notFound = (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
  next(err);
};

module.exports = {
  AppError,
  globalErrorHandler,
  catchAsync,
  notFound
};
