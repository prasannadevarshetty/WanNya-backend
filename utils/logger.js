const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels with colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

const logLevels = {
  error: { color: colors.red, priority: 0 },
  warn: { color: colors.yellow, priority: 1 },
  info: { color: colors.green, priority: 2 },
  debug: { color: colors.blue, priority: 3 }
};

// Get current date string for log files
const getDateString = () => {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
};

// Format timestamp
const getTimestamp = () => {
  const now = new Date();
  return now.toISOString();
};

// Write to log file
const writeToFile = (level, message, meta = {}) => {
  const date = getDateString();
  const logFile = path.join(logsDir, `${date}.log`);
  
  const logEntry = {
    timestamp: getTimestamp(),
    level: level.toUpperCase(),
    message,
    ...(Object.keys(meta).length > 0 && { meta })
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';
  
  try {
    fs.appendFileSync(logFile, logLine);
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
};

// Log to console with colors
const logToConsole = (level, message, meta = {}) => {
  const { color } = logLevels[level] || logLevels.info;
  const timestamp = getTimestamp();
  const levelStr = level.toUpperCase().padEnd(5);
  
  let consoleMessage = `${color}[${timestamp}] ${levelStr}${colors.reset} ${message}`;
  
  if (Object.keys(meta).length > 0) {
    consoleMessage += ` ${colors.dim}${JSON.stringify(meta)}${colors.reset}`;
  }
  
  console.log(consoleMessage);
};

// Main logger function
const logger = (level, message, meta = {}) => {
  // Only log if the level is enabled (based on environment)
  const currentLogLevel = process.env.LOG_LEVEL || 'info';
  const currentPriority = logLevels[currentLogLevel]?.priority || 2;
  const messagePriority = logLevels[level]?.priority || 2;
  
  if (messagePriority <= currentPriority) {
    logToConsole(level, message, meta);
    writeToFile(level, message, meta);
  }
};

// Convenience methods
const error = (message, meta = {}) => logger('error', message, meta);
const warn = (message, meta = {}) => logger('warn', message, meta);
const info = (message, meta = {}) => logger('info', message, meta);
const debug = (message, meta = {}) => logger('debug', message, meta);

// Request logger middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  info(`${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger(level, `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id
    });
  });
  
  next();
};

// Error logger
const logError = (error, req = null) => {
  const errorMeta = {
    name: error.name,
    message: error.message,
    stack: error.stack
  };
  
  if (req) {
    errorMeta.request = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userId: req.user?.id
    };
  }
  
  error('Application Error', errorMeta);
};

// Database operation logger
const logDbOperation = (operation, collection, data = {}) => {
  debug(`DB Operation: ${operation} on ${collection}`, {
    operation,
    collection,
    ...data
  });
};

// Authentication logger
const logAuth = (action, userId = null, success = true, meta = {}) => {
  const level = success ? 'info' : 'warn';
  logger(level, `Auth: ${action}`, {
    action,
    userId,
    success,
    ...meta
  });
};

// API response logger
const logApiResponse = (req, res, responseData = null) => {
  debug(`API Response: ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    userId: req.user?.id,
    responseData: responseData ? JSON.stringify(responseData).substring(0, 200) + '...' : null
  });
};

// Clean old log files (keep last 7 days)
const cleanOldLogs = () => {
  try {
    const files = fs.readdirSync(logsDir);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    files.forEach(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < sevenDaysAgo) {
        fs.unlinkSync(filePath);
        info(`Cleaned old log file: ${file}`);
      }
    });
  } catch (error) {
    error('Failed to clean old logs', { error: error.message });
  }
};

// Schedule log cleanup (run daily at midnight)
if (process.env.NODE_ENV === 'production') {
  // Run cleanup immediately and then schedule daily
  cleanOldLogs();
  setInterval(cleanOldLogs, 24 * 60 * 60 * 1000); // 24 hours
}

module.exports = {
  logger,
  error,
  warn,
  info,
  debug,
  requestLogger,
  logError,
  logDbOperation,
  logAuth,
  logApiResponse,
  cleanOldLogs
};
