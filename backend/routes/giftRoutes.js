const express = require("express");
const GiftPass = require("../models/GiftPass");
const Product = require("../models/Product");
const Order = require("../models/Order");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Helper to generate a unique Gift Pass Code (e.g. GIFT-DSG-849201)
const generateGiftCode = () => {
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `GIFT-DSG-${randomStr}`;
};

// Redeem a Gift Pass Code (logged-in recipient)
router.post("/redeem", protect, async (req, res) => {
  try {
    const rawCode = String(req.body?.code || "").trim().toUpperCase();
    if (!rawCode) {
      return res.status(400).json({ message: "Please enter a Gift Pass Code." });
    }

    const giftPass = await GiftPass.findOne({ code: rawCode });
    if (!giftPass) {
      return res.status(404).json({ message: "Invalid Gift Pass Code. Please double check the code." });
    }

    if (giftPass.isRedeemed) {
      return res.status(400).json({ message: "This Gift Pass has already been redeemed." });
    }

    // Check if the user already owns this product
    const alreadyPurchased = await Order.findOne({
      user: req.user,
      paymentStatus: "Paid",
      "items.product": giftPass.product
    });

    const alreadyRedeemed = await GiftPass.findOne({
      redeemedBy: req.user,
      product: giftPass.product,
      isRedeemed: true
    });

    if (alreadyPurchased || alreadyRedeemed) {
      return res.status(400).json({
        message: "You already own this web version in your library. Please share this Gift Pass code with someone else."
      });
    }

    giftPass.isRedeemed = true;
    giftPass.redeemedBy = req.user;
    giftPass.redeemedAt = new Date();
    await giftPass.save();

    const product = await Product.findById(giftPass.product).lean();

    return res.json({
      success: true,
      message: `Congratulations! You have successfully redeemed "${giftPass.productName || product?.name || 'Digital Item'}"!`,
      product
    });
  } catch (err) {
    console.error("[GiftRoutes] Redeem error:", err.message);
    return res.status(500).json({ message: "Failed to redeem Gift Pass. Please try again." });
  }
});

// Get user's redeemed gift passes
router.get("/my-redeemed", protect, async (req, res) => {
  try {
    const redeemedPasses = await GiftPass.find({ redeemedBy: req.user, isRedeemed: true })
      .populate("product")
      .sort({ redeemedAt: -1 })
      .lean();

    return res.json(redeemedPasses);
  } catch (err) {
    console.error("[GiftRoutes] Fetch redeemed error:", err.message);
    return res.status(500).json({ message: "Failed to fetch redeemed gift passes." });
  }
});

module.exports = {
  router,
  generateGiftCode
};
