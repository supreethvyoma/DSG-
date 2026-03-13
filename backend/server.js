const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const couponRoutes = require("./routes/couponRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
let dbConnected = false;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is running");
});

app.get("/api/health", (req, res) => {
  res.json({ api: "ok", db: dbConnected ? "connected" : "disconnected" });
});

app.use("/api/auth", (req, res, next) => {
  if (!dbConnected) {
    return res.status(503).json({
      message: "Database is not connected. Start MongoDB or update MONGO_URI."
    });
  }
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/payment", paymentRoutes);

if (
  !process.env.MONGO_URI ||
  !/^mongodb(\+srv)?:\/\//.test(process.env.MONGO_URI)
) {
  console.error(
    "Invalid MONGO_URI in backend/.env. Use a full URI starting with mongodb:// or mongodb+srv://"
  );
}

async function connectToDatabase() {
  if (!process.env.MONGO_URI || !/^mongodb(\+srv)?:\/\//.test(process.env.MONGO_URI)) {
    dbConnected = false;
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    dbConnected = true;
    console.log("MongoDB connected");
  } catch (error) {
    dbConnected = false;
    console.error("MongoDB connection failed:", error.message);
  }
}

connectToDatabase();

setInterval(() => {
  if (!dbConnected) {
    connectToDatabase();
  }
}, 10000);

mongoose.connection.on("disconnected", () => {
  dbConnected = false;
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
