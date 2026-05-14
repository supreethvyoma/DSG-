const express = require("express");
const Order = require("../models/Order");
const StoreSettings = require("../models/StoreSettings");
const Coupon = require("../models/Coupon");
const { resolveDeliveryCharge } = require("../utils/deliveryPricing");
const protect = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

const router = express.Router();

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;
const allowedPaymentStatuses = new Set(["Pending", "Paid", "Failed"]);
const allowedRefundStatuses = new Set(["Not Applicable", "Pending", "Processing", "Refunded", "Rejected"]);

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
  const deliveryCharge = resolveDeliveryCharge(settings, shipping);
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
  const rawPaymentStatus = String(req.body?.paymentStatus || "").trim();
  if (!allowedPaymentStatuses.has(rawPaymentStatus)) {
    return res.status(400).json({ message: "Invalid payment status." });
  }

  const razorpayOrderId = String(req.body?.razorpayOrderId || "").trim();
  const razorpayPaymentId = String(req.body?.razorpayPaymentId || "").trim();
  if (rawPaymentStatus === "Paid" && (!razorpayOrderId || !razorpayPaymentId)) {
    return res.status(400).json({ message: "Payment reference is required to place paid order." });
  }

  const requestedCurrency = String(req.body?.currencyDisplay?.currency || "")
    .trim()
    .toUpperCase();
  const requestedDisplayAmount = Number(req.body?.currencyDisplay?.amount);
  const requestedDetectedCountry = String(req.body?.currencyDisplay?.detectedCountry || "")
    .trim()
    .toUpperCase();

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
    paymentStatus: rawPaymentStatus,
    paymentMeta: {
      razorpayOrderId,
      razorpayPaymentId,
      paidAt: rawPaymentStatus === "Paid" ? new Date() : null
    },
    refundStatus: "Not Applicable",
    currencyDisplay: {
      currency: requestedCurrency,
      amount: Number.isFinite(requestedDisplayAmount) ? requestedDisplayAmount : null,
      detectedCountry: requestedDetectedCountry
    },
    shipping: {
      name: shipping.name || "",
      phone: shipping.phone || "",
      address: shipping.address || "",
      city: shipping.city || "",
      state: shipping.state || "",
      pincode: shipping.pincode || "",
      country: shipping.country || "",
      latitude: shipping.latitude === null || shipping.latitude === undefined ? null : Number(shipping.latitude),
      longitude: shipping.longitude === null || shipping.longitude === undefined ? null : Number(shipping.longitude)
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
    delivered: "Delivered",
    cancelled: "Cancelled"
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

  if (String(order.status || "").trim() === "Cancelled" && normalizedStatus !== "Cancelled") {
    return res.status(400).json({ message: "Cancelled orders cannot be moved back to shipping states." });
  }

  if (normalizedStatus !== "Cancelled" && String(order.paymentStatus || "").trim() !== "Paid") {
    return res.status(400).json({ message: "Order status can be updated only after payment is completed." });
  }

  order.status = normalizedStatus;
  if (normalizedStatus === "Cancelled") {
    order.cancelledAt = order.cancelledAt || new Date();
    order.refundStatus = String(order.paymentStatus || "").trim() === "Paid" ? "Pending" : "Not Applicable";
  }
  const updated = await order.save();

  res.json(updated);
});

router.put("/:id/cancel", protect, async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  const isOwner = String(order.user) === String(req.user);
  if (!isOwner) {
    return res.status(403).json({ message: "You can only cancel your own orders." });
  }

  if (String(order.status || "").trim() !== "Pending") {
    return res.status(400).json({ message: "Only pending orders can be cancelled before shipping." });
  }

  order.status = "Cancelled";
  order.cancelledAt = new Date();
  order.refundStatus = String(order.paymentStatus || "").trim() === "Paid" ? "Pending" : "Not Applicable";

  const updated = await order.save();
  res.json(updated);
});

router.put("/:id/payment-status", protect, async (req, res) => {
  const rawPaymentStatus = String(req.body?.paymentStatus || "").trim();
  const mutablePaymentStatuses = new Set(["Pending", "Paid", "Failed"]);
  if (!mutablePaymentStatuses.has(rawPaymentStatus)) {
    return res.status(400).json({ message: "Invalid payment status" });
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  const isOwner = String(order.user) === String(req.user);
  if (!isOwner) {
    return res.status(403).json({ message: "You can only update your own orders." });
  }

  order.paymentStatus = rawPaymentStatus;
  if (rawPaymentStatus === "Paid") {
    order.paymentMeta = {
      razorpayOrderId: String(req.body?.razorpayOrderId || ""),
      razorpayPaymentId: String(req.body?.razorpayPaymentId || ""),
      paidAt: new Date()
    };
  }

  const updated = await order.save();
  res.json(updated);
});

router.put("/:id/refund-status", protect, admin, async (req, res) => {
  const refundStatus = String(req.body?.refundStatus || "").trim();
  if (!allowedRefundStatuses.has(refundStatus)) {
    return res.status(400).json({ message: "Invalid refund status" });
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (String(order.status || "").trim() !== "Cancelled" || String(order.paymentStatus || "").trim() !== "Paid") {
    return res.status(400).json({ message: "Refund status can be updated only for paid cancelled orders." });
  }

  order.refundStatus = refundStatus;
  const updated = await order.save();
  res.json(updated);
});

// GET logged-in user's orders
router.get("/my", protect, async (req, res) => {
  const orders = await Order.find({ user: req.user }).sort({ createdAt: -1 });
  res.json(orders);
});

// Get single order (admin only)
router.get("/:id", protect, admin, async (req, res) => {
  const order = await Order.findById(req.params.id).populate("user", "name email").lean();

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  res.json(order);
});

module.exports = router;
