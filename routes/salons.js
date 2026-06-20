const express = require('express');
const router = express.Router();

const Salon = require('../models/Salon');

// GET ALL SALON SERVICES
router.get('/', async (req, res) => {
  try {
    const salons = await Salon.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: salons.length,
      data: salons
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salon services',
      error: error.message
    });
  }
});

// GET SINGLE SALON SERVICE
router.get('/:id', async (req, res) => {
  try {
    const salon = await Salon.findById(req.params.id);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon service not found'
      });
    }

    res.json({
      success: true,
      data: salon
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salon service',
      error: error.message
    });
  }
});

module.exports = router;