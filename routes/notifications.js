const express = require('express');
const router = express.Router();
const { getNotifications } = require('../controllers/notificationController');
const auth = require('../middleware/auth'); // 👈 your auth.js

router.get('/', auth, getNotifications);

module.exports = router;