// utils/errorResponse.js
class ErrorResponse extends Error {
  constructor(message, statusCode, detail) {
    super(message);
    this.statusCode = statusCode;
    if (detail !== undefined) {
      this.detail = detail;
    }
  }
}

module.exports = ErrorResponse;

