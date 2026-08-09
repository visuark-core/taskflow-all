const { User } = require('./models');
const sequelize = require('./config/db');

async function test() {
  try {
    await sequelize.authenticate();
    const admin = await User.findOne({ where: { email: 'admin@visuark.com' } });
    const token = admin.getSignedJwtToken();
    
    const endpoints = [
      'https://taskflow-backend-ten.vercel.app/api/reports/ceo',
      'https://taskflow-backend-ten.vercel.app/api/reports/cfo',
      'https://taskflow-backend-ten.vercel.app/api/reports/cto',
      'https://taskflow-backend-ten.vercel.app/api/reports/cmo',
      'https://taskflow-backend-ten.vercel.app/api/reports/productivity'
    ];

    for (const url of endpoints) {
      console.log(`\nFetching: ${url} ...`);
      const start = Date.now();
      try {
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const duration = Date.now() - start;
        console.log(`Status: ${res.status} (took ${duration}ms)`);
        if (res.status === 200) {
          const body = await res.json();
          console.log(`Success: ${body.success}`);
        } else {
          const text = await res.text();
          console.log('Response:', text.substring(0, 200));
        }
      } catch (err) {
        console.error(`Failed to fetch ${url}:`, err.message);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error('Test script failed:', err);
    process.exit(1);
  }
}

test();
