const { dayRange } = require('./dateUtils');

// Seats bookable per service, per time slot.
const SLOT_CAPACITY = 4;

// Active bookings for a service on a given day, optionally for a single slot.
const buildBookingFilter = ({ serviceField, serviceId, date, bookingTime }) => {
  const filter = {
    [serviceField]: serviceId,
    bookingDate: dayRange(date),
    status: { $ne: 'cancelled' }
  };

  if (bookingTime) {
    filter.bookingTime = bookingTime;
  }

  return filter;
};

const countBookedSeats = (Model, options) =>
  Model.countDocuments(buildBookingFilter(options));

const findDayBookings = (Model, options) =>
  Model.find(buildBookingFilter(options));

// Booked seat count keyed by slot time.
const buildSlotMap = (bookings) =>
  bookings.reduce((slotMap, booking) => {
    slotMap[booking.bookingTime] = (slotMap[booking.bookingTime] || 0) + 1;
    return slotMap;
  }, {});

const buildSlotAvailability = (slotMap, capacity = SLOT_CAPACITY) =>
  Object.keys(slotMap).map((time) => {
    const bookedSeats = slotMap[time];
    const availableSeats = Math.max(capacity - bookedSeats, 0);

    let status = 'available';
    let symbol = 'circle';
    let displaySymbol = '○';

    if (availableSeats === 0) {
      status = 'booked';
      symbol = 'cross';
      displaySymbol = '×';
    } else if (availableSeats < capacity) {
      status = 'few_left';
      symbol = 'triangle';
      displaySymbol = '△';
    }

    return {
      time,
      status,
      symbol,
      displaySymbol,
      totalSeats: capacity,
      bookedSeats,
      availableSeats
    };
  });

module.exports = {
  SLOT_CAPACITY,
  countBookedSeats,
  findDayBookings,
  buildSlotMap,
  buildSlotAvailability
};
