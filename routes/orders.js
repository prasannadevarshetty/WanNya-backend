const express = require('express');
const router = express.Router();

const Order = require('../models/Order');
const User = require('../models/User');
const CancelledProduct = require('../models/CancelledProduct');
const Service = require('../models/Service');
const { authenticate } = require('../middleware/auth');

// @route   POST /api/orders/create
// @desc    Create order from cart items (cash on delivery)
// @access  Private
router.post('/create', authenticate, async (req, res) => {
  try {
    const { items, totalAmount, shippingAddress } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        message: 'Items are required' 
      });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ 
        message: 'Valid total amount is required' 
      });
    }

    // Create order items
    const orderItems = items.map(item => ({
      product: item.id,
      quantity: item.quantity,
      price: item.price,
      customization: {
        name: item.name || item.title,
        image: item.image,
        category: item.category
      }
    }));

    // Create new order
    const order = new Order({
      userId: req.user._id,
      type: 'shop',
      items: orderItems,
      totalAmount,
      status: 'pending',
      shippingAddress: shippingAddress || {
        // Default address if not provided
        street: 'Default Address',
        city: 'Default City',
        state: 'Default State',
        country: 'Default Country',
        zip: '00000'
      },
      pointsEarned: Math.floor(totalAmount * 0.01), // 1% points
    });

    await order.save();

    // Add points to user
    await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { points: order.pointsEarned } }
    );

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

// @route   POST /api/orders/cancel/:orderId
// @desc    Cancel an order and move to cancelled products
// @access  Private
router.post('/cancel/:orderId', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cancellationReason } = req.body;

    if (!cancellationReason || cancellationReason.trim().length === 0) {
      return res.status(400).json({ 
        message: 'Cancellation reason is required' 
      });
    }

    // Find the order
    const order = await Order.findOne({ 
      _id: orderId, 
      userId: req.user._id 
    });

    if (!order) {
      return res.status(404).json({ 
        message: 'Order not found' 
      });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ 
        message: 'Order is already cancelled' 
      });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({ 
        message: 'Cannot cancel delivered order' 
      });
    }

    // Create cancelled products records
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

    // Update order status
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = cancellationReason.trim();
    await order.save();

    // Deduct points from user if they earned any
    const totalPointsDeducted = cancelledProducts.reduce((sum, item) => sum + item.pointsDeducted, 0);
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
    res.status(500).json({ 
      message: 'Server error while cancelling order' 
    });
  }
});

// @route   GET /api/orders/user
// @desc    Get orders for current user with enhanced details
// @access  Private
router.get('/user', authenticate, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .populate('items.product', 'name image price category')
      .populate('items.service', 'name image price category')
      .sort({ createdAt: -1 });

    const enhancedOrders = orders.map((o) => {
      // Get the first item for display purposes
      const firstItem = o.items[0];
      const itemName = firstItem?.customization?.name || 
                      firstItem?.product?.name || 
                      firstItem?.service?.name || 
                      'Order Item';
      
      const itemImage = firstItem?.customization?.image || 
                       firstItem?.product?.image || 
                       firstItem?.service?.image || 
                       '/placeholder-product.jpg';

      return {
        id: o._id.toString(),
        orderNumber: o.orderNumber || `ORD-${o._id.toString().slice(-8)}`,
        title: itemName,
        category: o.type,
        price: o.totalAmount,
        date: o.createdAt ? o.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: o.status === 'delivered' ? 'completed' : (o.status === 'cancelled' ? 'cancelled' : 'ongoing'),
        items: o.items.map(item => ({
          id: item._id,
          name: item.customization?.name || item.product?.name || item.service?.name,
          image: item.customization?.image || item.product?.image || item.service?.image,
          quantity: item.quantity,
          price: item.price,
          category: item.customization?.category || item.product?.category || item.service?.category
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
// @desc    Get cancelled products for current user
// @access  Private
router.get('/cancelled', authenticate, async (req, res) => {
  try {
    const cancelledProducts = await CancelledProduct.find({ userId: req.user._id })
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
    res.status(500).json({ message: 'Server error while fetching cancelled products' });
  }
});

module.exports = router;
