const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    trim: true
  },
  subCategory: {
    type: String,
    trim: true
  },
  petType: {
    type: String,
    required: true,
    trim: true
  },
  nameJa: {
    type: String,
    required: true,
    trim: true
  },
  nameEn: {
    type: String,
    trim: true,
    default: ''
  },
  descriptionJa: {
    type: String,
    default: '',
    trim: true
  },
  descriptionEn: {
    type: String,
    default: '',
    trim: true
  },
  price: {
    type: Number,
    default: null
  },
  productLink: {
    type: String,
    default: '',
    trim: true
  },
  image: {
    type: String,
    default: '',
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

productSchema.index({ petType: 1, category: 1, isActive: 1 });
productSchema.index({ nameJa: 'text', nameEn: 'text', descriptionJa: 'text', descriptionEn: 'text' });
productSchema.index({ price: 1 });

module.exports = mongoose.model('Product', productSchema);