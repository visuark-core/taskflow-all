// controllers/authController.js
const { User, Company, sequelize } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const tenantManager = require('../services/tenantManager');
const slugify = require('../utils/slugify');
const ensurePrimarySchema = require('../utils/ensurePrimarySchema');

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

async function findUserByEmail(email) {
  const normalized = normalizeEmail(email);
  const user = await User.findOne({ where: { email: normalized } });
  if (user) return user;
  return User.findOne({
    where: sequelize.where(sequelize.fn('lower', sequelize.col('email')), '=', normalized)
  });
}

// Register user (the company field is a new company NAME to be created)
exports.register = asyncHandler(async (req, res, next) => {
  await ensurePrimarySchema();
  console.log('Register request body:', req.body);
  const { name, email, password, company, role, department } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const companyName = String(company || '').trim();
  if (!companyName) {
    return next(new ErrorResponse('Company name is required', 400));
  }
  const slug = slugify(companyName);
  if (!slug) {
    return next(new ErrorResponse('Please enter a valid company name', 400));
  }

  if (normalizedEmail === 'admin@visuark.com' && role !== 'admin') {
    return next(new ErrorResponse('The role of admin@visuark.com must be admin', 400));
  }
  if (normalizedEmail === 'ceo@visuark.com' && role !== 'ceo') {
    return next(new ErrorResponse('The role of ceo@visuark.com must be ceo', 400));
  }

  const existing = await Company.count({ where: { slug } });
  const nameTaken = await Company.count({
    where: sequelize.where(sequelize.fn('lower', sequelize.col('name')), '=', companyName.trim().toLowerCase()),
  });
  if (existing + nameTaken > 0) {
    return next(new ErrorResponse('This company name is already taken', 400));
  }

  const companyRow = await Company.create({
    name: companyName,
    slug,
    dbName: `${tenantManager.TENANT_PREFIX}${slug}`,
    status: 'provisioning'
  });

  try {
    await tenantManager.provisionCompany(companyRow);
  } catch (err) {
    console.error('[register] provisioning failed for', slug, ':', err.message);
    await companyRow.destroy();
    return next(new ErrorResponse('Failed to set up your company workspace. Please try again.', 500));
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    company: slug,
    role,
    department
  }).catch(async (err) => {
    console.error('[register] user creation failed, rolling back company:', err.message);
    await companyRow.destroy();
    try {
      await tenantManager.dropTenantSchema(slug);
    } catch (dropErr) {
      console.error('[register] could not drop tenant schema after rollback:', dropErr.message);
    }
    throw err;
  });

  sendTokenResponse(user, 201, res);
});

// Login user
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400));
  }

  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Update last login
  user.lastLogin = Date.now();
  await user.save();

  sendTokenResponse(user, 200, res);
});

// Get current logged in user
exports.getMe = asyncHandler(async (req, res, next) => {
  const userJson = req.user.toJSON();
  let teams = [];
  if (req.tenant) {
    const { Team, TeamMember } = req.tenant.models;
    const memberships = await TeamMember.findAll({ where: { UserId: req.user.id } });
    const teamIds = memberships.map((m) => m.TeamId);
    if (teamIds.length > 0) {
      teams = await Team.findAll({ where: { id: teamIds } });
    }
  }

  res.status(200).json({
    success: true,
    data: { ...userJson, teams }
  });
});

// Update user details
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
    preferences: req.body.preferences
  };

  const user = await User.findByPk(req.user.id);
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  await user.update(fieldsToUpdate);

  res.status(200).json({
    success: true,
    data: user
  });
});

// Update password
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.user.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Password is incorrect', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// Logout user
exports.logout = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    data: {}
  });
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  const { id, name, email, role, company, department, avatar } = user.toJSON();

  res
    .status(statusCode)
    .json({
      success: true,
      token,
      user: {
        id,
        name,
        email,
        role,
        company,
        department,
        avatar
      }
    });
};
