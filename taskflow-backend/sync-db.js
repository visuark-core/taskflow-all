const sequelize = require('./config/db');
require('./models'); // imports all models and associations

async function sync() {
  try {
    console.log('Syncing database schema (alter: true)...');
    await sequelize.sync({ alter: true });
    console.log('Database synced successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error syncing database:', error);
    process.exit(1);
  }
}

sync();
