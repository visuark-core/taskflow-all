const { Sequelize } = require('sequelize');
const pg = require('pg');

async function run() {
  const connectionUri = 'postgresql://postgres:Mansi%402007--@db.fxyjskvayzytamfqstgn.supabase.co:5432/postgres';
  console.log('Connecting to database...');

  try {
    const sequelize = new Sequelize(connectionUri, {
      dialect: 'postgres',
      dialectModule: pg,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: false
    });

    await sequelize.authenticate();
    
    // Query active connections
    const [results] = await sequelize.query(`
      SELECT pid, usename, client_addr, backend_start, query, state 
      FROM pg_stat_activity 
      WHERE datname = 'postgres';
    `);

    console.log('\n--- ACTIVE CONNECTIONS ---');
    results.forEach(row => {
      console.log(`PID: ${row.pid} | User: ${row.usename} | IP: ${row.client_addr} | State: ${row.state} | Start: ${row.backend_start}`);
      console.log(`Query: ${row.query.substring(0, 100)}\n`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Failed to retrieve connections status:', err);
    process.exit(1);
  }
}

run();
