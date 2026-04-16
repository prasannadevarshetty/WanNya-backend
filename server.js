const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDB } = require('./config/db');
const { globalErrorHandler, notFound } = require('./middleware/errorHandler');
const { requestLogger } = require('./utils/logger');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const reviewsRoutes = require('./routes/reviews');
const petRoutes = require('./routes/pets');
const serviceRoutes = require('./routes/services');
const cartRoutes = require('./routes/cart');
const wishlistRoutes = require('./routes/wishlist');

const app = express();

// Connect DB
connectDB();


// ======================
// 🔥 SECURITY
// ======================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));


// ======================
// 🔥 CORS (MUST BE FIRST)
// ======================
const allowedOrigins = [
  "http://localhost:3000",
  "https://your-frontend-url.vercel.app",  // Add your frontend URL here
  "https://wanya-backend-hyyydpat2-prasannadevarshettys-projects.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (origin.includes("vercel.app")) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true
}));

app.options("*", cors());

// ======================
// 🔥 RATE LIMIT (RELAXED)
// ======================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // 🔥 increased from 100
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
// 🔥 STATIC
// ======================
app.use('/uploads', express.static('uploads'));


// ======================
// 🔥 ROUTES
// ======================
app.get('/', (req, res) => {
  res.send('🚀 WanNya API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);


// ======================
// 🔥 HEALTH CHECK
// ======================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'WanNya Backend API is running',
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

app.listen(PORT, () => {
  console.log(`🚀 WanNya Backend Server running on port ${PORT}`);
});
