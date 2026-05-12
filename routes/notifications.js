const express = require('express');
const router = express.Router();

const { 
  getNotifications, 
  deleteNotification, 
  deleteAllNotifications, 
  markAsRead, 
  markAllAsRead 
} = require('../controllers/notificationController');

const { authenticate } = require('../middleware/auth');

// GET all notifications
router.get('/', authenticate, getNotifications);

// MARK notification as read
router.put('/:id/read', authenticate, markAsRead);

// MARK all notifications as read
router.put('/read-all', authenticate, markAllAsRead);

// DELETE single notification
router.delete('/:id', authenticate, deleteNotification);

// DELETE all notifications
router.delete('/', authenticate, deleteAllNotifications);

module.exports = router;
