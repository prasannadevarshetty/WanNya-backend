const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Pet name is required'],
    trim: true
  },
  breed: {
    type: String,
    required: [true, 'Breed is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['dog', 'cat'],
    required: [true, 'Pet type is required']
  },
  gender: {
    type: String,
    enum: ['M', 'F', null],
    default: null
  },
  dob: {
    type: Date,
    required: true
  },
  allergies: [{
    type: String,
    trim: true
  }],
  sensitivities: [{
    type: String,
    trim: true
  }],
  photo: {
    type: String,
    default: null
  },
  weight: {
    type: Number,
    min: 0
  },
  microchipId: String,
  vetInfo: {
    name: String,
    phone: String,
    clinic: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
petSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Pet', petSchema);
