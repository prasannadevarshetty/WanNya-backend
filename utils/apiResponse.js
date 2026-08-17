// Helpers for the `{ success, ... }` JSON envelope used across the API.

const sendSuccess = (res, payload = {}, statusCode = 200) =>
  res.status(statusCode).json({
    success: true,
    ...payload
  });

const sendError = (res, statusCode, message, error) => {
  const body = {
    success: false,
    message
  };

  if (error) {
    body.error = error.message || String(error);
  }

  return res.status(statusCode).json(body);
};

module.exports = {
  sendSuccess,
  sendError
};
