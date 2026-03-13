const express = require("express");
const getRazorpayClient = require("../utils/razorpay");
const crypto = require("crypto");

const router = express.Router();

router.post("/create-order", async (req, res) => {
  try {
    const razorpay = getRazorpayClient();
    const amount = Number(req.body?.amount || 0);
    if (Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `order_${Date.now()}`
    });

    return res.json(order);
  } catch (error) {
    const message =
      error?.error?.description ||
      error?.error?.reason ||
      error?.message ||
      "Failed to create Razorpay order";

    console.error("Razorpay create-order failed:", message);
    return res.status(500).json({
      message
    });
  }
});

router.post("/verify", async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = req.body || {};

  const body = `${razorpay_order_id || ""}|${razorpay_payment_id || ""}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET || "")
    .update(body)
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    return res.json({ success: true });
  }

  return res.status(400).json({ success: false });
});

module.exports = router;
