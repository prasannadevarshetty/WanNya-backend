const Notification = require('../models/Notifications');
const { getTranslations, translate } = require('../utils/translate');

const getNotifications = async (req, res) => {
  try {
    const lang = req.query.lang || 'en';
    const translations = getTranslations(lang);

    const notifications = await Notification.find({
      userId: req.user._id || req.user.id
    }).sort({ createdAt: -1 });

    const result = notifications.map((n) => {
      const message = translate(n.key, n.data, translations);

      return {
        id: n._id,
        key: n.key,
        title: n.data?.title || getNotificationTitle(n.key),
        message,
        content: message,
        type: n.data?.type || getNotificationType(n.key),
        category: n.data?.category || getNotificationCategory(n.key),
        isRead: n.isRead,
        read: n.isRead,
        data: n.data,
        createdAt: n.createdAt
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      message: 'Failed to fetch notifications'
    });
  }
};

const getNotificationTitle = (key) => {
  switch (key) {
    case 'orderPlaced':
      return 'Order Placed';
    default:
      return 'Notification';
  }
};

const getNotificationType = (key) => {
  switch (key) {
    case 'orderPlaced':
      return 'success';
    default:
      return 'info';
  }
};

const getNotificationCategory = (key) => {
  switch (key) {
    case 'orderPlaced':
      return 'order';
    default:
      return 'system';
  }
};

module.exports = { getNotifications };
