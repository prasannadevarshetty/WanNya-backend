const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderNumber: {
    type: String,
    unique: true
  },
  type: {
    type: String,
    enum: ['shop', 'booking', 'bento'],
    required: true
  },
  items: [{
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
    }
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    country: String,
    zip: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    country: String,
    zip: String
  },
  addressId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  },
  deliveryInfo: {
    method: String,
    date: Date,
    timeSlot: String,
    trackingNumber: String,
    estimatedDelivery: Date
  },
  serviceInfo: {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceProvider'
    },
    date: Date,
    duration: Number,
    location: String,
    notes: String
  },
  notes: {
    type: String,
    maxlength: 500
  },
  promoCode: {
    code: String,
    discount: Number,
    discountType: {
      type: String,
      enum: ['percentage', 'fixed']
    }
  },
  pointsEarned: {
    type: Number,
    default: 0
  },
  pointsUsed: {
    type: Number,
    default: 0
  },
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Performance Indexes
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    this.orderNumber = `WNY-${Date.now()}-${Math.floor(Math.random()*1000)}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
