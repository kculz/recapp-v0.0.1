const app = require('./app');
const db = require('./models');
require('dotenv').config();

const PORT = process.env.PORT || 5001;

async function startServer() {
  try {
    // Authenticate connection to Postgres database
    await db.sequelize.authenticate();
    console.log('PostgreSQL connection has been established successfully.');

    // Sync database models
    await db.sequelize.sync({ force: false });
    console.log('Database models synchronized successfully.');

    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV} mode.`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    // Note: Do not block starting if DB connection fails in local fallback environments,
    // but log the error and allow server to run for API routing testing
    console.log('Starting server in offline database mode fallback...');
    app.listen(PORT, () => {
      console.log(`Server running (database connection failed) on port ${PORT}.`);
    });
  }
}

startServer();
