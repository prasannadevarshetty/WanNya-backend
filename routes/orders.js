const express = require('express');
const router = express.Router();

const Order = require('../models/Order');
const User = require('../models/User');
const CancelledProduct = require('../models/CancelledProduct');
const Service = require('../models/Service');
const Notification = require('../models/Notification');

const { authenticate } = require('../middleware/auth');

// Helper to parse price safely
const parseNumber = (value) => {
  if (typeof value === 'string') {
    return Number(value.replace(/[^\d.]/g, ''));
  }
  return Number(value);
};

// @route   POST /api/orders/create
router.post('/create', authenticate, async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;

    const rawTotal = req.body.totalAmount || req.body.totalPrice || req.body.total;
    const totalAmount = parseNumber(rawTotal);

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items are required' });
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({ message: 'Valid total amount is required' });
    }

    // Create order items
    const orderItems = items.map(item => ({
      product: item.id,
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
      pointsEarned: Math.floor(totalAmount * 0.01),
    });

    await order.save();

    await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { points: order.pointsEarned } }
    );

    // 🔔 CREATE ORDER NOTIFICATION
    await Notification.create({
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
    res.status(500).json({ message: 'Server error while creating order' });
  }
});

// @route   POST /api/orders/cancel/:orderId
router.post('/cancel/:orderId', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cancellationReason } = req.body;

    if (!cancellationReason || cancellationReason.trim().length === 0) {
      return res.status(400).json({ message: 'Cancellation reason is required' });
    }

    const order = await Order.findOne({
      _id: orderId,
      userId: req.user._id
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ message: 'Order is already cancelled' });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({ message: 'Cannot cancel delivered order' });
    }

    const cancelledProducts = order.items.map(item => ({
      orderId: order._id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      product: item.product,
      service: item.service,
      quantity: item.quantity,
      price: item.price,
      customization: item.customization,
      cancellationReason: cancellationReason.trim(),
      refundAmount: item.price * item.quantity,
      pointsDeducted: Math.floor((item.price * item.quantity) * 0.01),
      processedBy: 'user'
    }));

    await CancelledProduct.insertMany(cancelledProducts);

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = cancellationReason.trim();

    await order.save();

    const totalPointsDeducted = cancelledProducts.reduce(
      (sum, item) => sum + item.pointsDeducted,
      0
    );

    if (totalPointsDeducted > 0) {
      await User.findByIdAndUpdate(
        req.user._id,
        { $inc: { points: -totalPointsDeducted } }
      );
    }

    res.json({
      message: 'Order cancelled successfully',
      cancelledProducts: cancelledProducts.length,
      pointsDeducted: totalPointsDeducted
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Server error while cancelling order' });
  }
});

// @route   GET /api/orders/user
router.get('/user', authenticate, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .populate('items.product', 'name image price category')
      .populate('items.service', 'name image price category')
      .sort({ createdAt: -1 });

    const enhancedOrders = orders.map((o) => {
      const firstItem = o.items[0];

      const itemName =
        firstItem?.customization?.name ||
        firstItem?.product?.name ||
        firstItem?.service?.name ||
        'Order Item';

      const itemImage =
        firstItem?.customization?.image ||
        firstItem?.product?.image ||
        firstItem?.service?.image ||
        '/placeholder-product.jpg';

      return {
        id: o._id.toString(),
        orderNumber: o.orderNumber || `ORD-${o._id.toString().slice(-8)}`,
        title: itemName,
        category: o.type,
        price: o.totalAmount,
        date: o.createdAt
          ? o.createdAt.toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        status:
          o.status === 'delivered'
            ? 'completed'
            : (o.status === 'cancelled' ? 'cancelled' : 'ongoing'),
        items: o.items.map(item => ({
          id: item._id,
          name:
            item.customization?.name ||
            item.product?.name ||
            item.service?.name,
          image:
            item.customization?.image ||
            item.product?.image ||
            item.service?.image,
          quantity: item.quantity,
          price: item.price,
          category:
            item.customization?.category ||
            item.product?.category ||
            item.service?.category
        })),
        totalItems: o.items.reduce((sum, item) => sum + item.quantity, 0),
        pointsEarned: o.pointsEarned || 0,
        createdAt: o.createdAt,
        shippingAddress: o.shippingAddress
      };
    });

    res.json({
      success: true,
      orders: enhancedOrders,
      totalOrders: enhancedOrders.length
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders'
    });
  }
});

// @route   GET /api/orders/cancelled
router.get('/cancelled', authenticate, async (req, res) => {
  try {
    const cancelledProducts = await CancelledProduct.find({
      userId: req.user._id
    })
      .populate('product', 'name image')
      .populate('service', 'name image')
      .sort({ cancelledAt: -1 });

    res.json({
      cancelledProducts: cancelledProducts.map((cp) => ({
        id: cp._id.toString(),
        orderNumber: cp.orderNumber,
        product: cp.product,
        service: cp.service,
        quantity: cp.quantity,
        price: cp.price,
        customization: cp.customization,
        cancellationReason: cp.cancellationReason,
        refundAmount: cp.refundAmount,
        pointsDeducted: cp.pointsDeducted,
        cancelledAt: cp.cancelledAt,
        processedBy: cp.processedBy
      }))
    });

  } catch (error) {
    console.error('Get cancelled products error:', error);
    res.status(500).json({
      message: 'Server error while fetching cancelled products'
    });
  }
});

module.exports = router;