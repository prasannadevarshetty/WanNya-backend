const express = require('express');
const router = express.Router();

// 🔥 Route logger
router.use((req, res, next) => {
  console.log("ORDERS ROUTE HIT:", req.method, req.originalUrl);
  next();
});

const axios = require('axios');

const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const Service = require('../models/Service');
const CancelledProduct = require('../models/CancelledProduct');
const Notification = require('../models/Notifications');

const { authenticate } = require('../middleware/auth');

const parseNumber = (value) => {
  if (typeof value === 'string') {
    return Number(value.replace(/[^\d.]/g, ''));
  }

  return Number(value);
};

// @route POST /api/orders/create
router.post('/create', authenticate, async (req, res) => {
  try {
    console.log('Create order API called at:', new Date().toISOString());

    const { items, shippingAddress } = req.body;

    const rawTotal =
      req.body.totalAmount ||
      req.body.totalPrice ||
      req.body.total;

    const totalAmount = parseNumber(rawTotal);

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'Items are required'
      });
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({
        message: 'Valid total amount is required'
      });
    }

    const orderItems = items.map((item) => ({
      product: item.id || item.productId,
      quantity: item.quantity,
      price: parseNumber(item.price),
      customization: {
        name: item.name || item.title,
        image: item.image,
        category: item.category
      }
    }));

    const order = new Order({
      userId: req.user._id,
      type: 'shop',
      items: orderItems,
      totalAmount,
      status: 'pending',
      shippingAddress: shippingAddress || {
        street: 'Default Address',
        city: 'Default City',
        state: 'Default State',
        country: 'Default Country',
        zip: '00000'
      },
      pointsEarned: Math.floor(totalAmount * 0.01)
    });

    await order.save();

    try {
      const notification = await Notification.create({
        userId: req.user._id,
        key: 'orderPlaced',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          totalItems: items.length
        },
        isRead: false
      });

      console.log('Notification created:', notification._id);
    } catch (notificationError) {
      console.error('Notification creation failed:', notificationError);
    }

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status,
        pointsEarned: order.pointsEarned
      }
    });

  } catch (error) {
    console.error('Create order error:', error);

    res.status(500).json({
      message: 'Server error while creating order'
    });
  }
});

// @route GET /api/orders/my-orders
router.get('/my-orders', authenticate, async (req, res) => {
  try {

    const orders = await Order.find({
  userId: req.user._id
        })
  .populate('items.product')
  .sort({ createdAt: -1 });

    res.status(200).json({
      orders
    });

  } catch (error) {
    console.error('Fetch orders error:', error);

    res.status(500).json({
      message: 'Server error while fetching orders'
    });
  }
});

// @route PUT /api/orders/:orderId/status
router.put('/:orderId/status', authenticate, async (req, res) => {

  console.log("STATUS API HIT");

  try {
    const { orderId } = req.params;
    const { status } = req.body;

    console.log("Incoming Status:", status);

    const validStatuses = [
      'pending',
      'shipped',
      'delivered',
      'cancelled',
      'ongoing'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Invalid status'
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    console.log("Previous Status:", order.status);

    order.status = status;

    // 🔥 Add points when delivered
    if (status === "delivered") {

      console.log("Points logic triggered");
      console.log("Order Points:", order.pointsEarned);

      const user = await User.findById(order.userId);

      console.log("User Found:", !!user);

      if (user) {
        user.points = (user.points || 0) + (order.pointsEarned || 0);

        console.log("Updated User Points:", user.points);

        await user.save();
      }

      order.pointsAdded = true;

      await Notification.create({
        userId: order.userId,
        key: 'orderDelivered',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber
        },
        isRead: false
      });
    }

    await order.save();

    res.status(200).json({
      message: 'Order status updated successfully',
      order
    });

  } catch (error) {
    console.error('Update order status error:', error);

    res.status(500).json({
      message: 'Server error while updating order status'
    });
  }
});

// @route   POST /api/orders/cancel/:orderId
// @desc    Cancel order
router.post('/cancel/:orderId', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cancellationReason } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      userId: req.user._id
    });

    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    const uncancelableStatuses = ['shipped', 'delivered', 'cancelled', 'refunded'];
    if (uncancelableStatuses.includes(order.status)) {
      return res.status(400).json({
        message: `Order cannot be cancelled because it is already ${order.status}`
      });
    }

    order.status = 'cancelled';
    order.cancellationReason = cancellationReason || 'Cancelled by user';
    order.cancelledAt = new Date();
    await order.save();

    // Create CancelledProduct record
    try {
      await CancelledProduct.create({
        userId: req.user._id,
        orderId: order._id,
        cancellationReason: order.cancellationReason,
        cancelledAt: order.cancelledAt
      });
    } catch (cancelProdErr) {
      console.error('Failed to create CancelledProduct entry:', cancelProdErr);
    }

    // Create notification
    try {
      await Notification.create({
        userId: req.user._id,
        key: 'orderCancelled',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          reason: order.cancellationReason
        },
        isRead: false
      });
    } catch (notifErr) {
      console.error('Failed to create order cancellation notification:', notifErr);
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      message: 'Server error while cancelling order'
    });
  }
});

module.exports = router;

