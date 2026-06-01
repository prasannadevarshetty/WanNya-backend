require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('./models/Service');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
    const total = await Service.countDocuments({});
    const active = await Service.countDocuments({ isActive: true });
    const inactive = await Service.countDocuments({ isActive: false });
    const missing = await Service.countDocuments({ isActive: { $exists: false } });
    console.log({ total, active, inactive, missing });
    
    // Print first 5 services to see their fields
    const services = await Service.find({}).limit(5);
    console.log('Sample services:', JSON.stringify(services, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
