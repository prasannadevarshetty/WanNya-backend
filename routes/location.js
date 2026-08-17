const express = require('express');
const Location = require('../models/Location');
const { authenticate } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');

const router = express.Router();

// Fields a client must never be able to set directly
const protectedFields = ['user', '_id', 'createdAt', 'updatedAt'];

const sanitizeBody = (body) => {
  const clean = { ...body };

  protectedFields.forEach((field) => {
    delete clean[field];
  });

  return clean;
};

// ADD LOCATION
router.post('/', authenticate, catchAsync(async (req, res) => {
  const {
  latitude,
  longitude
} = req.body;

const location = await Location.create({
  ...sanitizeBody(req.body),
  user: req.user._id,

  coordinates: {
    type: 'Point',
    coordinates: [longitude, latitude]
  }
});

  res.status(201).json({
    message: 'Location added successfully',
    location
  });
}));

// GET MY LOCATIONS
router.get('/my-locations', authenticate, catchAsync(async (req, res) => {
  const locations = await Location.find({ user: req.user._id })
    .sort({ isDefault: -1, createdAt: -1 });

  res.json({
    count: locations.length,
    locations
  });
}));

// UPDATE LOCATION
// UPDATE LOCATION
router.put('/:id', authenticate, catchAsync(async (req, res) => {
  const updateData = sanitizeBody(req.body);

  if (req.body.latitude && req.body.longitude) {
    updateData.coordinates = {
      type: 'Point',
      coordinates: [req.body.longitude, req.body.latitude]
    };
  }

  const location = await Location.findOneAndUpdate(
    {
      _id: req.params.id,
      user: req.user._id
    },
    updateData,
    {
      new: true,
      runValidators: true
    }
  );

  if (!location) {
    return res.status(404).json({
      message: 'Location not found'
    });
  }

  res.json({
    message: 'Location updated successfully',
    location
  });
}));

// DELETE LOCATION
router.delete('/:id', authenticate, catchAsync(async (req, res) => {
  const location = await Location.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id
  });

  if (!location) {
    return res.status(404).json({
      message: 'Location not found'
    });
  }

  res.json({
    message: 'Location deleted successfully'
  });
}));

// SET DEFAULT LOCATION
router.patch('/:id/default', authenticate, catchAsync(async (req, res) => {
  await Location.updateMany(
    { user: req.user._id },
    { isDefault: false }
  );

  const location = await Location.findOneAndUpdate(
    {
      _id: req.params.id,
      user: req.user._id
    },
    {
      isDefault: true
    },
    {
      new: true
    }
  );

  if (!location) {
    return res.status(404).json({
      message: 'Location not found'
    });
  }

  res.json({
    message: 'Default location updated successfully',
    location
  });
}));

// NEARBY LOCATIONS
router.get('/nearby/search', authenticate, catchAsync(async (req, res) => {

  const longitude = Number(req.query.longitude);
  const latitude = Number(req.query.latitude);
  const maxDistance = Number(req.query.maxDistance ?? 5000);

  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return res.status(400).json({
      message: 'Valid latitude and longitude are required'
    });
  }

  if (!Number.isFinite(maxDistance) || maxDistance <= 0) {
    return res.status(400).json({
      message: 'Valid maxDistance is required'
    });
  }

  const locations = await Location.find({
    user: req.user._id,
    coordinates: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: Math.min(maxDistance, 50000)
      }
    }
  });

  res.json({
    count: locations.length,
    locations
  });
}));

// CALCULATE DISTANCE & DELIVERY FEE
router.post('/calculate-distance', authenticate, catchAsync(async (req, res) => {

  const { from, to } = req.body;

  const isCoordinate = (point) =>
    point &&
    Number.isFinite(Number(point.latitude)) &&
    Number.isFinite(Number(point.longitude));

  if (!isCoordinate(from) || !isCoordinate(to)) {
    return res.status(400).json({
      message: 'Valid from and to coordinates are required'
    });
  }

  const toRad = (value) => {
    return (value * Math.PI) / 180;
  };

  const earthRadius = 6371;

  const latDiff =
    toRad(to.latitude - from.latitude);

  const lonDiff =
    toRad(to.longitude - from.longitude);

  const a =
    Math.sin(latDiff / 2) *
      Math.sin(latDiff / 2) +
    Math.cos(toRad(from.latitude)) *
      Math.cos(toRad(to.latitude)) *
      Math.sin(lonDiff / 2) *
      Math.sin(lonDiff / 2);

  const c =
    2 * Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  const distanceKm =
    earthRadius * c;

  let deliveryFee = 300;

  if (distanceKm > 5) {
    deliveryFee = 500;
  }

  if (distanceKm > 10) {
    deliveryFee = 800;
  }

  if (distanceKm > 20) {
    deliveryFee = 1200;
  }

  res.json({
    distanceKm:
      Number(distanceKm.toFixed(2)),
    deliveryFee
  });
}));

// GOOGLE PLACE SEARCH
router.get('/google/search', authenticate, catchAsync(async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({
      message: 'Search query is required'
    });
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
  );

  const data = await response.json();

  res.json({
    success: true,
    results: data.results
  });
}));

// GOOGLE REVERSE GEOCODE
router.get('/google/reverse', authenticate, catchAsync(async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({
      message: 'Valid latitude and longitude are required'
    });
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`
  );

  const data = await response.json();

  res.json({
    success: true,
    result: data.results?.[0] || null
  });
}));

module.exports = router;