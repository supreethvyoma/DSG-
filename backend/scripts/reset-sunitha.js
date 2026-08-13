const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');

async function resetSunithaPassword() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB:', mongoose.connection.name);

  const users = await User.find({
    $or: [
      { name: /Sunitha/i },
      { email: /sunitha/i }
    ]
  });

  console.log(`Found ${users.length} user(s) matching "Sunitha":`);

  if (users.length === 0) {
    console.log('No user found matching Sunitha.');
    await mongoose.disconnect();
    return;
  }

  const newPassword = "SunithaPassword123!";
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  for (const user of users) {
    console.log(`Resetting password for: ID: ${user._id} | Name: "${user.name}" | Email: "${user.email}"`);
    user.password = hashedPassword;
    await user.save();
    console.log(`✅ Password successfully updated for ${user.email}`);
  }

  console.log('\n--- RESET CREDENTIALS SUMMARY ---');
  users.forEach(u => {
    console.log(`Name: ${u.name}`);
    console.log(`Email: ${u.email}`);
    console.log(`New Password: ${newPassword}`);
  });

  await mongoose.disconnect();
}

resetSunithaPassword().catch(console.error);
