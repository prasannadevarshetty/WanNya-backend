require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('./models/Service');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
    const services = await Service.find({});
    console.log('Total services:', services.length);
    services.forEach(s => {
      console.log(`ID: ${s._id}, Name: ${s.name}, Category: ${s.category}, Price: ${s.price}, Duration: ${s.duration}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
