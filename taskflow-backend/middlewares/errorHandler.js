// middlewares/errorHandler.js
const ErrorResponse = require('../utils/errorResponse');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  console.error('Error:', err.message);

  // Sequelize Unique Constraint error (similar to Mongoose duplicate key)
  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = err.errors.map(e => e.message).join(', ');
    error = new ErrorResponse(message, 400);
  }

  // Sequelize Validation error
  if (err.name === 'SequelizeValidationError') {
    const message = err.errors.map(e => e.message).join(', ');
    error = new ErrorResponse(message, 400);
  }

  res.status(err.statusCode || error.statusCode || 500).json({
    success: false,
    error: error.message || err.message || 'Server Error'
  });
};

module.exports = errorHandler;
