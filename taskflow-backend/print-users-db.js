const { User } = require('./models');
const sequelize = require('./config/db');

async function check() {
  try {
    await sequelize.authenticate();
    const admin = await User.findOne({ where: { email: 'admin@visuark.com' } });
    const ceo = await User.findOne({ where: { email: 'ceo@visuark.com' } });

    console.log('--- ADMIN@VISUARK.COM ---');
    console.log(admin ? admin.toJSON() : 'Not found');

    console.log('--- CEO@VISUARK.COM ---');
    console.log(ceo ? ceo.toJSON() : 'Not found');
    
    process.exit(0);
  } catch (err) {
    console.error('Error querying users:', err);
    process.exit(1);
  }
}

check();
