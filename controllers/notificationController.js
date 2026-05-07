const Notification = require('../models/Notifications');
const { getTranslations, translate } = require('../utils/translate');

const getNotifications = async (req, res) => {
  try {
    const lang = req.query.lang || 'en';
    const translations = getTranslations(lang);

    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });

    const result = notifications.map((n) => ({
      id: n._id,
      message: translate(n.key, n.data, translations),
      isRead: n.isRead,
      createdAt: n.createdAt
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

module.exports = { getNotifications };