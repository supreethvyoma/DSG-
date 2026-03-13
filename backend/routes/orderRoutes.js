const express = require("express");
const Order = require("../models/Order");
const StoreSettings = require("../models/StoreSettings");
const Coupon = require("../models/Coupon");
const protect = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

const router = express.Router();

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

// Create order (logged-in user)
router.post("/", protect, async (req, res) => {
  const shipping = req.body.shipping || {};
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const couponCode = String(req.body?.couponCode || "").trim().toUpperCase();

  const subtotal = roundMoney(
    items.reduce((sum, item) => {
      const price = Number(item?.price || 0);
      const qty = Math.max(1, Number(item?.quantity || 1));
      return sum + price * qty;
    }, 0)
  );

  const settings = (await StoreSettings.findOne()) || { gstPercent: 0, deliveryCharge: 0 };
  const gstPercent = Math.min(50, Math.max(0, Number(settings.gstPercent || 0)));
  const deliveryCharge = Math.max(0, Number(settings.deliveryCharge || 0));
  const gstAmount = roundMoney((subtotal * gstPercent) / 100);
  const grossTotal = roundMoney(subtotal + gstAmount + deliveryCharge);

  let discount = 0;
  let appliedCouponCode = "";
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode });
    if (coupon && (!coupon.expiresAt || new Date() <= coupon.expiresAt)) {
      const minOrder = Number(coupon.minOrder || 0);
      if (grossTotal >= minOrder) {
        if (coupon.type === "percentage") {
          discount = roundMoney((grossTotal * Number(coupon.value || 0)) / 100);
        } else if (coupon.type === "fixed") {
          discount = roundMoney(Number(coupon.value || 0));
        }
        discount = Math.max(0, Math.min(grossTotal, discount));
        appliedCouponCode = couponCode;
      }
    }
  }

  const total = roundMoney(Math.max(0, grossTotal - discount));

  const order = await Order.create({
    user: req.user,
    items,
    subtotal,
    gstPercent,
    gstAmount,
    couponCode: appliedCouponCode,
    discount,
    deliveryCharge,
    total,
    shipping: {
      name: shipping.name || "",
      phone: shipping.phone || "",
      address: shipping.address || ""
    }
  });

  res.json(order);
});

// Get all orders (admin only)
router.get("/", protect, admin, async (req, res) => {
  const orders = await Order.find()
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  res.json(orders);
});
// UPDATE order status (ADMIN)
router.put("/:id/status", protect, admin, async (req, res) => {
  const statusMap = {
    pending: "Pending",
    shipped: "Shipped",
    delivered: "Delivered"
  };
  const rawStatus = String(req.body.status || "").trim().toLowerCase();
  const normalizedStatus = statusMap[rawStatus];

  if (!normalizedStatus) {
    return res.status(400).json({ message: "Invalid order status" });
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  order.status = normalizedStatus;
  const updated = await order.save();

  res.json(updated);
});
// GET logged-in user's orders
router.get("/my", protect, async (req, res) => {
  const orders = await Order.find({ user: req.user }).sort({ createdAt: -1 });
  res.json(orders);
});

module.exports = router;
