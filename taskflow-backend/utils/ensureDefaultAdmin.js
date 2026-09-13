const sequelize = require('../config/db');

const DEFAULT_ADMIN_EMAIL = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@visuark.com').trim().toLowerCase();
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@12345';

async function ensureDefaultAdmin(UserModel) {
  const User = UserModel || require('../models').User;

  const hasUser = await User.count();
  if (hasUser > 0) {
    const existing = await User.findOne({
      where: sequelize.where(
        sequelize.fn('lower', sequelize.col('email')),
        '=',
        DEFAULT_ADMIN_EMAIL
      )
    });

    if (existing) {
      return { created: false, user: existing };
    }

    return { created: false, user: null };
  }

  const admin = await User.create({
    name: 'TaskFlow Admin',
    email: DEFAULT_ADMIN_EMAIL,
    password: DEFAULT_ADMIN_PASSWORD,
    company: 'visuark',
    role: 'admin',
    department: 'management',
    isActive: true,
  });

  return { created: true, user: admin };
}

module.exports = {
  ensureDefaultAdmin,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
};
