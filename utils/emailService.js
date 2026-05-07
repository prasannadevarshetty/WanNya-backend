const SibApiV3Sdk = require('sib-api-v3-sdk');

const client = SibApiV3Sdk.ApiClient.instance;

const apiKey = client.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const sendOtpEmail = async (email, otp) => {
  try {

    await tranEmailApi.sendTransacEmail({
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: 'WanNya',
      },

      to: [
        {
          email,
        },
      ],

      subject: 'Your WanNya OTP',

      htmlContent: `
        <div style="font-family: Arial; text-align:center;">
          <h2>Your OTP Code</h2>

          <h1 style="letter-spacing:4px;">
            ${otp}
          </h1>

          <p>This OTP is valid for 5 minutes.</p>
        </div>
      `,
    });

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