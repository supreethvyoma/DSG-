const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env") });
const Product = require("../models/Product");

function cleanShortcodes(text) {
  if (!text) return "";
  let s = String(text);
  // Remove Divi shortcode blocks and generic bracket tags
  s = s.replace(/\[\/?et_pb_[^\]]*\]/gi, "");
  s = s.replace(/\[\/?vc_[^\]]*\]/gi, "");
  s = s.replace(/\[\/?elementor[^\]]*\]/gi, "");
  s = s.replace(/\[\/?[a-z0-9_-]+(?:\s+[^\]]+)?\]/gi, "");
  s = s.replace(/&nbsp;/gi, " ");
  s = s.replace(/&amp;/gi, "&");
  s = s.replace(/&lt;/gi, "<");
  s = s.replace(/&gt;/gi, ">");
  s = s.replace(/\r\n/g, "\n");
  s = s.replace(/\n\s*\n+/g, "\n\n").trim();
  return s;
}

function fixUrl(url) {
  if (!url) return "";
  let u = String(url).trim();
  u = u.replace(/https?:\/\/3\.108\.166\.236/gi, "https://digitalsanskritguru.com");
  u = u.replace(/https?:\/\/localhost[^\/]*/gi, "https://digitalsanskritguru.com");
  u = u.replace(/https?:\/\/vyomalabs\.in/gi, "https://digitalsanskritguru.com");
  if (u.startsWith("/wp-content/")) {
    u = "https://digitalsanskritguru.com" + u;
  }
  return u;
}

async function fixProductsData() {
  console.log("Connecting to MongoDB:", process.env.MONGO_URI);
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB:", mongoose.connection.name);

  const products = await Product.find({});
  console.log(`Found ${products.length} products to check & fix in MongoDB.`);

  let updatedCount = 0;
  for (const p of products) {
    let modified = false;

    // 1. Fix Main Image URL
    const fixedImage = fixUrl(p.image);
    if (fixedImage !== p.image) {
      p.image = fixedImage;
      modified = true;
    }

    // 2. Fix Gallery Images Array URLs
    if (Array.isArray(p.images)) {
      const fixedImages = p.images.map(fixUrl).filter(Boolean);
      if (JSON.stringify(fixedImages) !== JSON.stringify(p.images)) {
        p.images = fixedImages;
        modified = true;
      }
    }

    // 3. Clean WordPress Page Builder Shortcodes from Description
    const cleanedDesc = cleanShortcodes(p.description);
    if (cleanedDesc !== p.description) {
      p.description = cleanedDesc || p.name;
      modified = true;
    }

    if (modified) {
      await p.save();
      updatedCount++;
    }
  }

  console.log(`✅ Successfully cleaned & fixed ${updatedCount} products in MongoDB!`);
  await mongoose.disconnect();
}

fixProductsData().catch(console.error);
