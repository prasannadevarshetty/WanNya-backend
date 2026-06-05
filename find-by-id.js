require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('./models/Service');
const ServiceProvider = require('./models/ServiceProvider');
const Location = require('./models/Location');
const Pet = require('./models/Pet');
const Booking = require('./models/Booking');
const Order = require('./models/Order');

async function find() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    const idToFind = '6a1ffaf9e426edb040d2fe46';

    const booking = await Booking.findById(idToFind).populate('service');
    if (booking) {
      console.log('Found in Bookings collection!');
      console.log(JSON.stringify(booking, null, 2));
    } else {
      console.log('Not found in Bookings collection.');
    }

    const order = await Order.findById(idToFind);
    if (order) {
      console.log('Found in Orders collection!');
      console.log(JSON.stringify(order, null, 2));
    } else {
      console.log('Not found in Orders collection.');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

find();
