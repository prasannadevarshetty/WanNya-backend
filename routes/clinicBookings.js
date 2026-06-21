const express = require('express');
const router = express.Router();

const ClinicBooking = require('../models/ClinicBooking');
const Clinic = require('../models/Clinic');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

const SLOT_CAPACITY = 4;

// CREATE CLINIC BOOKING
router.post('/', async (req, res) => {
  try {
    const clinic = await Clinic.findById(req.body.clinic);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic service not found'
      });
    }

    if (!req.body.termsAccepted || !req.body.vaccinationConfirmed) {
      return res.status(400).json({
        success: false,
        message: 'Terms and vaccination confirmation are required'
      });
    }

    const bookingDate = new Date(req.body.bookingDate);

    if (isNaN(bookingDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking date'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Booking date cannot be in the past'
      });
    }

    const startOfDay = new Date(bookingDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(bookingDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedSeats = await ClinicBooking.countDocuments({
      clinic: req.body.clinic,
      bookingDate: { $gte: startOfDay, $lte: endOfDay },
      bookingTime: req.body.bookingTime,
      status: { $ne: 'cancelled' }
    });

    const availableSeats = SLOT_CAPACITY - bookedSeats;

    if (availableSeats <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This slot is no longer available. Please select another slot.'
      });
    }

    const booking = await ClinicBooking.create({
      user: req.user._id,
      clinic: req.body.clinic,
      pet: req.body.pet,
      bookingDate: req.body.bookingDate,
      bookingTime: req.body.bookingTime,
      duration: clinic.duration,
      instructions: req.body.instructions,
      servicePrice: clinic.price,
      totalAmount: clinic.price,
      termsAccepted: req.body.termsAccepted,
      vaccinationConfirmed: req.body.vaccinationConfirmed
    });

    await booking.populate('clinic');
    await booking.populate('pet');

    res.status(201).json({
      success: true,
      message: 'Clinic booking created successfully',
      booking
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create clinic booking',
      error: error.message
    });
  }
});

// GET MY CLINIC BOOKINGS
router.get('/', async (req, res) => {
  try {
    const bookings = await ClinicBooking.find({
      user: req.user._id
    })
      .populate('clinic')
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
      message: 'Failed to fetch clinic bookings',
      error: error.message
    });
  }
});

// GET CLINIC SLOT AVAILABILITY
router.get('/availability', async (req, res) => {
  try {
    const { clinic, date } = req.query;

    if (!clinic || !date) {
      return res.status(400).json({
        success: false,
        message: 'Clinic and date are required'
      });
    }

    const clinicData = await Clinic.findById(clinic);

    if (!clinicData) {
      return res.status(404).json({
        success: false,
        message: 'Clinic service not found'
      });
    }

    const bookingDate = new Date(date);

    if (isNaN(bookingDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date'
      });
    }

    const startOfDay = new Date(bookingDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(bookingDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await ClinicBooking.find({
      clinic,
      bookingDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: 'cancelled' }
    });

    const slotMap = {};

    bookings.forEach((booking) => {
      slotMap[booking.bookingTime] = (slotMap[booking.bookingTime] || 0) + 1;
    });

    const slotAvailability = Object.keys(slotMap).map((time) => {
      const bookedSeats = slotMap[time];
      const availableSeats = Math.max(SLOT_CAPACITY - bookedSeats, 0);

      let status = 'available';
      let symbol = 'circle';
      let displaySymbol = '○';

      if (availableSeats === 0) {
        status = 'booked';
        symbol = 'cross';
        displaySymbol = '×';
      } else if (availableSeats < SLOT_CAPACITY) {
        status = 'few_left';
        symbol = 'triangle';
        displaySymbol = '△';
      }

      return {
        time,
        status,
        symbol,
        displaySymbol,
        totalSeats: SLOT_CAPACITY,
        bookedSeats,
        availableSeats
      };
    });

    res.json({
      success: true,
      slotCapacity: SLOT_CAPACITY,
      duration: clinicData.duration,
      bookedSlots: slotMap,
      slotAvailability
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch slot availability',
      error: error.message
    });
  }
});

// CANCEL CLINIC BOOKING
router.patch('/:id/cancel', async (req, res) => {
  try {
    const booking = await ClinicBooking.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Clinic booking not found'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Completed booking cannot be cancelled'
      });
    }

    booking.status = 'cancelled';
    await booking.save();

    res.json({
      success: true,
      message: 'Clinic booking cancelled successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cancel clinic booking',
      error: error.message
    });
  }
});

// GET SINGLE CLINIC BOOKING
router.get('/:id', async (req, res) => {
  try {
    const booking = await ClinicBooking.findOne({
      _id: req.params.id,
      user: req.user._id
    })
      .populate('clinic')
      .populate('pet');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Clinic booking not found'
      });
    }

    res.json({
      success: true,
      booking
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clinic booking',
      error: error.message
    });
  }
});

module.exports = router;