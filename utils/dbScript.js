require('dotenv').config();

const mongoose = require('mongoose');

// Boilerplate shared by the one-off CLI scripts: connect to MongoDB, run the
// task, then exit with a meaningful status code.
const runWithDatabase = async (task, { quiet = false } = {}) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    if (!quiet) {
      console.log('MongoDB connected');
    }

    await task(mongoose);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

module.exports = { runWithDatabase };
