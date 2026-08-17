const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDB } = require('./config/db');
const { globalErrorHandler, notFound } = require('./middleware/errorHandler');
const { requestLogger, logError, error: logErrorMessage } = require('./utils/logger');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const reviewsRoutes = require('./routes/reviews');
const petRoutes = require('./routes/pets');
const serviceRoutes = require('./routes/services');
const cartRoutes = require('./routes/cart');
const wishlistRoutes = require('./routes/wishlist');
const notificationRoutes = require('./routes/notifications');
const adminUsersRoutes = require('./routes/adminUsers');
const locationRoutes = require('./routes/location');
const salonRoutes = require('./routes/salons');
const hotelRoutes = require('./routes/hotels');
const clinicRoutes = require('./routes/clinics');
const salonBookingRoutes = require('./routes/salonBookings');
const clinicBookingRoutes = require('./routes/clinicBookings');

const app = express();

// ======================
// 🔥 TRUST PROXY (RENDER FIX)
// ======================
app.set('trust proxy', 1);

// ======================
// 🔥 CONNECT DB
// ======================
// The initial connection is retried in the background, so a failure here is
// logged rather than fatal, but it must never become an unhandled rejection.
connectDB().catch((err) => {
  logError(err);
});

// ======================
// 🔥 SECURITY
// ======================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// ======================
// 🔥 CORS
// ======================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://wannya.onrender.com',
  'https://wan-frontend-zwik.onrender.com',
  'https://wannya-sm35.onrender.com'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      // Allow any port on localhost or 127.0.0.1 for local development
      const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (allowedOrigins.includes(origin) || isLocal) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

// ======================
// 🔥 RATE LIMIT
// ======================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// ======================
// 🔥 MIDDLEWARE
// ======================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ======================
// 🔥 STATIC FILES
// ======================
app.use('/uploads', express.static('uploads'));

// ======================
// 🔥 ROOT ROUTE
// ======================
app.get('/', (req, res) => {
  res.send('🚀 WanNya API is running...');
});

// ======================
// 🔥 API ROUTES
// ======================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminUsersRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/salons', salonRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/bentos', require('./routes/bentos'));
app.use('/api/hotel-bookings', require('./routes/hotelBookings'));
app.use('/api/salon-bookings', salonBookingRoutes);
app.use('/api/clinic-bookings', clinicBookingRoutes);

// ======================
// 🔥 HEALTH CHECK
// ======================
app.get('/api/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;

  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'OK' : 'DEGRADED',
    message: 'WanNya Backend API is running',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ======================
// 🔥 ERROR HANDLING
// ======================
app.use('*', notFound);
app.use(globalErrorHandler);

// ======================
// 🔥 SERVER START
// ======================
const PORT = process.env.PORT || 5001;

let server;

if (!process.env.VERCEL) {
  server = app.listen(PORT, () => {
    console.log(`🚀 WanNya Backend Server running on port ${PORT}`);
  });
}

// ======================
// 🔥 PROCESS LEVEL SAFETY NETS
// ======================
// Without these, a rejected promise or a throw outside a request handler is
// swallowed (or kills the process with no log at all).
process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(`Unhandled rejection: ${reason}`);
  logError(err);
});

process.on('uncaughtException', (err) => {
  logError(err);
  logErrorMessage('Uncaught exception, shutting down');

  if (server) {
    server.close(() => process.exit(1));
    setTimeout(() => process.exit(1), 5000).unref();
  } else {
    process.exit(1);
  }
});

module.exports = app;
