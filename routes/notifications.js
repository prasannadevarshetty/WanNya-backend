const express = require('express');
const router = express.Router();

const Notification = require('../models/Notifications');

const {
  getNotifications,
  deleteNotification,
  deleteAllNotifications
} = require('../controllers/notificationController');

const { authenticate } = require('../middleware/auth');

// GET all notifications
router.get('/', authenticate, getNotifications);

// DELETE single notification
router.delete('/:id', authenticate, deleteNotification);

// DELETE all notifications
router.delete('/', authenticate, deleteAllNotifications);

// MARK notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id || req.user.id
      },
      {
        isRead: true
      },
      {
        new: true
      }
    );

    if (!notification) {
      return res.status(404).json({
        message: 'Notification not found'
      });
    }

    res.json({
      message: 'Notification marked as read',
      notification
    });

  } catch (error) {
    console.error('Mark notification read error:', error);

    res.status(500).json({
      message: 'Server error while updating notification'
    });
  }
});

module.exports = router;
