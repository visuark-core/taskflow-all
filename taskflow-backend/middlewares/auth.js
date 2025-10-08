// middlewares/auth.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

// Protect routes - verifies JWT and attaches user to req
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header (Bearer token)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // If no token, deny access
  if (!token) {
    console.log("No token found in request headers");
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Verify token using JWT secret from env variables
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded JWT payload:", decoded);

    // Find user by ID embedded in token payload
    req.user = await User.findById(decoded.id);

    // If user not found, deny access
    if (!req.user) {
      console.log("User not found for ID in token");
      return next(new ErrorResponse('User not found with this token', 401));
    }

    // User found and authenticated - proceed to next middleware
    next();
  } catch (err) {
    console.log("JWT verification error:", err.message);
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
