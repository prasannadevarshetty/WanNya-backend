const express = require('express');
const router = express.Router();

const Booking = require('../models/Booking');
const Service = require('../models/Service');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

const allowedCategories = ['grooming', 'hotel', 'clinic'];

// CREATE BOOKING
router.post('/', async (req, res) => {
  try {
    const service = await Service.findById(req.body.service);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    if (!allowedCategories.includes(service.category)) {
      return res.status(400).json({
        success: false,
        message: 'Only grooming, hotel, and clinic services can be booked'
      });
    }

    const booking = await Booking.create({
      user: req.user._id,
      service: req.body.service,
      pet: req.body.pet,
      location: req.body.location,
      bookingDate: req.body.bookingDate,
      bookingTime: req.body.bookingTime,
      notes: req.body.notes,
      totalAmount: service.price
    });

    await booking.populate('service');

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
    const allowedStatus = [
      'pending',
      'confirmed',
      'completed',
      'cancelled'
    ];

    if (!allowedStatus.includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking status'
      });
    }

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
    )
      .populate('service')
      .populate('location')
      .populate('pet');

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
    )
      .populate('service')
      .populate('location')
      .populate('pet');

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