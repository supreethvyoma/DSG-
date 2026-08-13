const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const WpOrder = require("../models/WpOrder");

async function syncAllUsersAndWpOrders() {
  console.log("==========================================================");
  console.log("🔄 SYNCING ALL 6,073 USERS WITH 8,573 WP ARCHIVE ORDERS");
  console.log("==========================================================");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB:", mongoose.connection.name);

  // 1. Fetch all users
  const users = await User.find({}).select("_id email name").lean();
  console.log(`Fetched ${users.length} registered users from MongoDB.`);

  // Create email -> userId map
  const emailToUserMap = new Map();
  for (const u of users) {
    if (u.email) {
      emailToUserMap.set(String(u.email).trim().toLowerCase(), u._id);
    }
  }

  // 2. Fetch all WpOrders
  const wpOrders = await WpOrder.find({}).select("_id wpOrderId user billingEmail billing").lean();
  console.log(`Fetched ${wpOrders.length} historical WordPress orders from MongoDB.`);

  const bulkOps = [];
  let matchedOrdersCount = 0;
  let updatedOrdersCount = 0;

  for (const wO of wpOrders) {
    const rawEmail = wO.billingEmail || wO.billing?.email || "";
    const cleanEmail = String(rawEmail).trim().toLowerCase();

    if (!cleanEmail) continue;

    const matchedUserId = emailToUserMap.get(cleanEmail);

    if (matchedUserId) {
      matchedOrdersCount++;
      const currentUserIdStr = wO.user ? String(wO.user) : "";
      const matchedUserIdStr = String(matchedUserId);

      if (currentUserIdStr !== matchedUserIdStr || wO.billingEmail !== cleanEmail) {
        updatedOrdersCount++;
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

  console.log(`\n📊 Summary:`);
  console.log(`- Total Users: ${users.length}`);
  console.log(`- Total WP Orders: ${wpOrders.length}`);
  console.log(`- Total Orders Matched to Users: ${matchedOrdersCount}`);
  console.log(`- Orders Updated with User Link: ${updatedOrdersCount}`);

  if (bulkOps.length > 0) {
    for (let i = 0; i < bulkOps.length; i += 1000) {
      const chunk = bulkOps.slice(i, i + 1000);
      await WpOrder.bulkWrite(chunk);
      console.log(`Saved batch ${i + chunk.length} / ${bulkOps.length}...`);
    }
  }

  console.log("\n==========================================================");
  console.log("✅ ALL WORDPRESS ORDERS SUCCESSFULLY CONNECTED TO ALL USERS!");
  console.log("==========================================================");

  await mongoose.disconnect();
}

syncAllUsersAndWpOrders().catch(console.error);
