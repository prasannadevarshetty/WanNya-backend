const express = require('express');
const router = express.Router();

const Booking = require('../models/Booking');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// CREATE BOOKING
router.post('/', async (req, res) => {
  try {
    const booking = await Booking.create({
      ...req.body,
      user: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create booking',
      error: error.message
    });
  }
});

// GET MY BOOKINGS
router.get('/', async (req, res) => {
  try {
    const bookings = await Booking.find({
      user: req.user._id
    })
      .populate('service')
      .populate('location')
      .populate('pet')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bookings.length,
      bookings
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message
    });
  }
});

// UPDATE BOOKING STATUS
router.patch('/:id/status', async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id
      },
      {
        status: req.body.status
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      booking
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update booking status',
      error: error.message
    });
  }
});

// CANCEL BOOKING
router.patch('/:id/cancel', async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id
      },
      {
        status: 'cancelled'
      },
      {
        new: true
      }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message
    });
  }
});

module.exports = router;