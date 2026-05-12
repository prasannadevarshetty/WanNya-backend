const express = require('express');
const router = express.Router();
const { getNotifications, deleteNotification, deleteAllNotifications } = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, getNotifications);
router.delete('/:id', authenticate, deleteNotification);
router.delete('/', authenticate, deleteAllNotifications);

module.exports = router;
