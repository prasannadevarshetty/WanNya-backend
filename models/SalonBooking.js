const mongoose = require('mongoose');

const salonBookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  salon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salon',
    required: true
  },

  pet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
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

  duration: {
    type: String,
    required: true
  },

  instructions: {
    type: String,
    trim: true
  },

  servicePrice: {
    type: Number,
    required: true
  },

  totalAmount: {
    type: Number,
    required: true
  },

  termsAccepted: {
    type: Boolean,
    required: true
  },

  vaccinationConfirmed: {
    type: Boolean,
    required: true
  },

  status: {
    type: String,
    enum: ['confirmed', 'completed', 'cancelled'],
    default: 'confirmed'
  },

  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SalonBooking', salonBookingSchema);