const sequelize = require('./config/db');

async function migrate() {
  console.log('Starting role migration to database...');
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // 1. Add 'chief_manager' to the Sequelize-created ENUM type
    console.log('Altering ENUM type enum_Users_role...');
    await sequelize.query(`
      ALTER TYPE "enum_Users_role" ADD VALUE IF NOT EXISTS 'chief_manager';
    `);
    console.log('ENUM altered successfully.');

    // 2. Update existing manager accounts to chief_manager
    console.log('Updating users with role manager to chief_manager...');
    const [updateResult] = await sequelize.query(`
      UPDATE "Users" 
      SET role = 'chief_manager' 
      WHERE role = 'manager';
    `);
    console.log('Update completed.');

    // 3. Verify
    const [users] = await sequelize.query(`
      SELECT id, name, email, role FROM "Users" WHERE role IN ('manager', 'chief_manager');
    `);
    console.log('\nUsers with manager/chief_manager roles:');
    users.forEach(u => {
      console.log(`ID: ${u.id} | Name: ${u.name} | Email: ${u.email} | Role: ${u.role}`);
    });

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
