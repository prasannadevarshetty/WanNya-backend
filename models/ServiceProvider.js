const mongoose = require('mongoose');

const serviceProviderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  businessName: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Business description is required'],
    trim: true
  },
  categories: [{
    type: String,
    enum: ['grooming', 'walking', 'training', 'veterinary', 'boarding', 'daycare', 'sitting'],
    required: true
  }],
  contactInfo: {
    phone: {
      type: String,
      required: [true, 'Phone number is required']
    },
    email: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true
    },
    website: String,
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String
    }
  },
  location: {
    address: {
      type: String,
      required: [true, 'Address is required']
    },
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
    country: {
      type: String,
      required: [true, 'Country is required']
    },
    zip: {
      type: String,
      required: [true, 'ZIP code is required']
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  services: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    duration: Number, // in minutes
    price: Number,
    pricingType: {
      type: String,
      enum: ['per-session', 'per-hour', 'per-day', 'per-night'],
      default: 'per-session'
    }
  }],
  operatingHours: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true
    },
    isOpen: {
      type: Boolean,
      default: true
    },
    openTime: String,
    closeTime: String
  }],
  images: [{
    type: String
  }],
  logo: {
    type: String
  },
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
  certifications: [{
    name: String,
    issuingOrganization: String,
    issueDate: Date,
    expiryDate: Date,
    certificateUrl: String
  }],
  insurance: {
    hasInsurance: {
      type: Boolean,
      default: false
    },
    insuranceProvider: String,
    policyNumber: String,
    expiryDate: Date
  },
  experience: {
    yearsInBusiness: {
      type: Number,
      min: 0
    },
    background: String,
    specialties: [String]
  },
  serviceArea: {
    radius: {
      type: Number, // in kilometers
      default: 10
    },
    cities: [String]
  },
  pricing: {
    acceptsCash: {
      type: Boolean,
      default: true
    },
    acceptsCard: {
      type: Boolean,
      default: true
    },
    acceptsOnline: {
      type: Boolean,
      default: true
    }
  },
  policies: {
    cancellationPolicy: String,
    whatToBring: [String],
    requirements: [String],
    emergencyContact: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDocuments: [{
    type: String // URLs to uploaded documents
  }],
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
serviceProviderSchema.index({ 'location.city': 1, isActive: 1 });
serviceProviderSchema.index({ categories: 1, isActive: 1 });
serviceProviderSchema.index({ rating: -1 });
serviceProviderSchema.index({ userId: 1 });

// Ensure unique userId
serviceProviderSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('ServiceProvider', serviceProviderSchema);
