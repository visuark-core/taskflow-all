// middlewares/auth.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const https = require('https');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { User } = require('../models');

// JWKS Cache
let jwksCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Helper to fetch JWKS keys
function fetchJWKS(jwksUrl) {
  if (jwksCache && (Date.now() - cacheTimestamp < CACHE_TTL)) {
    return Promise.resolve(jwksCache);
  }

  return new Promise((resolve, reject) => {
    https.get(jwksUrl, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.keys && Array.isArray(json.keys)) {
            jwksCache = json.keys;
            cacheTimestamp = Date.now();
            resolve(jwksCache);
          } else {
            reject(new Error('Invalid JWKS structure'));
          }
        } catch (e) {
          reject(new Error('Failed to parse JWKS JSON'));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Helper to verify Supabase JWT using JWKS
async function verifySupabaseToken(token) {
  const jwksUrl = process.env.SUPABASE_JWKS_URL;
  if (!jwksUrl) {
    throw new Error('SUPABASE_JWKS_URL is not configured');
  }

  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.header || !decoded.header.kid) {
    throw new Error('Invalid token format or missing kid');
  }

  const keys = await fetchJWKS(jwksUrl);
  const keyObj = keys.find(k => k.kid === decoded.header.kid);
  if (!keyObj) {
    throw new Error('Signing key not found in JWKS');
  }

  // Convert JWK to public key object using Node.js crypto module
  const publicKey = crypto.createPublicKey({
    format: 'jwk',
    key: keyObj
  });

  // Verify the JWT signature using the public key
  return jwt.verify(token, publicKey, { algorithms: [decoded.header.alg || 'ES256'] });
}

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
    let decoded;
    let isSupabaseToken = false;

    // Detect if it is a Supabase token (which typically has a kid key ID in the header)
    try {
      const decodedUnverified = jwt.decode(token, { complete: true });
      if (decodedUnverified && decodedUnverified.header && decodedUnverified.header.kid) {
        decoded = await verifySupabaseToken(token);
        isSupabaseToken = true;
      }
    } catch (e) {
      console.warn('Token decoded check as Supabase token failed:', e.message);
    }

    // If it was not verified as Supabase token, verify with local JWT_SECRET
    if (!decoded) {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    }

    // Find user by email (for Supabase tokens) or by primary key (for local tokens)
    let user;
    if (isSupabaseToken && decoded.email) {
      user = await User.findOne({ where: { email: decoded.email } });
    } else {
      user = await User.findByPk(decoded.id);
    }

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
