const express = require('express');
const router = express.Router();

const Booking = require('../models/Booking');
const Service = require('../models/Service');
const SlotReservation = require('../models/SlotReservation');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

const allowedCategories = ['grooming', 'hotel', 'clinic'];
const SLOT_CAPACITY = 4;

const getSlotSymbol = (availableSeats) => {
  if (availableSeats <= 0) return 'cross';
  if (availableSeats < SLOT_CAPACITY) return 'triangle';
  return 'circle';
};

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

    const bookingDateParsed = new Date(req.body.bookingDate);
    if (isNaN(bookingDateParsed.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking date'
      });
    }

    const startOfDay = new Date(bookingDateParsed);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(bookingDateParsed);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedSeats = await Booking.countDocuments({
      service: req.body.service,
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
          message: 'This slot is no longer available. Please select another slot and try again.'
        });
      }

      if (availableSeats === 1) {
        const now = new Date();

        const reservation = await SlotReservation.findOne({
          user: req.user._id,
          service: req.body.service,
          bookingDate: {
            $gte: startOfDay,
            $lte: endOfDay
          },
          bookingTime: req.body.bookingTime,
          expiresAt: { $gt: now }
        });

        if (!reservation) {
          return res.status(400).json({
            success: false,
            message: 'Last seat reservation required or expired. Please select the slot again.'
          });
        }
      }

    const booking = await Booking.create({
        user: req.user._id,
        service: req.body.service,
        pet: req.body.pet,
        location: req.body.location,
        bookingDate: req.body.bookingDate,
        bookingTime: req.body.bookingTime,
        notes: req.body.notes,
        totalAmount: service.price,
        status: 'confirmed'
      });

      await booking.populate('service');

      await SlotReservation.deleteOne({
        user: req.user._id,
        service: req.body.service,
        bookingDate: {
          $gte: startOfDay,
          $lte: endOfDay
        },
        bookingTime: req.body.bookingTime
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

// GET SLOT AVAILABILITY
router.get('/availability', async (req, res) => {
  try {
    const { service, date } = req.query;

    if (!service || !date) {
      return res.status(400).json({
        success: false,
        message: 'Service and date are required'
      });
    }

    const serviceData = await Service.findById(service);

    if (!serviceData) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    const bookingDateParsed = new Date(date);
    if (isNaN(bookingDateParsed.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    const startOfDay = new Date(bookingDateParsed);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(bookingDateParsed);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      service,
      bookingDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $ne: 'cancelled' }
    });

    const bookedMap = {};

    bookings.forEach((booking) => {
      bookedMap[booking.bookingTime] =
        (bookedMap[booking.bookingTime] || 0) + 1;
    });

    const generateSlots = () => {
      const slots = [];

      let startHour = 9;
      let startMin = 0;
      let endHour = 18;
      let endMin = 0;

      if (serviceData.checkIn) {
        const parts = serviceData.checkIn.split(':');
        startHour = parseInt(parts[0], 10);
        startMin = parseInt(parts[1], 10);
      }

      if (serviceData.checkOut) {
        const parts = serviceData.checkOut.split(':');
        endHour = parseInt(parts[0], 10);
        endMin = parseInt(parts[1], 10);
      }

      let currentHour = startHour;
      let currentMin = startMin;

      while (
        currentHour < endHour ||
        (currentHour === endHour && currentMin <= endMin)
      ) {
        const time = `${currentHour}:${String(currentMin).padStart(2, '0')}`;
        slots.push(time);

        currentMin += 15;
        if (currentMin >= 60) {
          currentMin = 0;
          currentHour += 1;
        }
      }

      return slots;
    };

    const allSlots = generateSlots();

    const slotAvailability = allSlots.map((time) => {
      const bookedSeats = bookedMap[time] || 0;
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
// Now it returns only fully booked slots
router.get('/occupied', async (req, res) => {
  try {
    const { service, date } = req.query;

    if (!service || !date) {
      return res.status(400).json({
        success: false,
        message: 'Service and date are required'
      });
    }

    const bookingDateParsed = new Date(date);
    if (isNaN(bookingDateParsed.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    const startOfDay = new Date(bookingDateParsed);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(bookingDateParsed);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      service,
      bookingDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $ne: 'cancelled' }
    });

    const slotMap = {};

    bookings.forEach((booking) => {
      slotMap[booking.bookingTime] =
        (slotMap[booking.bookingTime] || 0) + 1;
    });

    const occupiedSlots = Object.keys(slotMap).filter(
      (time) => slotMap[time] >= SLOT_CAPACITY
    );

    res.json({
      success: true,
      occupiedSlots
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch occupied slots',
      error: error.message
    });
  }
});



// RESERVE LAST SEAT FOR 15 MINUTES
router.post('/reserve-last-seat', async (req, res) => {
  try {
    const { service, bookingDate, bookingTime } = req.body;

    if (!service || !bookingDate || !bookingTime) {
      return res.status(400).json({
        success: false,
        message: 'Service, booking date, and booking time are required'
      });
    }

    const bookingDateParsed = new Date(bookingDate);
    if (isNaN(bookingDateParsed.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking date'
      });
    }

    const startOfDay = new Date(bookingDateParsed);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(bookingDateParsed);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedSeats = await Booking.countDocuments({
      service,
      bookingDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      bookingTime,
      status: { $ne: 'cancelled' }
    });

    const availableSeats = SLOT_CAPACITY - bookedSeats;

    if (availableSeats > 1) {
      return res.json({
        success: true,
        reservationRequired: false,
        message: 'Reservation not required. More than one seat is available.'
      });
    }

    if (availableSeats <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This slot is no longer available. Please select another slot and try again.'
      });
    }

    const now = new Date();

    const existingReservation = await SlotReservation.findOne({
      service,
      bookingDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      bookingTime,
      expiresAt: { $gt: now }
    });

    if (existingReservation) {
      if (existingReservation.user.toString() === req.user._id.toString()) {
        return res.json({
          success: true,
          reservationRequired: true,
          message: 'You already have this seat reserved',
          expiresAt: existingReservation.expiresAt
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Last seat is currently reserved by another user'
      });
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const reservation = await SlotReservation.create({
      user: req.user._id,
      service,
      bookingDate,
      bookingTime,
      expiresAt
    });

    res.status(201).json({
      success: true,
      reservationRequired: true,
      message: 'Last seat reserved for 15 minutes',
      reservation,
      expiresAt
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reserve last seat',
      error: error.message
    });
  }
});


// UPDATE BOOKING STATUS
router.patch('/:id/status', async (req, res) => {
  try {
    const allowedStatus = [
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