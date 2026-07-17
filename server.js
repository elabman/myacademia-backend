require('dotenv').config();
const app = require('./app');
const config = require('./config/config');
const { testConnection } = require('./config/database');

async function start() {
  try {
    await testConnection();
    // eslint-disable-next-line no-console
    console.log('Database connection established (db_myacademia).');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to connect to the database:', err.message);
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`API running on http://localhost:${config.port}${config.apiPrefix}`);
    // eslint-disable-next-line no-console
    console.log(`Swagger docs at   http://localhost:${config.port}/api-docs`);
  });

  process.on('unhandledRejection', (err) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
  });
}

start();
