// middlewares/auth.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { User } = require('../models');

// Protect routes - verifies JWT and attaches user to req
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // If no token, deny access
  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Verify token with local JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by primary key
    const user = await User.findByPk(decoded.id);

    // If user not found, deny access
    if (!user) {
      return next(new ErrorResponse('User not found with this token', 401));
    }

    // User found and authenticated - proceed to next middleware
    req.user = user;
    next();
  } catch (err) {
    console.error('Authentication verification error:', err.message);
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
});

// Authorize middleware - restricts access by roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Make sure req.user exists and has a role
    if (!req.user || !req.user.role) {
      return next(new ErrorResponse('User role not found', 403));
    }

    // Check if user role is in allowed roles
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role '${req.user.role}' is not authorized to access this route`,
          403
        )
      );
    }

    // Role authorized - proceed
    next();
  };
};
