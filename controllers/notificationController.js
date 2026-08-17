const Notification = require('../models/Notifications');
const { getTranslations, translate } = require('../utils/translate');

const getNotifications = async (req, res, next) => {
  try {
    const lang = req.query.lang || 'en';
    const translations = getTranslations(lang);

    const notifications = await Notification.find({
      userId: req.user._id || req.user.id
    }).sort({ createdAt: -1 });

    const result = notifications.map((n) => {
      const message = translate(`notifications.${n.key}`, n.data, translations);

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
    next(error);
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

const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await Notification.findOneAndDelete({
      _id: id,
      userId: req.user._id || req.user.id
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};

const deleteAllNotifications = async (req, res, next) => {
  try {
    await Notification.deleteMany({
      userId: req.user._id || req.user.id
    });
    res.status(200).json({ message: 'All notifications deleted' });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const updated = await Notification.findOneAndUpdate(
      {
        _id: id,
        userId: req.user._id || req.user.id
      },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      {
        userId: req.user._id || req.user.id,
        isRead: { $ne: true }
      },
      { $set: { isRead: true } }
    );
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getNotifications, deleteNotification, deleteAllNotifications, markAsRead, markAllAsRead };
