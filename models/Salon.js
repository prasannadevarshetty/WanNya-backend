const mongoose = require('mongoose');

const salonSchema = new mongoose.Schema({
  nameEn: String,
  nameJa: String,
  descriptionEn: String,
  descriptionJa: String,
  price: Number,
  duration: String,
  image: String,
  petSize: String,
  locationEn: String,
  locationJa: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Salon', salonSchema);