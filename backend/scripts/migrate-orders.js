const mysql = require("mysql2/promise");
const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "Suppi070897",
  database: process.env.MYSQL_DB || "wp_old_export"
};

function mapWpStatus(wpStatus) {
  const s = String(wpStatus || "").toLowerCase();
  if (s.includes("completed")) return { status: "Delivered", paymentStatus: "Paid" };
  if (s.includes("processing")) return { status: "Pending", paymentStatus: "Paid" };
  if (s.includes("refunded")) return { status: "Cancelled", paymentStatus: "Paid", refundStatus: "Refunded" };
  if (s.includes("cancelled") || s.includes("failed")) return { status: "Cancelled", paymentStatus: "Failed" };
  return { status: "Pending", paymentStatus: "Pending" };
}

async function migrateOrders() {
  console.log("==================================================");
  console.log("🚀 WooCommerce Orders (8,573 items) -> MongoDB Migration");
  console.log("==================================================");

  console.log("Connecting to MongoDB:", process.env.MONGO_URI);
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB:", mongoose.connection.name);

  console.log("Connecting to MySQL database:", MYSQL_CONFIG.database);
  const mysqlConn = await mysql.createConnection(MYSQL_CONFIG);
  console.log("Connected to MySQL!");

  try {
    // ── 1. Pre-fetch Mongo Products Map ───────────────────────────────────────
    console.log("⚡ [1/5] Pre-fetching Mongo products...");
    const mongoProducts = await Product.find({}).select("_id name price image").lean();
    const productMapByTitle = new Map();
    for (const p of mongoProducts) {
      productMapByTitle.set(p.name.toLowerCase().trim(), p);
    }
    console.log(`Loaded ${mongoProducts.length} MongoDB products.`);

    // ── 2. Pre-fetch WP Product Titles Map ────────────────────────────────────
    console.log("⚡ [2/5] Pre-fetching MySQL Product Titles...");
    const [wpProducts] = await mysqlConn.query(`SELECT ID, post_title FROM wp_posts WHERE post_type = 'product'`);
    const wpIdToTitleMap = new Map();
    for (const p of wpProducts) {
      wpIdToTitleMap.set(p.ID, String(p.post_title || "").trim());
    }
    console.log(`Loaded ${wpIdToTitleMap.size} MySQL product titles.`);

    // ── 3. Pre-fetch Mongo Users Map ──────────────────────────────────────────
    console.log("⚡ [3/5] Pre-fetching Mongo users by email...");
    const mongoUsers = await User.find({}).select("_id email").lean();
    const userMapByEmail = new Map();
    for (const u of mongoUsers) {
      if (u.email) {
        userMapByEmail.set(u.email.toLowerCase().trim(), u._id);
      }
    }
    console.log(`Loaded ${mongoUsers.length} MongoDB users.`);

    // ── 4. Pre-fetch Order Line Items ─────────────────────────────────────────
    console.log("⚡ [4/5] Pre-fetching 11,626 order line items from MySQL...");
    const [itemRows] = await mysqlConn.query(`
      SELECT order_id, product_id, product_qty, product_net_revenue, product_gross_revenue
      FROM wp_wc_order_product_lookup
    `);
    const orderItemsMap = new Map();
    for (const item of itemRows) {
      if (!orderItemsMap.has(item.order_id)) {
        orderItemsMap.set(item.order_id, []);
      }
      orderItemsMap.get(item.order_id).push(item);
    }
    console.log(`Loaded line items for ${orderItemsMap.size} unique orders.`);

    // ── 5. Pre-fetch All Order Postmeta ───────────────────────────────────────
    console.log("⚡ [5/5] Pre-fetching postmeta for all 8,573 orders...");
    const [orderMetaRows] = await mysqlConn.query(`
      SELECT post_id, meta_key, meta_value 
      FROM wp_postmeta 
      WHERE post_id IN (SELECT ID FROM wp_posts WHERE post_type = 'shop_order')
    `);

    const orderMetaMap = new Map();
    for (const m of orderMetaRows) {
      if (!orderMetaMap.has(m.post_id)) {
        orderMetaMap.set(m.post_id, {});
      }
      orderMetaMap.get(m.post_id)[m.meta_key] = m.meta_value;
    }
    console.log(`Loaded metadata for ${orderMetaMap.size} orders.`);

    // ── STEP 6: Execute Bulk Order Migration ─────────────────────────────────
    console.log("\n🛍️ Processing 8,573 WooCommerce Orders...");
    const [orderPosts] = await mysqlConn.query(`
      SELECT ID, post_status, post_date_gmt, post_date
      FROM wp_posts
      WHERE post_type = 'shop_order'
    `);

    console.log(`Fetched ${orderPosts.length} shop_order records from wp_posts.`);

    const orderOps = [];

    for (const oPost of orderPosts) {
      const wpOrderId = oPost.ID;
      const legacyRef = `WP-ORDER-${wpOrderId}`;
      const meta = orderMetaMap.get(wpOrderId) || {};

      const email = String(meta._billing_email || "").trim().toLowerCase();
      const userId = userMapByEmail.get(email) || null;

      const { status, paymentStatus, refundStatus } = mapWpStatus(oPost.post_status);

      const billingName = `${meta._billing_first_name || ""} ${meta._billing_last_name || ""}`.trim();
      const billingAddress = [meta._billing_address_1, meta._billing_address_2].filter(Boolean).join(", ");
      const billing = {
        name: billingName || "Customer",
        phone: String(meta._billing_phone || "").trim(),
        email: email,
        address: billingAddress,
        city: String(meta._billing_city || "").trim(),
        state: String(meta._billing_state || "").trim(),
        pincode: String(meta._billing_postcode || "").trim(),
        country: String(meta._billing_country || "IN").trim()
      };

      const shippingName = `${meta._shipping_first_name || meta._billing_first_name || ""} ${meta._shipping_last_name || meta._billing_last_name || ""}`.trim();
      const shippingAddress = [meta._shipping_address_1 || meta._billing_address_1, meta._shipping_address_2 || meta._billing_address_2].filter(Boolean).join(", ");
      const shipping = {
        name: shippingName || billing.name,
        phone: String(meta._shipping_phone || meta._billing_phone || "").trim(),
        email: email,
        address: shippingAddress || billing.address,
        city: String(meta._shipping_city || meta._billing_city || "").trim(),
        state: String(meta._shipping_state || meta._billing_state || "").trim(),
        pincode: String(meta._shipping_postcode || meta._billing_postcode || "").trim(),
        country: String(meta._shipping_country || meta._billing_country || "IN").trim()
      };

      const rawItems = orderItemsMap.get(wpOrderId) || [];
      const items = [];

      for (const rawItem of rawItems) {
        const wpTitle = wpIdToTitleMap.get(rawItem.product_id) || "";
        const mongoP = wpTitle ? productMapByTitle.get(wpTitle.toLowerCase().trim()) : null;

        const price = Number(rawItem.product_gross_revenue || rawItem.product_net_revenue || 0);
        const qty = Number(rawItem.product_qty || 1);

        items.push({
          product: mongoP ? mongoP._id : new mongoose.Types.ObjectId(),
          name: mongoP ? mongoP.name : (wpTitle || `WooCommerce Product #${rawItem.product_id}`),
          price: qty > 0 ? Math.round((price / qty) * 100) / 100 : price,
          quantity: qty,
          image: mongoP ? mongoP.image : ""
        });
      }

      const totalAmount = Number(meta._order_total || 0);
      const taxAmount = Number(meta._order_tax || 0);
      const shippingAmount = Number(meta._order_shipping || 0);
      const subtotal = Math.max(0, totalAmount - taxAmount - shippingAmount);
      const orderDate = oPost.post_date_gmt ? new Date(oPost.post_date_gmt) : (oPost.post_date ? new Date(oPost.post_date) : new Date());

      orderOps.push({
        updateOne: {
          filter: { "paymentMeta.razorpayOrderId": legacyRef },
          update: {
            $set: {
              user: userId,
              items: items,
              subtotal: subtotal,
              total: totalAmount,
              gstAmount: taxAmount,
              deliveryCharge: shippingAmount,
              status: status,
              paymentStatus: paymentStatus,
              paymentMethod: String(meta._payment_method || "Razorpay").trim(),
              refundStatus: refundStatus || "Not Applicable",
              billing: billing,
              shipping: shipping,
              currencyDisplay: {
                currency: String(meta._order_currency || "INR").trim().toUpperCase(),
                amount: totalAmount,
                detectedCountry: String(shipping.country || "IN").trim()
              },
              paymentMeta: {
                razorpayOrderId: legacyRef,
                razorpayPaymentId: String(meta._transaction_id || "").trim(),
                paidAt: paymentStatus === "Paid" ? orderDate : null
              },
              createdAt: orderDate,
              updatedAt: orderDate
            }
          },
          upsert: true
        }
      });
    }

    console.log(`Prepared ${orderOps.length} bulk upsert operations for MongoDB.`);

    for (let i = 0; i < orderOps.length; i += 1000) {
      const chunk = orderOps.slice(i, i + 1000);
      await Order.bulkWrite(chunk);
      console.log(`Migrated ${Math.min(i + 1000, orderOps.length)} / ${orderOps.length} orders...`);
    }

    console.log("\n==================================================");
    console.log(`🎉 SUCCESSFULLY MIGRATED ALL ${orderOps.length} ORDERS TO MONGODB!`);
    console.log("==================================================");
  } catch (error) {
    console.error("Migration Error:", error);
  } finally {
    await mysqlConn.end();
    await mongoose.disconnect();
    process.exit(0);
  }
}

migrateOrders();
