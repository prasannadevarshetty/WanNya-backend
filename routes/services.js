const express = require('express');
const Service = require('../models/Service');

const router = express.Router();

// GET ALL SERVICES
router.get('/', async (req, res) => {
  try {
    const services = await Service.find({ isActive: true })
      .sort({ featured: -1, rating: -1, createdAt: -1 });

    res.json({
      success: true,
      count: services.length,
      services
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching services'
    });
  }
});

// ADD SERVICE
router.post('/', async (req, res) => {
  try {
    const service = await Service.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Service added successfully',
      service
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;