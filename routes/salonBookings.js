const express = require('express');
const router = express.Router();

const SalonBooking = require('../models/SalonBooking');
const Salon = require('../models/Salon');
const { authenticate } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { parseDate, isBeforeToday } = require('../utils/dateUtils');
const {
  SLOT_CAPACITY,
  countBookedSeats,
  findDayBookings,
  buildSlotMap,
  buildSlotAvailability
} = require('../utils/slotAvailability');

router.use(authenticate);

const CANCELLATION_WINDOW_MS = 4 * 60 * 60 * 1000;

// CREATE SALON BOOKING
router.post('/', async (req, res) => {
  try {
    const salon = await Salon.findById(req.body.salon);

    if (!salon) {
      return sendError(res, 404, 'Salon service not found');
    }

    if (!req.body.termsAccepted || !req.body.vaccinationConfirmed) {
      return sendError(res, 400, 'Terms and vaccination confirmation are required');
    }

    const bookingDate = parseDate(req.body.bookingDate);

    if (!bookingDate) {
      return sendError(res, 400, 'Invalid booking date');
    }

    if (isBeforeToday(bookingDate)) {
      return sendError(res, 400, 'Booking date cannot be in the past');
    }

    const bookedSeats = await countBookedSeats(SalonBooking, {
      serviceField: 'salon',
      serviceId: req.body.salon,
      date: bookingDate,
      bookingTime: req.body.bookingTime
    });

    if (SLOT_CAPACITY - bookedSeats <= 0) {
      return sendError(res, 400, 'This slot is no longer available. Please select another slot.');
    }

    const booking = await SalonBooking.create({
      user: req.user._id,
      salon: req.body.salon,
      pet: req.body.pet,
      bookingDate: req.body.bookingDate,
      bookingTime: req.body.bookingTime,
      duration: salon.duration,
      instructions: req.body.instructions,
      servicePrice: salon.price,
      totalAmount: salon.price,
      termsAccepted: req.body.termsAccepted,
      vaccinationConfirmed: req.body.vaccinationConfirmed
    });

    await booking.populate('salon');
    await booking.populate('pet');

    sendSuccess(res, {
      message: 'Salon booking created successfully',
      booking
    }, 201);

  } catch (error) {
    sendError(res, 400, 'Failed to create salon booking', error);
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

    sendSuccess(res, {
      count: bookings.length,
      bookings
    });

  } catch (error) {
    sendError(res, 500, 'Failed to fetch salon bookings', error);
  }
});

// GET SALON SLOT AVAILABILITY
router.get('/availability', async (req, res) => {
  try {
    const { salon, date } = req.query;

    if (!salon || !date) {
      return sendError(res, 400, 'Salon and date are required');
    }

    const salonData = await Salon.findById(salon);

    if (!salonData) {
      return sendError(res, 404, 'Salon service not found');
    }

    const bookingDate = parseDate(date);

    if (!bookingDate) {
      return sendError(res, 400, 'Invalid date');
    }

    const bookings = await findDayBookings(SalonBooking, {
      serviceField: 'salon',
      serviceId: salon,
      date: bookingDate
    });

    const slotMap = buildSlotMap(bookings);

    sendSuccess(res, {
      slotCapacity: SLOT_CAPACITY,
      duration: salonData.duration,
      bookedSlots: slotMap,
      slotAvailability: buildSlotAvailability(slotMap)
    });

  } catch (error) {
    sendError(res, 500, 'Failed to fetch slot availability', error);
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
      return sendError(res, 404, 'Salon booking not found');
    }

    if (booking.status === 'cancelled') {
      return sendError(res, 400, 'Booking is already cancelled');
    }

    if (booking.status === 'completed') {
      return sendError(res, 400, 'Completed booking cannot be cancelled');
    }

    const appointmentDateTime = new Date(booking.bookingDate);
    const [hours, minutes] = booking.bookingTime.split(':');

    appointmentDateTime.setHours(Number(hours), Number(minutes), 0, 0);

    const cancellationDeadline = new Date(appointmentDateTime.getTime() - CANCELLATION_WINDOW_MS);

    if (new Date() >= cancellationDeadline) {
      return sendError(res, 400, 'Booking cannot be cancelled within 4 hours of the appointment');
    }

    booking.status = 'cancelled';
    await booking.save();

    await booking.populate('salon');
    await booking.populate('pet');

    sendSuccess(res, {
      message: 'Salon booking cancelled successfully',
      booking
    });

  } catch (error) {
    sendError(res, 400, 'Failed to cancel salon booking', error);
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
      return sendError(res, 404, 'Salon booking not found');
    }

    sendSuccess(res, { booking });

  } catch (error) {
    sendError(res, 500, 'Failed to fetch salon booking', error);
  }
});

module.exports = router;
