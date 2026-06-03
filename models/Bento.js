const mongoose = require('mongoose');

const bentoSchema = new mongoose.Schema({
  nameEn: {
    type: String,
    required: true,
    trim: true
  },

  nameJa: {
    type: String,
    required: true,
    trim: true
  },

  price: {
    type: Number,
    required: true
  },

  descriptionEn: {
    type: String,
    required: true,
    trim: true
  },

  descriptionJa: {
    type: String,
    required: true,
    trim: true
  },

  rating: {
    type: Number,
    default: 0
  },

  image: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Bento', bentoSchema);