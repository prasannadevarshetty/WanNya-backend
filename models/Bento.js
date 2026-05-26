const mongoose = require('mongoose');

const bentoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  nameEn: {
    type: String,
    trim: true
  },
  nameJa: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    default: 0
  },
  image: {
    type: String
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'both'],
    default: 'both'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Bento', bentoSchema);