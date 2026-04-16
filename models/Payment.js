const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  last4: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Ensure only one payment is active per user
paymentSchema.pre('save', async function(next) {
  if (this.isActive) {
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { isActive: false }
    );
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
