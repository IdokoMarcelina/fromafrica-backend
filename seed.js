require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const User = require('./models/UserModel');
const connectDB = require('./config/connectDB');

const seedData = async () => {
  try {
   
    await connectDB();
    
    
    const existingUser1 = await User.findOne({ email: 'aitmacelina@gmail.com' });
    const existingUser2 = await User.findOne({ email: 'fromafricab2b@gmail.com' });
    
    if (!existingUser1) {
    
      const user1 = new User({
        name: 'mimi',
        email: 'aitmacelina@gmail.com',
        phone: '09012130382',
        password: '@Marcelina123',
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
    
    if (!existingUser2) {
      const user2 = new User({
        name: 'myadmin',
        email: 'fromafricab2b@gmail.com',
        phone: '07046483800',
        password: 'Fromafrica123',
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

module.exports = {
  seedData
};
