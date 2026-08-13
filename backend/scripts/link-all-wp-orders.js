const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const WpOrder = require('../models/WpOrder');

async function linkAllWpOrdersToUsers() {
  console.log("==================================================");
  console.log("🔗 Linking ALL 8,573 WpOrder documents to Users...");
  console.log("==================================================");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB:", mongoose.connection.name);

  // 1. Load all users into email map
  const users = await User.find({}).select("_id email").lean();
  const userMap = new Map();
  for (const u of users) {
    if (u.email) {
      userMap.set(String(u.email).trim().toLowerCase(), u._id);
    }
  }
  console.log(`Loaded ${users.length} MongoDB users into email lookup map.`);

  // 2. Fetch all WpOrders
  const wpOrders = await WpOrder.find({}).select("_id wpOrderId user billingEmail billing").lean();
  console.log(`Found ${wpOrders.length} total WpOrder documents.`);

  const bulkOps = [];
  let linkedCount = 0;
  let newlyLinked = 0;

  for (const wO of wpOrders) {
    const rawEmail = wO.billingEmail || wO.billing?.email || "";
    const cleanEmail = String(rawEmail).trim().toLowerCase();

    if (!cleanEmail) continue;

    const matchedUserId = userMap.get(cleanEmail);

    if (matchedUserId) {
      linkedCount++;
      const currentUserIdStr = wO.user ? String(wO.user) : "";
      const matchedUserIdStr = String(matchedUserId);

      if (currentUserIdStr !== matchedUserIdStr) {
        newlyLinked++;
        bulkOps.push({
          updateOne: {
            filter: { _id: wO._id },
            update: {
              $set: {
                user: matchedUserId,
                billingEmail: cleanEmail
              }
            }
          }
        });
      }
    }
  }

  console.log(`Matching results: ${linkedCount} / ${wpOrders.length} orders have matching user accounts.`);
  console.log(`Newly updating ${bulkOps.length} orders with missing user references...`);

  if (bulkOps.length > 0) {
    for (let i = 0; i < bulkOps.length; i += 1000) {
      const chunk = bulkOps.slice(i, i + 1000);
      await WpOrder.bulkWrite(chunk);
      console.log(`Updated ${Math.min(i + 1000, bulkOps.length)} / ${bulkOps.length} orders...`);
    }
  }

  console.log("==================================================");
  console.log(`✅ LINKING COMPLETE! Total Linked: ${linkedCount} | Updated: ${newlyLinked}`);
  console.log("==================================================");

  await mongoose.disconnect();
}

linkAllWpOrdersToUsers().catch(console.error);
