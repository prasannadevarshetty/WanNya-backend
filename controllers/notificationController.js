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
      const translatedMessage = translate(n.key, n.data, translations);

      const message =
        translatedMessage === n.key
          ? translations.notifications?.[n.key] || n.key
          : translatedMessage;

      return {
        id: n._id,
        key: n.key,
        title: getNotificationTitle(n.key),
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
    case 'orderShipped':
      return 'Order Shipped';
    case 'orderDelivered':
      return 'Order Delivered';
    case 'orderCancelled':
      return 'Order Cancelled';
    case 'bookingConfirmed':
      return 'Booking Confirmed';
    default:
      return 'Notification';
  }
};

const getNotificationType = (key) => {
  switch (key) {
    case 'orderPlaced':
    case 'orderDelivered':
    case 'bookingConfirmed':
      return 'success';
    case 'orderCancelled':
      return 'warning';
    case 'orderShipped':
      return 'info';
    default:
      return 'info';
  }
};

const getNotificationCategory = (key) => {
  if (key.startsWith('order') || key.startsWith('booking')) {
    return 'order';
  }
  return 'system';
};

module.exports = { getNotifications };
