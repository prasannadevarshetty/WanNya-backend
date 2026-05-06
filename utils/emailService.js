const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,

  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
});

const sendOtpEmail = async (email, otp) => {
  try {

    const mailOptions = {
      from: `"WanNya" <${process.env.BREVO_SENDER_EMAIL}>`,
      to: email,
      subject: "Your WanNya OTP",

      html: `
        <div style="font-family: Arial; text-align:center;">
          <h2>Your OTP Code</h2>

          <h1 style="letter-spacing:4px;">
            ${otp}
          </h1>

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
  sendOtpEmail,
};