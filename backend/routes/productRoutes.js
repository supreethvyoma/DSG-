const express = require("express");
const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

const router = express.Router();

const getItemProductId = (item) => {
  if (!item) return "";
  if (item.product) return String(item.product);
  if (item._id) return String(item._id);
  if (item.id) return String(item.id);
  return "";
};

// Create product (ADMIN)
router.post("/", protect, admin, async (req, res) => {
  const product = await Product.create(req.body);
  res.json(product);
});

// UPDATE product (ADMIN)
router.put("/:id", protect, admin, async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  product.name = req.body.name ?? product.name;
  product.price = req.body.price ?? product.price;
  product.image = req.body.image ?? product.image;
  product.description = req.body.description ?? product.description;
  product.stock = req.body.stock ?? product.stock;

  const updatedProduct = await product.save();
  res.json(updatedProduct);
});

// Get all products
router.get("/", async (req, res) => {
  const products = await Product.find();
  res.json(products);
});
// Get recommended products based on co-purchase history
router.get("/recommend/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    const orders = await Order.find({
      $or: [
        { "items.product": productId },
        { "items._id": productId },
        { "items.id": productId }
      ]
    }).select("items");

    const counts = {};

    // Count co-occurrence per order (unique product IDs per order),
    // so orders with many items are handled correctly without double-counting duplicates.
    orders.forEach((order) => {
      const uniqueIds = new Set(
        (order.items || [])
          .map((item) => getItemProductId(item))
          .filter(Boolean)
      );

      if (!uniqueIds.has(productId)) return;
      uniqueIds.forEach((id) => {
        if (id === productId) return;
        counts[id] = (counts[id] || 0) + 1;
      });
    });

    const sortedIds = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map((entry) => entry[0]);

    if (sortedIds.length === 0) {
      return res.json([]);
    }

    const products = await Product.find({
      _id: { $in: sortedIds }
    });

    const rank = new Map(sortedIds.map((id, index) => [id, index]));
    products.sort((a, b) => (rank.get(String(a._id)) ?? 999) - (rank.get(String(b._id)) ?? 999));

    res.json(
      products.map((product) => ({
        ...product.toObject(),
        boughtTogetherCount: counts[String(product._id)] || 0
      }))
    );
  } catch {
    res.status(500).json({ message: "Failed to load recommendations" });
  }
});

// Get one product by id
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch {
    res.status(404).json({ message: "Product not found" });
  }
});

// Add product review (logged-in user)
router.post("/:id/reviews", protect, async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const rating = Number(req.body.rating);
  const comment = (req.body.comment || "").trim();

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5" });
  }

  const user = await User.findById(req.user).select("name");
  const userName = user?.name || "User";

  const review = {
    user: userName,
    rating,
    comment
  };

  product.reviews.push(review);
  product.rating =
    product.reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) /
    product.reviews.length;

  await product.save();
  res.status(201).json(product);
});

// DELETE product (ADMIN)
router.delete("/:id", protect, admin, async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  await product.deleteOne();
  res.json({ message: "Product deleted" });
});

module.exports = router;
