const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: ['Food', 'Treats', 'Toys', 'Other']
    },
    subCategory: {
      type: String,
      required: true
    },
    petType: {
      type: String,
      required: true,
      enum: ['Dog', 'Cat']
    },
    nameJa: {
      type: String,
      required: true
    },
    nameEn: {
      type: String,
      required: true
    },
    descriptionJa: {
      type: String
    },
    descriptionEn: {
      type: String
    },
    productLink: {
      type: String,
      default: ''
    },
    image: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);