jest.mock('../../models/Notifications', () => ({
  find: jest.fn(),
  findOneAndDelete: jest.fn(),
  deleteMany: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateMany: jest.fn()
}));

const Notification = require('../../models/Notifications');
const {
  getNotifications,
  deleteNotification,
  deleteAllNotifications,
  markAsRead,
  markAllAsRead
} = require('../../controllers/notificationController');
const ja = require('../../locales/ja.json');
const { mockRequest, mockResponse } = require('../helpers/mockHttp');

const mockFind = (docs) => {
  Notification.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(docs) });
};

const notificationDoc = (overrides = {}) => ({
  _id: 'n1',
  key: 'orderPlaced',
  data: { orderNumber: 'WN-1', totalAmount: 2500 },
  isRead: false,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  ...overrides
});

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('getNotifications', () => {
  it('returns the user notifications newest first with interpolated messages', async () => {
    const sort = jest.fn().mockResolvedValue([notificationDoc()]);
    Notification.find.mockReturnValue({ sort });
    const res = mockResponse();

    await getNotifications(mockRequest({ user: { _id: 'u1' } }), res);

    expect(Notification.find).toHaveBeenCalledWith({ userId: 'u1' });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual([
      {
        id: 'n1',
        key: 'orderPlaced',
        title: 'Order Placed',
        message: 'Your order WN-1 for ¥2500 has been placed successfully!',
        content: 'Your order WN-1 for ¥2500 has been placed successfully!',
        type: 'success',
        category: 'order',
        isRead: false,
        read: false,
        data: { orderNumber: 'WN-1', totalAmount: 2500 },
        createdAt: new Date('2024-01-01T00:00:00.000Z')
      }
    ]);
  });

  it('falls back to req.user.id when _id is absent', async () => {
    mockFind([]);

    await getNotifications(mockRequest({ user: { id: 'u2' } }), mockResponse());

    expect(Notification.find).toHaveBeenCalledWith({ userId: 'u2' });
  });

  it('translates messages into the requested language', async () => {
    mockFind([notificationDoc({ key: 'orderShipped', data: { orderNumber: 'WN-2' } })]);
    const res = mockResponse();

    await getNotifications(mockRequest({ query: { lang: 'ja' }, user: { _id: 'u1' } }), res);

    expect(res.body[0].message).toBe(
      ja.notifications.orderShipped.replace('{{orderNumber}}', 'WN-2')
    );
  });

  it.each([
    ['orderShipped', 'Order Shipped', 'info'],
    ['orderDelivered', 'Order Delivered', 'success'],
    ['orderCancelled', 'Order Cancelled', 'warning'],
    ['bookingConfirmed', 'Booking Confirmed', 'success']
  ])('derives title and type for %s', async (key, title, type) => {
    mockFind([notificationDoc({ key, data: {} })]);
    const res = mockResponse();

    await getNotifications(mockRequest({ user: { _id: 'u1' } }), res);

    expect(res.body[0]).toMatchObject({ title, type, category: 'order' });
  });

  it('labels unknown keys as generic system notifications', async () => {
    mockFind([notificationDoc({ key: 'somethingElse', data: {} })]);
    const res = mockResponse();

    await getNotifications(mockRequest({ user: { _id: 'u1' } }), res);

    expect(res.body[0]).toMatchObject({
      title: 'Notification',
      type: 'info',
      category: 'system',
      message: 'notifications.somethingElse'
    });
  });

  it('prefers the type and category stored on the notification data', async () => {
    mockFind([notificationDoc({ data: { type: 'custom', category: 'promo' } })]);
    const res = mockResponse();

    await getNotifications(mockRequest({ user: { _id: 'u1' } }), res);

    expect(res.body[0]).toMatchObject({ type: 'custom', category: 'promo' });
  });

  it('returns 500 when the query fails', async () => {
    Notification.find.mockImplementation(() => {
      throw new Error('db down');
    });
    const res = mockResponse();

    await getNotifications(mockRequest({ user: { _id: 'u1' } }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body).toEqual({ message: 'Failed to fetch notifications' });
  });
});

describe('deleteNotification', () => {
  it('deletes only a notification owned by the caller', async () => {
    Notification.findOneAndDelete.mockResolvedValue({});
    const res = mockResponse();

    await deleteNotification(mockRequest({ params: { id: 'n1' }, user: { _id: 'u1' } }), res);

    expect(Notification.findOneAndDelete).toHaveBeenCalledWith({ _id: 'n1', userId: 'u1' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({ message: 'Notification deleted' });
  });

  it('returns 500 when the delete fails', async () => {
    Notification.findOneAndDelete.mockRejectedValue(new Error('db down'));
    const res = mockResponse();

    await deleteNotification(mockRequest({ params: { id: 'n1' }, user: { _id: 'u1' } }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body).toEqual({ message: 'Failed to delete notification' });
  });
});

describe('deleteAllNotifications', () => {
  it('deletes every notification of the caller', async () => {
    Notification.deleteMany.mockResolvedValue({});
    const res = mockResponse();

    await deleteAllNotifications(mockRequest({ user: { id: 'u3' } }), res);

    expect(Notification.deleteMany).toHaveBeenCalledWith({ userId: 'u3' });
    expect(res.body).toEqual({ message: 'All notifications deleted' });
  });

  it('returns 500 when the bulk delete fails', async () => {
    Notification.deleteMany.mockRejectedValue(new Error('db down'));
    const res = mockResponse();

    await deleteAllNotifications(mockRequest({ user: { id: 'u3' } }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body).toEqual({ message: 'Failed to delete all notifications' });
  });
});

describe('markAsRead', () => {
  it('marks a single owned notification as read', async () => {
    Notification.findOneAndUpdate.mockResolvedValue({});
    const res = mockResponse();

    await markAsRead(mockRequest({ params: { id: 'n1' }, user: { _id: 'u1' } }), res);

    expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'n1', userId: 'u1' },
      { $set: { isRead: true } },
      { new: true }
    );
    expect(res.body).toEqual({ message: 'Notification marked as read' });
  });

  it('returns 500 when the update fails', async () => {
    Notification.findOneAndUpdate.mockRejectedValue(new Error('db down'));
    const res = mockResponse();

    await markAsRead(mockRequest({ params: { id: 'n1' }, user: { _id: 'u1' } }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body).toEqual({ message: 'Failed to mark notification as read' });
  });
});

describe('markAllAsRead', () => {
  it('marks only the unread notifications of the caller', async () => {
    Notification.updateMany.mockResolvedValue({});
    const res = mockResponse();

    await markAllAsRead(mockRequest({ user: { _id: 'u1' } }), res);

    expect(Notification.updateMany).toHaveBeenCalledWith(
      { userId: 'u1', isRead: { $ne: true } },
      { $set: { isRead: true } }
    );
    expect(res.body).toEqual({ message: 'All notifications marked as read' });
  });

  it('returns 500 when the bulk update fails', async () => {
    Notification.updateMany.mockRejectedValue(new Error('db down'));
    const res = mockResponse();

    await markAllAsRead(mockRequest({ user: { _id: 'u1' } }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body).toEqual({ message: 'Failed to mark all notifications as read' });
  });
});
