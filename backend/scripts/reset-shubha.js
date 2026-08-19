const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');

async function makeAdmin() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/digital_sanskrit_guru_v2';
  await mongoose.connect(mongoUri);

  const targetEmail = 'shubha81.vyoma@gmail.com';
  const user = await User.findOne({ email: targetEmail });

  if (user) {
    const newPassword = 'ShubhaPassword123!';
    user.password = await bcrypt.hash(newPassword, 12);
    user.isAdmin = true;
    user.adminRole = 'Super Admin';
    user.isEmailVerified = true;
    user.isBlocked = false;
    await user.save();

    console.log('\n==========================================');
    console.log('✅ PASSWORD RESET & ADMIN PRIVILEGES GRANTED');
    console.log('==========================================');
    console.log(`User ID:      ${user._id}`);
    console.log(`Name:         ${user.name}`);
    console.log(`Email:        ${user.email}`);
    console.log(`New Password: ${newPassword}`);
    console.log(`Admin Role:   ${user.adminRole}`);
    console.log('==========================================\n');
  }

  await mongoose.disconnect();
}

makeAdmin().catch(console.error);
