const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema({
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
    default: 'clinic'
  },
  locationEn: String,
  locationJa: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Clinic', clinicSchema);