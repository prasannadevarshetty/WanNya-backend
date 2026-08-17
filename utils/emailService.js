const SibApiV3Sdk = require('sib-api-v3-sdk');
const { info, error: logErrorMessage } = require('./logger');

const client = SibApiV3Sdk.ApiClient.instance;

const apiKey = client.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const sendOtpEmail = async (email, otp) => {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not configured, cannot send OTP email');
  }

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

    info('OTP email sent', { email });
    return true;

  } catch (err) {
    // Reject instead of returning false: callers must be able to react to a
    // failed delivery (e.g. by invalidating the OTP they just stored).
    logErrorMessage('OTP email failed', {
      email,
      error: err.message,
      status: err.status || err.response?.status
    });

    throw err;
  }
};

module.exports = {
  sendOtpEmail,
};