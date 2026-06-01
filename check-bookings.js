require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./models/Booking');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
    const bookings = await Booking.find({}).populate('service');
    console.log('Total bookings:', bookings.length);
    bookings.forEach(b => {
      console.log(`ID: ${b._id}, Service: ${b.service ? b.service.name : 'null'}, Price: ${b.service ? b.service.price : 'N/A'}, totalAmount: ${b.totalAmount}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
