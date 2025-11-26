require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const User = require('./models/UserModel');
const connectDB = require('./config/connectDB');

const seedData = async () => {
  try {
    await connectDB();

    // Get admin credentials from .env
    const admin1Email = process.env.ADMIN1_EMAIL;
    const admin1Password = process.env.ADMIN1_PASSWORD;

    const admin2Email = process.env.ADMIN2_EMAIL;
    const admin2Password = process.env.ADMIN2_PASSWORD;

    // Check if admin 1 exists
    let existingUser1 = await User.findOne({ email: admin1Email });
    if (!existingUser1) {
      const user1 = new User({
        name: 'Admin One',
        email: admin1Email,
        phone: '09012130382',
        password: admin1Password,
        role: 'admin',
        address: 'Yaba, Lagos',
        isVerified: true
      });
      await user1.save();
      console.log('Admin user 1 created successfully');
    } else {
      if (existingUser1.role !== 'admin') {
        existingUser1.role = 'admin';
        existingUser1.isVerified = true;
        await existingUser1.save();
        console.log('Existing user 1 updated to admin');
      } else {
        console.log('Admin user 1 already exists');
      }
    }

    // Check if admin 2 exists
    let existingUser2 = await User.findOne({ email: admin2Email });
    if (!existingUser2) {
      const user2 = new User({
        name: 'Admin Two',
        email: admin2Email,
        phone: '07046483800',
        password: admin2Password,
        role: 'admin',
        address: 'Yaba, Lagos',
        isVerified: true
      });
      await user2.save();
      console.log('Admin user 2 created successfully');
    } else {
      if (existingUser2.role !== 'admin') {
        existingUser2.role = 'admin';
        existingUser2.isVerified = true;
        await existingUser2.save();
        console.log('Existing user 2 updated to admin');
      } else {
        console.log('Admin user 2 already exists');
      }
    }

    console.log('Seeding completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
};

seedData();

module.exports = { seedData };
