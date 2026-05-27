const express = require('express');
const Location = require('../models/Location');
const { authenticate } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');

const router = express.Router();

// ADD LOCATION
router.post('/', authenticate, catchAsync(async (req, res) => {
  const location = await Location.create({
    user: req.user._id,
    ...req.body
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

module.exports = router;