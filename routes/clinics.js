const express = require('express');
const router = express.Router();

const Clinic = require('../models/Clinic');

// GET ALL CLINICS
router.get('/', async (req, res) => {
  try {
    const clinics = await Clinic.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: clinics.length,
      data: clinics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clinics',
      error: error.message
    });
  }
});

// GET SINGLE CLINIC
router.get('/:id', async (req, res) => {
  try {
    const clinic = await Clinic.findById(req.params.id);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    res.json({
      success: true,
      data: clinic
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clinic',
      error: error.message
    });
  }
});

module.exports = router;