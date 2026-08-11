const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const Product = require("./models/Product");

async function check() {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/digital_sanskrit_guru_v2";
  await mongoose.connect(mongoUri);
  const products = await Product.find().select("_id name category stock").lean();
  console.log("Total Products in DB:", products.length);
  products.forEach((p, i) => {
    console.log(`${i + 1}. [${p._id}] ${p.name} (${p.category})`);
  });
  await mongoose.disconnect();
}

check().catch(console.error);
