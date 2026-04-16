const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  customization: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  totalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  appliedPromoCode: {
    code: String,
    discount: Number,
    discountType: {
      type: String,
      enum: ['percentage', 'fixed']
    }
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  finalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, {
  timestamps: true
});

// Indexes for faster queries
cartSchema.index({ userId: 1, isActive: 1 });
cartSchema.index({ expiresAt: 1 });

// Pre-save middleware to calculate totals
cartSchema.pre('save', function(next) {
  this.totalAmount = this.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  
  this.discountAmount = this.calculateDiscount();
  this.finalAmount = this.totalAmount - this.discountAmount;
  
  next();
});

// Instance method to calculate discount
cartSchema.methods.calculateDiscount = function() {
  if (!this.appliedPromoCode) return 0;
  
  const { discount, discountType } = this.appliedPromoCode;
  if (discountType === 'percentage') {
    return (this.totalAmount * discount) / 100;
  } else {
    return Math.min(discount, this.totalAmount);
  }
};

// Instance method to add item
cartSchema.methods.addItem = function(itemData) {
  const existingItem = this.items.find(item => 
    item.productId.toString() === itemData.productId.toString() &&
    (!itemData.serviceId || item.serviceId?.toString() === itemData.serviceId.toString())
  );
  
  if (existingItem) {
    existingItem.quantity += itemData.quantity || 1;
  } else {
    this.items.push(itemData);
  }
  
  return this.save();
};

// Instance method to remove item
cartSchema.methods.removeItem = function(itemId) {
  this.items = this.items.filter(item => item._id.toString() !== itemId.toString());
  return this.save();
};

// Instance method to clear cart
cartSchema.methods.clearCart = function() {
  this.items = [];
  this.appliedPromoCode = null;
  this.discountAmount = 0;
  return this.save();
};

module.exports = mongoose.model('Cart', cartSchema);
