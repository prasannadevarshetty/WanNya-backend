const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },

  pet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet'
  },

  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },

  bookingDate: {
    type: Date,
    required: true
  },

  bookingTime: {
    type: String,
    required: true
  },

  notes: {
    type: String,
    trim: true
  },

  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },

  status: {
    type: String,
    enum: [
      'confirmed',
      'completed',
      'cancelled'
    ],
    default: 'confirmed'
  },

  paymentStatus: {
    type: String,
    enum: [
      'pending',
      'paid',
      'failed',
      'refunded'
    ],
    default: 'pending'
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('Booking', bookingSchema);