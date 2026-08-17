const { getTranslations } = require('../utils/translate');
const { logError, warn } = require('../utils/logger');

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
  const duplicatedValue =
    (err.keyValue && Object.values(err.keyValue)[0]) ||
    (err.errmsg || err.message || '').match(/(["'])(\\?.)*?\1/)?.[0];

  const message = duplicatedValue
    ? `Duplicate field value: ${duplicatedValue}. Please use another value!`
    : 'Duplicate field value. Please use another value!';

  return new AppError(message, 400, 'invalidInputData');
};

// Handle Validation error
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors || {}).map(el => el.message);
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
  return res.status(err.statusCode).json({
    title: translations.somethingWentWrong,
    msg: translations.pleaseTryAgainLater
  });
};

// Clone an error while keeping its prototype, name, message and stack, which a
// plain object spread would drop.
const cloneError = (err) => {
  const copy = Object.create(Object.getPrototypeOf(err));
  Object.assign(copy, err);
  copy.name = err.name;
  copy.message = err.message;
  copy.stack = err.stack;
  return copy;
};

// Global error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  const lang = req.query?.lang || 'en';
  const translations = getTranslations(lang);

  // Non-Error values (thrown strings, rejected non-errors) still need a stack
  // and a status code to be reportable.
  if (!(err instanceof Error)) {
    const wrapped = new Error(typeof err === 'string' ? err : JSON.stringify(err));
    wrapped.originalError = err;
    err = wrapped;
  }

  // A response already on the wire cannot carry the error; hand it to Express
  // so the socket is destroyed instead of failing silently on a double send.
  if (res.headersSent) {
    logError(err, req);
    return next(err);
  }

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Every error reaching this handler is recorded, so failures are never lost
  // even when the client only receives a generic message. Expected client
  // errors are logged as warnings to keep the error stream actionable.
  if (err.statusCode >= 500 || !err.isOperational) {
    logError(err, req);
  } else {
    warn(`${err.statusCode} ${err.message}`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: err.statusCode,
      key: err.key,
      userId: req.user?.id
    });
  }

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = cloneError(err);

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
    // Promise.resolve covers handlers that are not async, and the try/catch
    // covers handlers that throw before returning a promise.
    try {
      Promise.resolve(fn(req, res, next)).catch(next);
    } catch (err) {
      next(err);
    }
  };
};

// 404 Not Found handler
const notFound = (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404, 'notFound');
  next(err);
};

module.exports = {
  AppError,
  globalErrorHandler,
  catchAsync,
  notFound
};
