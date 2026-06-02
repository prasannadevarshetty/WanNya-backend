const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Service name is required'],
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

  description: {
    type: String,
    required: [true, 'Service description is required'],
    trim: true
  },

  descriptionEn: {
    type: String,
    trim: true
  },

  descriptionJa: {
    type: String,
    trim: true
  },

  category: {
  type: String,
  enum: [
    'grooming',
    'hotel',
    'clinic'
  ],
  required: [true, 'Service category is required']
},

  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceProvider'
  },

  petType: {
    type: String,
    enum: ['dog', 'cat', 'both'],
    required: [true, 'Pet type is required']
  },

  duration: {
  type: String,
  trim: true
},

durationText: {
  type: String,
  trim: true
},

  price: {
    type: Number,
    required: [true, 'Service price is required'],
    min: 0
  },

  pricingType: {
    type: String,
    enum: ['per-session', 'per-hour', 'per-day', 'per-night'],
    default: 'per-session'
  },

  image: {
    type: String,
    trim: true
  },

  images: [{
    type: String
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

  checkIn: {
    type: String,
    trim: true
  },

  checkOut: {
    type: String,
    trim: true
  },

  location: {
    address: String,
    addressEn: String,
    addressJa: String,
    city: String,
    state: String,
    country: String,
    zip: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    isMobile: {
      type: Boolean,
      default: false
    }
  },

  availability: [{
    day: {
      type: String,
      enum: [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday'
      ]
    },
    startTime: String,
    endTime: String,
    isAvailable: {
      type: Boolean,
      default: true
    }
  }],

  services: [{
    name: String,
    description: String,
    included: Boolean,
    additionalPrice: Number
  }],

  requirements: [{
    type: String,
    trim: true
  }],

  whatToBring: [{
    type: String,
    trim: true
  }],

  cancellationPolicy: {
    type: String,
    trim: true
  },

  tags: [{
    type: String,
    trim: true
  }],

  isActive: {
    type: Boolean,
    default: true
  },

  featured: {
    type: Boolean,
    default: false
  },

  maxPetSize: {
    type: String,
    enum: ['small', 'medium', 'large', 'giant', 'any'],
    default: 'any'
  },

  maxPets: {
    type: Number,
    default: 1,
    min: 1
  }

}, {
  timestamps: true
});

// Indexes
serviceSchema.index({ category: 1, petType: 1, isActive: 1 });
serviceSchema.index({ 'location.city': 1 });
serviceSchema.index({ price: 1 });
serviceSchema.index({ rating: -1 });

module.exports = mongoose.model('Service', serviceSchema);