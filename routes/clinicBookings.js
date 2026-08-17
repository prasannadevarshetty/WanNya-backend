const express = require('express');
const router = express.Router();

const ClinicBooking = require('../models/ClinicBooking');
const Clinic = require('../models/Clinic');
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

// CREATE CLINIC BOOKING
router.post('/', async (req, res) => {
  try {
    const clinic = await Clinic.findById(req.body.clinic);

    if (!clinic) {
      return sendError(res, 404, 'Clinic service not found');
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

    const bookedSeats = await countBookedSeats(ClinicBooking, {
      serviceField: 'clinic',
      serviceId: req.body.clinic,
      date: bookingDate,
      bookingTime: req.body.bookingTime
    });

    if (SLOT_CAPACITY - bookedSeats <= 0) {
      return sendError(res, 400, 'This slot is no longer available. Please select another slot.');
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

    sendSuccess(res, {
      message: 'Clinic booking created successfully',
      booking
    }, 201);

  } catch (error) {
    sendError(res, 400, 'Failed to create clinic booking', error);
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

    sendSuccess(res, {
      count: bookings.length,
      bookings
    });

  } catch (error) {
    sendError(res, 500, 'Failed to fetch clinic bookings', error);
  }
});

// GET CLINIC SLOT AVAILABILITY
router.get('/availability', async (req, res) => {
  try {
    const { clinic, date } = req.query;

    if (!clinic || !date) {
      return sendError(res, 400, 'Clinic and date are required');
    }

    const clinicData = await Clinic.findById(clinic);

    if (!clinicData) {
      return sendError(res, 404, 'Clinic service not found');
    }

    const bookingDate = parseDate(date);

    if (!bookingDate) {
      return sendError(res, 400, 'Invalid date');
    }

    const bookings = await findDayBookings(ClinicBooking, {
      serviceField: 'clinic',
      serviceId: clinic,
      date: bookingDate
    });

    const slotMap = buildSlotMap(bookings);

    sendSuccess(res, {
      slotCapacity: SLOT_CAPACITY,
      duration: clinicData.duration,
      bookedSlots: slotMap,
      slotAvailability: buildSlotAvailability(slotMap)
    });

  } catch (error) {
    sendError(res, 500, 'Failed to fetch slot availability', error);
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
      return sendError(res, 404, 'Clinic booking not found');
    }

    if (booking.status === 'cancelled') {
      return sendError(res, 400, 'Booking is already cancelled');
    }

    if (booking.status === 'completed') {
      return sendError(res, 400, 'Completed booking cannot be cancelled');
    }

    booking.status = 'cancelled';
    await booking.save();

    sendSuccess(res, { message: 'Clinic booking cancelled successfully' });

  } catch (error) {
    sendError(res, 500, 'Failed to cancel clinic booking', error);
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
      return sendError(res, 404, 'Clinic booking not found');
    }

    sendSuccess(res, { booking });

  } catch (error) {
    sendError(res, 500, 'Failed to fetch clinic booking', error);
  }
});

module.exports = router;
