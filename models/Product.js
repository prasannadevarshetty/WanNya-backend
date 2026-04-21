const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // ─── Bilingual names (scraped data) ───────────────────────────────────────
  nameEn: { type: String, trim: true },
  nameJa: { type: String, trim: true },

  // ─── Legacy / fallback name field ─────────────────────────────────────────
  name: { type: String, trim: true },

  // ─── Bilingual descriptions ───────────────────────────────────────────────
  descriptionEn: { type: String, trim: true },
  descriptionJa: { type: String, trim: true },
  description:   { type: String, trim: true },

  // ─── Pet & category info ──────────────────────────────────────────────────
  petType: {
    type: String,
    // Allow both old enum values ('dog','cat','both') and scraped values ('Dog','Cat')
    trim: true,
    default: 'both'
  },
  gender: {
    type: String,
    default: 'both'
  },
  category:    { type: String, trim: true },
  subCategory: { type: String, trim: true },

  // ─── Pricing ──────────────────────────────────────────────────────────────
  price: {
    type: Number,
    min: [0, 'Price cannot be negative'],
    default: null   // null = not set from scraper; frontend should handle gracefully
  },
  originalPrice: { type: Number, min: 0 },

  // ─── Images ───────────────────────────────────────────────────────────────
  image:  { type: String },          // single image field (scraped data)
  images: [{ type: String }],        // array field (legacy/manual data)

  // ─── Ratings ──────────────────────────────────────────────────────────────
  rating:     { type: Number, default: null, min: 0, max: 5 },
  numReviews: { type: Number, default: 0 },

  // ─── Stock & availability ─────────────────────────────────────────────────
  inStock: { type: Boolean, default: true },
  stock:   { type: Number, default: 0 },

  // ─── Extra meta ───────────────────────────────────────────────────────────
  brand:       { type: String, trim: true },
  productLink: { type: String, trim: true },   // original product URL from scrape
  tags:        [{ type: String, trim: true }],
  features:    [{ type: String, trim: true }],
  ingredients: [{ type: String, trim: true }],

  nutritionalInfo: {
    protein:  String,
    fat:      String,
    fiber:    String,
    moisture: String
  },
  ageRange: { min: Number, max: Number },
  sizeRange: { values: [String] },
  allergyInfo: {
    isGrainFree:      Boolean,
    isHypoallergenic: Boolean,
    commonAllergens:  [String]
  },

  isActive: { type: Boolean, default: true },
  featured: { type: Boolean, default: false }
}, {
  timestamps: true,
  // Allow fields not in schema (e.g. future scraper additions) to pass through
  strict: false
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
productSchema.index({ petType: 1, category: 1, isActive: 1 });
productSchema.index({ nameEn: 'text', nameJa: 'text', name: 'text', descriptionEn: 'text', descriptionJa: 'text', description: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });

module.exports = mongoose.model('Product', productSchema);
