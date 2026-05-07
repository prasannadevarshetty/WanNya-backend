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
        id: r._id.toString(),
        userId: r.userId?._id?.toString(),
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

    // Verify user has purchased the product
    let order;
    if (orderId) {
      order = await Order.findOne({ 
        _id: orderId, 
        userId: req.user._id,
        'items.product': productId
      });
    } else {
      // Find all orders for this product by this user
      const orders = await Order.find({
        userId: req.user._id,
        'items.product': productId,
        status: 'delivered'
      }).sort({ createdAt: -1 });

      if (orders.length === 0) {
        // Fallback to any order if no delivered ones found
        const allOrders = await Order.find({
          userId: req.user._id,
          'items.product': productId
        }).sort({ createdAt: -1 });
        
        // Find the first one that hasn't been reviewed yet
        for (const o of allOrders) {
          const reviewed = await Review.findOne({
            userId: req.user._id,
            productId,
            orderId: o._id,
            isActive: true
          });
          if (!reviewed) {
            order = o;
            break;
          }
        }
        
        // If all are reviewed, just take the first one (will fail later with duplicate error)
        if (!order && allOrders.length > 0) order = allOrders[0];
      } else {
        // Find the first delivered order that hasn't been reviewed yet
        for (const o of orders) {
          const reviewed = await Review.findOne({
            userId: req.user._id,
            productId,
            orderId: o._id,
            isActive: true
          });
          if (!reviewed) {
            order = o;
            break;
          }
        }
        
        // If all delivered orders are reviewed, just take the first one
        if (!order && orders.length > 0) order = orders[0];
      }
    }

    if (!order) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only review products you have purchased' 
      });
    }

    // Check if any review (active or inactive) exists for THIS order
    let review = await Review.findOne({
      userId: req.user._id,
      productId: new mongoose.Types.ObjectId(productId),
      orderId: order._id
    });

    if (review) {
      if (review.isActive) {
        return res.status(400).json({
          success: false,
          message: 'You have already reviewed this item. Please edit your existing review instead.'
        });
      }
      
      // Reactivate and update the deleted review
      review.rating = rating;
      review.comment = comment;
      review.title = title || 'Product Review';
      review.isActive = true;
      review.isVerified = order.status === 'delivered';
      await review.save();
    } else {
      // Create new review
      review = new Review({
        userId: req.user._id,
        productId,
        orderId: order._id,
        rating,
        comment,
        title: title || 'Product Review',
        isVerified: order.status === 'delivered'
      });
      await review.save();
    }

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
  } catch (error: any) {
    console.error('Create review error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Database conflict: A review for this order and product already exists in our records.' 
      });
    }
    res.status(500).json({ success: false, message: 'Server error: ' + (error.message || 'Unknown error') });
  }
});

// @route   PUT /api/reviews/:reviewId
// @desc    Update a review
// @access  Private
router.put('/:reviewId', authenticate, async (req, res) => {
  try {
    const { rating, comment, title } = req.body;
    
    const review = await Review.findOne({ 
      _id: req.params.reviewId,
      userId: req.user._id,
      isActive: true
    });

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (rating) review.rating = rating;
    if (comment) review.comment = comment;
    if (title) review.title = title;

    await review.save();

    // Update product average rating
    const stats = await Review.aggregate([
      { $match: { productId: review.productId, isActive: true } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    if (stats.length > 0) {
      await Product.findByIdAndUpdate(review.productId, {
        rating: parseFloat(stats[0].avg.toFixed(1)),
        numReviews: stats[0].count
      });
    }

    res.json({
      success: true,
      message: 'Review updated successfully',
      review
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/reviews/:reviewId
// @desc    Delete a review
// @access  Private
router.delete('/:reviewId', authenticate, async (req, res) => {
  try {
    const review = await Review.findOne({ 
      _id: req.params.reviewId,
      userId: req.user._id,
      isActive: true
    });

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    // Soft delete
    review.isActive = false;
    await review.save();

    // Update product average rating
    const stats = await Review.aggregate([
      { $match: { productId: review.productId, isActive: true } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    if (stats.length > 0) {
      await Product.findByIdAndUpdate(review.productId, {
        rating: parseFloat(stats[0].avg.toFixed(1)),
        numReviews: stats[0].count
      });
    } else {
      // No more reviews
      await Product.findByIdAndUpdate(review.productId, {
        rating: 0,
        numReviews: 0
      });
    }

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
