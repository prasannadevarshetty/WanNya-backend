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
    default: () =>
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  }

}, {
  timestamps: true
});

// Indexes
cartSchema.index({ userId: 1, isActive: 1 });
cartSchema.index({ expiresAt: 1 });

// Pre-save middleware
cartSchema.pre('save', function(next) {

  console.log("SAVING CART FOR USER:", this.userId);
  console.log("CART ITEMS BEFORE SAVE:", this.items);

  this.totalAmount = this.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);

  this.discountAmount = this.calculateDiscount();

  this.finalAmount =
    this.totalAmount - this.discountAmount;

  console.log("TOTAL:", this.totalAmount);
  console.log("FINAL:", this.finalAmount);

  next();
});

// Calculate discount
cartSchema.methods.calculateDiscount = function() {

  if (!this.appliedPromoCode) return 0;

  const { discount, discountType } =
    this.appliedPromoCode;

  if (discountType === 'percentage') {
    return (this.totalAmount * discount) / 100;
  } else {
    return Math.min(discount, this.totalAmount);
  }
};

// Add item
cartSchema.methods.addItem = function(itemData) {

  console.log("ADDING ITEM:", itemData);

  const existingItem = this.items.find(item =>
    item.productId.toString() ===
      itemData.productId.toString() &&
    (
      !itemData.serviceId ||
      item.serviceId?.toString() ===
        itemData.serviceId.toString()
    )
  );

  if (existingItem) {

    console.log("ITEM ALREADY EXISTS");

    existingItem.quantity +=
      itemData.quantity || 1;

  } else {

    console.log("NEW ITEM PUSHED");

    this.items.push(itemData);
  }

  console.log("UPDATED ITEMS:", this.items);

  return this.save();
};

// Remove item
cartSchema.methods.removeItem = function(itemId) {

  console.log("REMOVING ITEM:", itemId);

  this.items = this.items.filter(
    item =>
      item._id.toString() !== itemId.toString()
  );

  return this.save();
};

// Clear cart
cartSchema.methods.clearCart = function() {

  console.log("CLEARING CART FOR USER:", this.userId);

  this.items = [];
  this.appliedPromoCode = null;
  this.discountAmount = 0;

  return this.save();
};

module.exports = mongoose.model('Cart', cartSchema);
