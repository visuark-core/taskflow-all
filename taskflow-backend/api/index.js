const serverless = require('serverless-http');

module.exports = (req, res) => {
  if (req.url === '/api/ping' || req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('pong');
    return;
  }

  const app = require('../app');

  // Avoid crashing the serverless container on DB connection failure
  if (app.ready) {
    app.ready.catch(err => {
      console.error('Serverless startup: Database connection failed:', err.message);
    });
  }

  return serverless(app)(req, res);
};
