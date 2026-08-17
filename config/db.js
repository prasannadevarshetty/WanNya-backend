const mongoose = require('mongoose');
const { info, warn, error: logErrorMessage } = require('../utils/logger');

const RECONNECT_DELAY_MS = 5000;

let listenersRegistered = false;
let reconnectTimer = null;

// Connection level listeners are registered once: registering them per
// connection attempt leaked listeners (and stacked reconnect loops) every time
// a retry ran.
const registerConnectionListeners = () => {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on('error', (err) => {
    logErrorMessage('MongoDB connection error', { error: err.message });
  });

  mongoose.connection.on('disconnected', () => {
    warn('MongoDB disconnected, scheduling reconnect', {
      delayMs: RECONNECT_DELAY_MS
    });
    scheduleReconnect();
  });

  mongoose.connection.on('reconnected', () => {
    info('MongoDB reconnected');
  });

  mongoose.connection.once('open', () => {
    info('MongoDB connection open', {
      database: mongoose.connection.name,
      host: mongoose.connection.host
    });
  });

  const closeAndExit = async (signal) => {
    try {
      await mongoose.connection.close();
      info(`MongoDB connection closed (${signal})`);
    } catch (err) {
      logErrorMessage('Failed to close MongoDB connection on shutdown', {
        signal,
        error: err.message
      });
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => closeAndExit('SIGINT'));
  process.on('SIGTERM', () => closeAndExit('SIGTERM'));
};

const scheduleReconnect = () => {
  if (reconnectTimer) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;

    // A background retry has nobody to reject to, so log the failure and let
    // the next retry be scheduled by this handler.
    connectDB({ retry: true }).catch((err) => {
      logErrorMessage('MongoDB reconnect attempt failed', { error: err.message });
      scheduleReconnect();
    });
  }, RECONNECT_DELAY_MS);

  reconnectTimer.unref?.();
};

const connectDB = async ({ retry = false } = {}) => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set, cannot connect to MongoDB');
  }

  registerConnectionListeners();

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      maxPoolSize: 10, // Maintain up to 10 socket connections
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });

    info('MongoDB connected', { host: conn.connection.host });

    return conn;
  } catch (error) {
    logErrorMessage('Database connection failed', { error: error.message });
    scheduleReconnect();

    // The initial connection failure is propagated so the caller can decide
    // whether to keep serving traffic; retries only log.
    if (!retry) {
      throw error;
    }

    return null;
  }
};

// Disconnect function for testing
const disconnectDB = async () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  await mongoose.connection.close();
  info('MongoDB disconnected');
};

module.exports = {
  connectDB,
  disconnectDB
};
