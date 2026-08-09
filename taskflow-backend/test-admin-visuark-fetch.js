const { User } = require('./models');
const sequelize = require('./config/db');

async function test() {
  try {
    await sequelize.authenticate();
    const admin = await User.findOne({ where: { email: 'admin@visuark.com' } });
    if (!admin) {
      console.error('admin@visuark.com not found!');
      process.exit(1);
    }
    const token = admin.getSignedJwtToken();
    const url = 'https://taskflow-backend-ten.vercel.app/api/users';
    
    console.log(`Testing token for: ${admin.email} (ID: ${admin.id})`);
    console.log(`Fetching: ${url} ...`);
    
    const start = Date.now();
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const duration = Date.now() - start;
    
    console.log(`Status: ${res.status} (took ${duration}ms)`);
    const body = await res.json();
    console.log(`Success: ${body.success}`);
    if (body.success) {
      console.log(`Retrieved users count: ${body.data ? body.data.length : (body.users ? body.users.length : 'N/A')}`);
    } else {
      console.log('Error:', body.error || body.message);
    }
    process.exit(0);
  } catch (err) {
    console.error('Fetch failed:', err);
    process.exit(1);
  }
}

test();
