const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOtpEmail = async (email, otp) => {
  try {
    const data = await resend.emails.send({
      from: "WanNya <onboarding@resend.dev>",
      to: email,
      subject: "Your WanNya OTP",
      html: `
        <div style="font-family: Arial; text-align:center;">
          <h2>Your OTP Code</h2>
          <h1 style="letter-spacing:4px;">${otp}</h1>
          <p>This OTP is valid for 5 minutes.</p>
        </div>
      `,
    });

    console.log("✅ OTP sent:", data);
    return true;
  } catch (err) {
    console.error("❌ Email error:", err);
    return false;
  }
};

module.exports = { sendOtpEmail };