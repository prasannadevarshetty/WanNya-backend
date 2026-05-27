const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  label: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home'
  },

  fullName: String,
  phone: String,

  addressLine1: {
    type: String,
    required: true,
    trim: true
  },

  addressLine2: {
    type: String,
    trim: true
  },

  landmark: String,

  city: {
    type: String,
    required: true,
    trim: true
  },

  state: {
    type: String,
    required: true,
    trim: true
  },

  pincode: {
    type: String,
    required: true,
    trim: true
  },

  country: {
    type: String,
    default: 'India'
  },

  latitude: Number,
  longitude: Number,

  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Location', locationSchema);