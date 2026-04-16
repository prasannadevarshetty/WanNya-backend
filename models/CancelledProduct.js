const mongoose = require('mongoose');

const cancelledProductSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  orderNumber: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  customization: {
    type: mongoose.Schema.Types.Mixed
  },
  cancellationReason: {
    type: String,
    required: true,
    maxlength: 500
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  pointsDeducted: {
    type: Number,
    default: 0
  },
  cancelledAt: {
    type: Date,
    default: Date.now
  },
  processedBy: {
    type: String,
    enum: ['user', 'admin', 'system'],
    default: 'user'
  }
}, {
  timestamps: true
});

// Index for efficient queries
cancelledProductSchema.index({ userId: 1, cancelledAt: -1 });
cancelledProductSchema.index({ orderId: 1 });

module.exports = mongoose.model('CancelledProduct', cancelledProductSchema);
