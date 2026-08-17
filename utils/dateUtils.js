// Date helpers shared by the booking routes.

const parseDate = (value) => {
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
};

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

// Mongo range filter matching every document on the same calendar day.
const dayRange = (value) => ({
  $gte: startOfDay(value),
  $lte: endOfDay(value)
});

const isBeforeToday = (date) => date < startOfDay(new Date());

module.exports = {
  parseDate,
  startOfDay,
  endOfDay,
  dayRange,
  isBeforeToday
};
