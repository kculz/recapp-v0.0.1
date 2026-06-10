const app = require('./app');
const db = require('./models');
const { initIO } = require('./v1/utils/socket');
require('dotenv').config();

// Initialize background email worker queue processor
require('./v1/workers/emailWorker');

const PORT = process.env.PORT || 5001;

async function startServer() {
  let server;
  try {
    // Authenticate connection to Postgres database
    await db.sequelize.authenticate();
    console.log('PostgreSQL connection has been established successfully.');

    // Safely add 'SupportPerson' to the Users role enum if not present
    try {
      await db.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = 'SupportPerson'
            AND enumtypid = (
              SELECT oid FROM pg_type WHERE typname = 'enum_Users_role'
            )
          ) THEN
            ALTER TYPE "enum_Users_role" ADD VALUE 'SupportPerson';
          END IF;
        END;
        $$;
      `);
      console.log('[Migration] enum_Users_role: SupportPerson value ensured.');
    } catch (enumErr) {
      console.warn('[Migration] Could not alter Users role enum (may already exist or DB not ready):', enumErr.message);
    }

    try {
      await db.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = 'Pending'
            AND enumtypid = (
              SELECT oid FROM pg_type WHERE typname = 'enum_Appointments_status'
            )
          ) THEN
            ALTER TYPE "enum_Appointments_status" ADD VALUE 'Pending';
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = 'Approved'
            AND enumtypid = (
              SELECT oid FROM pg_type WHERE typname = 'enum_Appointments_status'
            )
          ) THEN
            ALTER TYPE "enum_Appointments_status" ADD VALUE 'Approved';
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = 'Rejected'
            AND enumtypid = (
              SELECT oid FROM pg_type WHERE typname = 'enum_Appointments_status'
            )
          ) THEN
            ALTER TYPE "enum_Appointments_status" ADD VALUE 'Rejected';
          END IF;
        END;
        $$;
      `);
      console.log('[Migration] enum_Appointments_status: Pending/Approved/Rejected values ensured.');
    } catch (enumErr) {
      console.warn('[Migration] Could not alter Appointment status enum (may already exist or DB not ready):', enumErr.message);
    }

    // Sync database models
    await db.sequelize.sync({ force: false });
    console.log('Database models synchronized successfully.');

    // Start server
    server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV} mode.`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    // Note: Do not block starting if DB connection fails in local fallback environments,
    // but log the error and allow server to run for API routing testing
    console.log('Starting server in offline database mode fallback...');
    server = app.listen(PORT, () => {
      console.log(`Server running (database connection failed) on port ${PORT}.`);
    });
  }

  if (server) {
    initIO(server);
    console.log('[Socket] WebSocket server attached successfully.');
  }
}

startServer();
