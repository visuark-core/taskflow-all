const serverless = require('serverless-http');
const app = require('../app');

// Avoid crashing the serverless container on DB connection failure
if (app.ready) {
  app.ready.catch(err => {
    console.error('Serverless startup: Database connection failed:', err.message);
  });
}

module.exports = serverless(app);
