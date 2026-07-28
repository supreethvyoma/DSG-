const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load env
dotenv.config({ path: path.join(__dirname, "../backend/.env") });

const Product = require("../backend/models/Product");
const StoreSettings = require("../backend/models/StoreSettings");
const { getDeliveryPricingDetails } = require("../backend/utils/deliveryPricing");

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/digital_sanskrit_guru_v2");
  
  const product = await Product.findOne({ _id: "6a587956a480d03f03b9d805" }).lean();
  const settings = await StoreSettings.findOne().lean();
  
  console.log("Product:", product ? product.name : "not found");
  
  const shipping = {
    address: "934/s 2nd cross sankranthi circle hebbal",
    city: "Mysuru",
    state: "Karnataka",
    pincode: "570019",
    country: "India",
    latitude: 12.3551, // Mysuru coords
    longitude: 76.6212
  };

  const items = [{
    product: product._id,
    _id: product._id,
    id: product._id,
    name: product.name,
    image: product.image,
    price: product.price,
    quantity: 1,
    isDigital: false,
    weight: product.weight,
    height: product.height,
    width: product.width,
    length: product.length
  }];

  const res = getDeliveryPricingDetails(settings, shipping, items);
  console.log("Calculation Result:", JSON.stringify(res, null, 2));

  mongoose.connection.close();
}

run().catch(console.error);
