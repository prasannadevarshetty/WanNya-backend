const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');
const mongoose = require('mongoose');

// @route   GET /api/reviews/product/:productId
router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ 
      productId: req.params.productId,
      isActive: true 
    })
    .populate('userId', 'name avatar')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      reviews: reviews.map(r => ({
        id: r._id,
        userName: r.userId?.name || 'Anonymous',
        userAvatar: r.userId?.avatar,
        rating: r.rating,
        comment: r.comment,
        date: r.createdAt.toISOString().split('T')[0],
        helpful: r.helpfulCount,
        verified: r.isVerified
      }))
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/reviews/create
router.post('/create', authenticate, async (req, res) => {
  try {
    const { productId, rating, comment, title } = req.body;
    let { orderId } = req.body;

    // Basic validation
    if (!productId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Product, rating and comment are required'
      });
    }

    let order = null;

    // Try to find order (optional now)
    if (orderId) {
      order = await Order.findOne({ 
        _id: orderId, 
        userId: req.user._id,
        'items.product': productId
      });
    } else {
      order = await Order.findOne({
        userId: req.user._id,
        'items.product': productId
      }).sort({ createdAt: -1 });
    }

    // If order exists, attach it
    if (order) {
      orderId = order._id;
    }

    const review = new Review({
      userId: req.user._id,
      productId,
      orderId,
      rating: Number(rating),
      comment,
      title: title || 'Product Review',
      isVerified: order?.status === 'delivered'
    });

    await review.save();

    // Update product rating
    const stats = await Review.aggregate([
      { 
        $match: { 
          productId: new mongoose.Types.ObjectId(productId), 
          isActive: true 
        } 
      },
      { 
        $group: { 
          _id: null, 
          avg: { $avg: '$rating' }, 
          count: { $sum: 1 } 
        } 
      }
    ]);

    if (stats.length > 0) {
      await Product.findByIdAndUpdate(productId, {
        rating: parseFloat(stats[0].avg.toFixed(1)),
        numReviews: stats[0].count
      });
    }

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      review
    });

  } catch (error) {
    console.error('Create review error:', error);

    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already reviewed this item for this order' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;