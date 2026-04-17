const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');
const { validateReview } = require('../middleware/validation');
const mongoose = require('mongoose');

// @route   GET /api/reviews/product/:productId
// @desc    Get all reviews for a product
// @access  Public
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
// @desc    Create a new review
// @access  Private
router.post('/create', authenticate, validateReview, async (req, res) => {
  try {
    const { productId, orderId, rating, comment, title } = req.body;

    // Verify order belongs to user and contains the product
    const order = await Order.findOne({ 
      _id: orderId, 
      userId: req.user._id,
      'items.product': productId
    });

    if (!order) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only review products you have purchased' 
      });
    }

    const review = new Review({
      userId: req.user._id,
      productId,
      orderId,
      rating,
      comment,
      title: title || 'Product Review',
      isVerified: order.status === 'delivered'
    });

    await review.save();

    // Update product average rating (optional but recommended)
    const stats = await Review.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId), isActive: true } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
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
      return res.status(400).json({ success: false, message: 'You have already reviewed this item for this order' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;