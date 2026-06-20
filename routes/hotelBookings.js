const express = require('express');
const router = express.Router();

const HotelBooking = require('../models/HotelBooking');
const Hotel = require('../models/Hotel');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// CREATE HOTEL BOOKING
router.post('/', async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.body.hotel);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel service not found'
      });
    }

    if (!req.body.termsAccepted || !req.body.vaccinationConfirmed) {
      return res.status(400).json({
        success: false,
        message: 'Terms and vaccination confirmation are required'
      });
    }

    const checkInDate = new Date(req.body.checkInDate);
    const checkOutDate = new Date(req.body.checkOutDate);

    if (
    isNaN(checkInDate.getTime()) ||
    isNaN(checkOutDate.getTime())
    ) {
    return res.status(400).json({
        success: false,
        message: 'Invalid booking dates'
    });
    }

    if (checkOutDate <= checkInDate) {
    return res.status(400).json({
        success: false,
        message: 'Check-out date must be after check-in date'
    });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Check-in date cannot be in the past'
      });
    }

    const millisecondsPerDay = 1000 * 60 * 60 * 24;

    const numberOfDays = Math.ceil(
    (checkOutDate - checkInDate) / millisecondsPerDay
    );

    const servicePrice = hotel.price * numberOfDays;

    const totalAmount = servicePrice;

    const booking = await HotelBooking.create({
      user: req.user._id,
      hotel: req.body.hotel,
      pet: req.body.pet,
      checkInDate: req.body.checkInDate,
      checkOutDate: req.body.checkOutDate,
      numberOfDays,
      checkInTime: req.body.checkInTime,
      instructions: req.body.instructions,
      servicePrice,
      totalAmount,
      termsAccepted: req.body.termsAccepted,
      vaccinationConfirmed: req.body.vaccinationConfirmed
    });

    await booking.populate('hotel');
    await booking.populate('pet');

    res.status(201).json({
      success: true,
      message: 'Hotel booking created successfully',
      booking
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create hotel booking',
      error: error.message
    });
  }
});

// GET MY HOTEL BOOKINGS
router.get('/', async (req, res) => {
  try {
    const bookings = await HotelBooking.find({
      user: req.user._id
    })
      .populate('hotel')
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
      message: 'Failed to fetch hotel bookings',
      error: error.message
    });
  }
});

// GET SINGLE HOTEL BOOKING
router.get('/:id', async (req, res) => {
  try {
    const booking = await HotelBooking.findOne({
      _id: req.params.id,
      user: req.user._id
    })
      .populate('hotel')
      .populate('pet');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Hotel booking not found'
      });
    }

    res.json({
      success: true,
      booking
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hotel booking',
      error: error.message
    });
  }
});

// CANCEL HOTEL BOOKING
router.patch('/:id/cancel', async (req, res) => {
  try {
    const booking = await HotelBooking.findOneAndUpdate(
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
      .populate('hotel')
      .populate('pet');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Hotel booking not found'
      });
    }

    res.json({
      success: true,
      message: 'Hotel booking cancelled successfully',
      booking
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to cancel hotel booking',
      error: error.message
    });
  }
});


module.exports = router;