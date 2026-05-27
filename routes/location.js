const express = require('express');
const Location = require('../models/Location');
const { authenticate } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');

const router = express.Router();

// ADD LOCATION
router.post('/', authenticate, catchAsync(async (req, res) => {
  const {
  latitude,
  longitude
} = req.body;

const location = await Location.create({
  user: req.user._id,
  ...req.body,

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
  const updateData = { ...req.body };

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

  const { longitude, latitude, maxDistance = 5000 } = req.query;

  const locations = await Location.find({
    coordinates: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [
            parseFloat(longitude),
            parseFloat(latitude)
          ]
        },
        $maxDistance: parseInt(maxDistance)
      }
    }
  });

  res.json({
    count: locations.length,
    locations
  });
}));

module.exports = router;