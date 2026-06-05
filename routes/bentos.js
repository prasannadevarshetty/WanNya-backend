const express = require('express');
const router = express.Router();
const Bento = require('../models/Bento');

// GET all bentos
router.get('/', async (req, res) => {
  try {
    const bentos = await Bento.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: bentos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bentos',
      error: error.message
    });
  }
});

// GET bento by ID
router.get('/:id', async (req, res) => {
  try {
    const bento = await Bento.findById(req.params.id);
    if (!bento) {
      return res.status(404).json({
        success: false,
        message: 'Bento not found'
      });
    }
    res.json({
      success: true,
      data: bento
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bento',
      error: error.message
    });
  }
});

module.exports = router;