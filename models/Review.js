const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceProvider'
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  images: [{
    url: String,
    caption: String
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  isRecommended: {
    type: Boolean,
    default: false
  },
  helpfulCount: {
    type: Number,
    default: 0,
    min: 0
  },
  response: {
    content: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date
}, {
  timestamps: true
});

// Indexes for faster queries
reviewSchema.index({ userId: 1, isActive: 1 });
reviewSchema.index({ productId: 1, isActive: 1 });
reviewSchema.index({ serviceId: 1, isActive: 1 });
reviewSchema.index({ providerId: 1, isActive: 1 });
reviewSchema.index({ orderId: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });

// Compound index for product reviews
reviewSchema.index({ productId: 1, isActive: 1, rating: -1 });

// Ensure at least one of productId or serviceId is provided
reviewSchema.pre('validate', function(next) {
  if (!this.productId && !this.serviceId) {
    next(new Error('Either productId or serviceId must be provided'));
  } else {
    next();
  }
});

// Prevent duplicate reviews for the same order and item
reviewSchema.index({ orderId: 1, productId: 1 }, { unique: true, sparse: true });
reviewSchema.index({ orderId: 1, serviceId: 1 }, { unique: true, sparse: true });

// Pre-save middleware to update edited timestamp
reviewSchema.pre('save', function(next) {
  if (this.isModified('comment') && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  next();
});

// Static method to get average rating
reviewSchema.statics.getAverageRating = function(itemId, itemType = 'product') {
  const matchField = itemType === 'product' ? 'productId' : 'serviceId';
  
  return this.aggregate([
    {
      $match: {
        [matchField]: mongoose.Types.ObjectId(itemId),
        isActive: true
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ]);
};

// Static method to get rating distribution
reviewSchema.statics.getRatingDistribution = function(itemId, itemType = 'product') {
  const matchField = itemType === 'product' ? 'productId' : 'serviceId';
  
  return this.aggregate([
    {
      $match: {
        [matchField]: mongoose.Types.ObjectId(itemId),
        isActive: true
      }
    },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: -1 }
    }
  ]);
};

// Instance method to mark as helpful
reviewSchema.methods.markHelpful = function() {
  this.helpfulCount += 1;
  return this.save();
};

// Instance method to add response
reviewSchema.methods.addResponse = function(content, respondedBy) {
  this.response = {
    content,
    respondedBy,
    respondedAt: new Date()
  };
  return this.save();
};

module.exports = mongoose.model('Review', reviewSchema);
