const mongoose = require('mongoose');

const hotelBookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },

  pet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    required: true
  },

  checkInDate: {
    type: Date,
    required: true
  },

  checkOutDate: {
    type: Date,
    required: true
  },

  checkInTime: {
    type: String,
    required: true
  },

  numberOfDays: {
    type: Number,
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

module.exports = mongoose.model('HotelBooking', hotelBookingSchema);