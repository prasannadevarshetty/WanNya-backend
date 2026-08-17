const express = require('express');
const router = express.Router();

const HotelBooking = require('../models/HotelBooking');
const Hotel = require('../models/Hotel');
const { authenticate } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { parseDate, isBeforeToday } = require('../utils/dateUtils');

router.use(authenticate);

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

// CREATE HOTEL BOOKING
router.post('/', async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.body.hotel);

    if (!hotel) {
      return sendError(res, 404, 'Hotel service not found');
    }

    if (!req.body.termsAccepted || !req.body.vaccinationConfirmed) {
      return sendError(res, 400, 'Terms and vaccination confirmation are required');
    }

    const checkInDate = parseDate(req.body.checkInDate);
    const checkOutDate = parseDate(req.body.checkOutDate);

    if (!checkInDate || !checkOutDate) {
      return sendError(res, 400, 'Invalid booking dates');
    }

    if (checkOutDate <= checkInDate) {
      return sendError(res, 400, 'Check-out date must be after check-in date');
    }

    if (isBeforeToday(checkInDate)) {
      return sendError(res, 400, 'Check-in date cannot be in the past');
    }

    const numberOfDays = Math.ceil(
      (checkOutDate - checkInDate) / MILLISECONDS_PER_DAY
    );

    const servicePrice = hotel.price * numberOfDays;

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
      totalAmount: servicePrice,
      termsAccepted: req.body.termsAccepted,
      vaccinationConfirmed: req.body.vaccinationConfirmed
    });

    await booking.populate('hotel');
    await booking.populate('pet');

    sendSuccess(res, {
      message: 'Hotel booking created successfully',
      booking
    }, 201);

  } catch (error) {
    sendError(res, 400, 'Failed to create hotel booking', error);
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

    sendSuccess(res, {
      count: bookings.length,
      bookings
    });

  } catch (error) {
    sendError(res, 500, 'Failed to fetch hotel bookings', error);
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
      return sendError(res, 404, 'Hotel booking not found');
    }

    sendSuccess(res, { booking });

  } catch (error) {
    sendError(res, 500, 'Failed to fetch hotel booking', error);
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
      return sendError(res, 404, 'Hotel booking not found');
    }

    sendSuccess(res, {
      message: 'Hotel booking cancelled successfully',
      booking
    });

  } catch (error) {
    sendError(res, 400, 'Failed to cancel hotel booking', error);
  }
});

module.exports = router;
