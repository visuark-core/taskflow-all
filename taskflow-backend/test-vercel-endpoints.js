const { User } = require('./models');
const sequelize = require('./config/db');

async function test() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // Find an admin user
    const admin = await User.findOne({ where: { role: 'admin' } });
    if (!admin) {
      console.error('No admin user found in database!');
      process.exit(1);
    }
    console.log(`Found Admin: ${admin.name} (${admin.email})`);

    // Generate JWT token
    const token = admin.getSignedJwtToken();
    console.log('Generated Admin JWT Token:', token);

    // Call Vercel endpoint
    const url = 'https://taskflow-backend-ten.vercel.app/api/reports/ceo';
    console.log(`Fetching Vercel endpoint: ${url}`);
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Vercel Response Status: ${res.status}`);
    const body = await res.json();
    console.log('Vercel Response Body:', JSON.stringify(body, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error in test:', err);
    process.exit(1);
  }
}

test();
