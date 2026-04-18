const express = require('express');
const router = express.Router();
const { getNotifications } = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth'); // 👈 your auth.js

router.get('/', authenticate, getNotifications);

module.exports = router;