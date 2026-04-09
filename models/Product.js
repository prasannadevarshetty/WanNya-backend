const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true
  },
  petType: {
    type: String,
    enum: ['dog', 'cat', 'both'],
    required: [true, 'Pet type is required']
  },
  gender: {
    type: String,
    enum: ['M', 'F', 'both'],
    default: 'both'
  },
  category: {
    type: String,
    enum: ['foods', 'toys', 'supplements', 'accessories', 'grooming'],
    required: [true, 'Product category is required']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  originalPrice: {
    type: Number,
    min: [0, 'Original price cannot be negative']
  },
  images: [{
    type: String,
    required: true
  }],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  numReviews: {
    type: Number,
    default: 0
  },
  inStock: {
    type: Boolean,
    default: true
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  brand: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  features: [{
    type: String,
    trim: true
  }],
  ingredients: [{
    type: String,
    trim: true
  }],
  nutritionalInfo: {
    protein: String,
    fat: String,
    fiber: String,
    moisture: String
  },
  ageRange: {
    min: Number,
    max: Number
  },
  sizeRange: {
    values: [{
      type: String,
      enum: ['small', 'medium', 'large', 'giant']
    }]
  },
  allergyInfo: {
    isGrainFree: Boolean,
    isHypoallergenic: Boolean,
    commonAllergens: [String]
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

// Index for search and filtering
productSchema.index({ petType: 1, category: 1, isActive: 1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });

module.exports = mongoose.model('Product', productSchema);
