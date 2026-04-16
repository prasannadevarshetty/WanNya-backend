require('dotenv').config();
const nodemailer = require('nodemailer');
console.log("Using Host:", process.env.EMAIL_HOST);
console.log("Using User:", process.env.EMAIL_USER);

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: Number(process.env.EMAIL_PORT) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Fix for SSL certificate issues
  tls: {
    rejectUnauthorized: false,
  },
  // Additional connection options
  connectionTimeout: 60000,
  greetingTimeout: 30000,
  socketTimeout: 60000,
});

transporter.verify(function (error, success) {
  if (error) {
    console.log("SMTP VERIFICATION ERROR:", error.message);
    if (error.response) console.log("SMTP RESPONSE:", error.response);
  } else {
    console.log("SMTP SUCCESS: Server is perfectly ready to take our messages!");
  }
  process.exit(0);
});
