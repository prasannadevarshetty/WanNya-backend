const express = require('express');
const router = express.Router();

const SalonBooking = require('../models/SalonBooking');
const Salon = require('../models/Salon');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

const SLOT_CAPACITY = 4;

// CREATE SALON BOOKING
router.post('/', async (req, res) => {
  try {
    const salon = await Salon.findById(req.body.salon);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon service not found'
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

    const servicePrice = salon.price;
    const totalAmount = servicePrice;

    const startOfDay = new Date(bookingDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(bookingDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedSeats = await SalonBooking.countDocuments({
    salon: req.body.salon,
    bookingDate: {
        $gte: startOfDay,
        $lte: endOfDay
    },
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

    const booking = await SalonBooking.create({
      user: req.user._id,
      salon: req.body.salon,
      pet: req.body.pet,
      bookingDate: req.body.bookingDate,
      bookingTime: req.body.bookingTime,
      duration: salon.duration,
      instructions: req.body.instructions,
      servicePrice,
      totalAmount,
      termsAccepted: req.body.termsAccepted,
      vaccinationConfirmed: req.body.vaccinationConfirmed
    });

    await booking.populate('salon');
    await booking.populate('pet');

    res.status(201).json({
      success: true,
      message: 'Salon booking created successfully',
      booking
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create salon booking',
      error: error.message
    });
  }
});

// GET MY SALON BOOKINGS
router.get('/', async (req, res) => {
  try {
    const bookings = await SalonBooking.find({
      user: req.user._id
    })
      .populate('salon')
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
      message: 'Failed to fetch salon bookings',
      error: error.message
    });
  }
});

// GET SALON SLOT AVAILABILITY
router.get('/availability', async (req, res) => {
  try {
    const { salon, date } = req.query;

    if (!salon || !date) {
      return res.status(400).json({
        success: false,
        message: 'Salon and date are required'
      });
    }

    const salonData = await Salon.findById(salon);

    if (!salonData) {
      return res.status(404).json({
        success: false,
        message: 'Salon service not found'
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

    const bookings = await SalonBooking.find({
      salon,
      bookingDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
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
    duration: salonData.duration,
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

// CANCEL SALON BOOKING
router.patch('/:id/cancel', async (req, res) => {
  try {
    const booking = await SalonBooking.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Salon booking not found'
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

    const appointmentDateTime = new Date(booking.bookingDate);
    const [hours, minutes] = booking.bookingTime.split(':');

    appointmentDateTime.setHours(Number(hours), Number(minutes), 0, 0);

    const now = new Date();
    const fourHoursBefore = new Date(appointmentDateTime.getTime() - 4 * 60 * 60 * 1000);

    if (now >= fourHoursBefore) {
      return res.status(400).json({
        success: false,
        message: 'Booking cannot be cancelled within 4 hours of the appointment'
      });
    }

    booking.status = 'cancelled';
    await booking.save();

    await booking.populate('salon');
    await booking.populate('pet');

    res.json({
      success: true,
      message: 'Salon booking cancelled successfully',
      booking
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to cancel salon booking',
      error: error.message
    });
  }
});

// GET SINGLE SALON BOOKING
router.get('/:id', async (req, res) => {
  try {
    const booking = await SalonBooking.findOne({
      _id: req.params.id,
      user: req.user._id
    })
      .populate('salon')
      .populate('pet');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Salon booking not found'
      });
    }

    res.json({
      success: true,
      booking
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salon booking',
      error: error.message
    });
  }
});

module.exports = router;