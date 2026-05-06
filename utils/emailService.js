const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOtpEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: "Your WanNya OTP",
      html: `
        <div style="font-family: Arial; text-align:center;">
          <h2>Your OTP Code</h2>
          <h1 style="letter-spacing:4px;">${otp}</h1>
          <p>This OTP is valid for 5 minutes.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    console.log("✅ OTP sent:", email);
    return true;

  } catch (err) {
    console.error("❌ Email error:", err);
    return false;
  }
};

module.exports = {
  sendOtpEmail
};