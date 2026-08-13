const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Order = require('../models/Order');
const WpOrder = require('../models/WpOrder');

async function inspectSunithaOrders() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB:', mongoose.connection.name);

  const user = await User.findOne({ email: 'chandru162@gmail.com' });
  console.log('User found:', user ? user._id : 'NO USER', '| Name:', user ? user.name : '');

  if (user) {
    const mainOrders = await Order.find({ user: user._id });
    console.log('Main Order count:', mainOrders.length);

    const wpOrdersByUser = await WpOrder.find({ user: user._id });
    console.log('WpOrders matched by user _id:', wpOrdersByUser.length);

    const wpOrdersByEmail = await WpOrder.find({ billingEmail: 'chandru162@gmail.com' });
    console.log('WpOrders matched by billingEmail "chandru162@gmail.com":', wpOrdersByEmail.length);

    const wpOrdersBySearch = await WpOrder.find({
      $or: [
        { billingEmail: /chandru/i },
        { billingName: /Sunitha R/i }
      ]
    });
    console.log('WpOrders matched by search "Sunitha R" or "chandru":', wpOrdersBySearch.length);
    wpOrdersBySearch.forEach(o => {
      console.log(`WP Order #${o.wpOrderId} | Name: "${o.billingName}" | Email: "${o.billingEmail}" | UserRef: ${o.user} | Items: ${o.items.length}`);
    });
  }

  await mongoose.disconnect();
}

inspectSunithaOrders().catch(console.error);
