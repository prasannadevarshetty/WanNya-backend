const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
  nameEn: String,
  nameJa: String,
  descriptionEn: String,
  descriptionJa: String,
  price: Number,
  duration: String,
  rating: {
    type: Number,
    default: 0
  },
  image: String,
  category: {
    type: String,
    default: 'hotel'
  },
  petSize: String,
  locationEn: String,
  locationJa: String,
  checkIn: String,
  checkOut: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Hotel', hotelSchema);