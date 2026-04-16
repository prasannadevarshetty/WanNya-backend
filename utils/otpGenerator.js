/**
 * Generate a 6-digit OTP for password reset
 * @returns {string} 6-digit OTP as string
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = {
  generateOTP
};
