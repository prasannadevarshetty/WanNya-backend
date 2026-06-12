const mongoose = require('mongoose');

const slotReservationSchema = new mongoose.Schema({
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

  bookingDate: {
    type: Date,
    required: true
  },

  bookingTime: {
    type: String,
    required: true
  },

  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

slotReservationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.model(
  'SlotReservation',
  slotReservationSchema
);