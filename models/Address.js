const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  label: {
    type: String,
    required: [true, 'Address label is required'],
    trim: true
  },
  street: {
    type: String,
    required: [true, 'Street address is required'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true
  },
  zip: {
    type: String,
    required: [true, 'ZIP code is required'],
    trim: true
  },
  coordinates: {
    lat: Number,
    lng: Number
  },
  isActive: {
    type: Boolean,
    default: false
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Ensure only one address is active per user
addressSchema.pre('save', async function(next) {
  if (this.isActive) {
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { isActive: false }
    );
  }
  next();
});

module.exports = mongoose.model('Address', addressSchema);
