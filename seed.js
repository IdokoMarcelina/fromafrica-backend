
const mongoose = require('mongoose');
const User = require('./src/models/User');

const seedData = async () => {

  try {

    // Seed new data
    const user = new User(
      {
        name:'mimi',
        email:'aitmacelina@gmail.com',
        phone:'09012130382',
        password:'@Marcelina123',
        LGA:'yaba',
        user_type:'admin',
        state:'Lagos',
        email_verified: true
       }
    );

    await user.save();
    console.log("done");
  } catch (err) {
    console.error('Error seeding data:', err);
  }
};

module.exports ={
    seedData
}