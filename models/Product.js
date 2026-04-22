const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Basic fields
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
    trim: true,
    enum: ['dog', 'cat', 'both']
  },
  
  // Bilingual names
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
  name: { type: String, trim: true }, // Legacy fallback

  // Bilingual descriptions
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
  description: { type: String, trim: true }, // Legacy fallback

  // Pricing
  price: {
    type: Number,
    default: null,
    min: [0, 'Price cannot be negative']
  },
  originalPrice: { type: Number, min: 0 },

  // Images
  image: {
    type: String,
    default: '',
    trim: true
  },
  images: [{ type: String }],

  // Product links
  productLink: {
    type: String,
    default: '',
    trim: true
  },

  // Ratings
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  numReviews: { type: Number, default: 0 },

  // Stock & availability
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  inStock: {
    type: Boolean,
    default: true
  },
  stock: {
    type: Number,
    default: 0
  },

  // Additional fields
  gender: {
    type: String,
    enum: ['male', 'female', 'both', null],
    default: null
  },
  brand: {
    type: String,
    trim: true,
    default: ''
  },
  tags: [{ type: String, trim: true }],
  features: [{ type: String, trim: true }],
  ingredients: [{ type: String, trim: true }],

  // Nutritional information
  nutritionalInfo: {
    protein: String,
    fat: String,
    fiber: String,
    moisture: String
  },
  
  // Age and size ranges
  ageRange: { min: Number, max: Number },
  sizeRange: { values: [String] },
  
  // Allergy information
  allergyInfo: {
    isGrainFree: Boolean,
    isHypoallergenic: Boolean,
    commonAllergens: [String]
  }
}, {
  timestamps: true,
  strict: false // Allow fields not in schema
});

// Indexes for performance
productSchema.index({ petType: 1, category: 1, isActive: 1 });
productSchema.index({ nameJa: 'text', nameEn: 'text', name: 'text', descriptionJa: 'text', descriptionEn: 'text', description: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });

module.exports = mongoose.model('Product', productSchema);
