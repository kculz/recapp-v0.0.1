const { User, sequelize } = require('./models');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    // Authenticate db connection
    await sequelize.authenticate();
    console.log('Database connected for seeding...');

    // Synchronize models (ensure database is fresh)
    await sequelize.sync({ force: false });

    // Clean up existing users with seed emails to prevent constraint errors
    const seedEmails = [
      'admin@recapp.com',
      'counselor@recapp.com',
      'therapist@recapp.com',
      'client@recapp.com'
    ];
    await User.destroy({ where: { email: seedEmails } });
    console.log('Cleaned up previous seed users.');

    // Create Admin
    const adminUser = await User.create({
      name: 'System Administrator',
      email: 'admin@recapp.com',
      password: 'AdminPassword123', // hooks will automatically hash it
      role: 'Admin',
      status: 'Active'
    });
    console.log('Created Admin user: admin@recapp.com / AdminPassword123');

    // Create Counselor 1
    const counselor1 = await User.create({
      name: 'Dr. Sarah Jenkins',
      email: 'counselor@recapp.com',
      password: 'CounselorPassword123',
      role: 'Counselor',
      status: 'Active'
    });
    console.log('Created Counselor: counselor@recapp.com / CounselorPassword123');

    // Create Counselor 2
    const counselor2 = await User.create({
      name: 'Dr. Michael Chen',
      email: 'therapist@recapp.com',
      password: 'CounselorPassword123',
      role: 'Counselor',
      status: 'Active'
    });
    console.log('Created Counselor: therapist@recapp.com / CounselorPassword123');

    // Create Client (assigned to Counselor 1)
    const client = await User.create({
      name: 'John Doe',
      email: 'client@recapp.com',
      password: 'ClientPassword123',
      role: 'Client',
      clientType: 'Rehab',
      assignedCounselorId: counselor1.id,
      status: 'Active'
    });
    console.log('Created Client: client@recapp.com / ClientPassword123 (Assigned to Dr. Jenkins)');

    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
