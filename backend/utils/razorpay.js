const Razorpay = require("razorpay");

let razorpay = null;

function getRazorpayClient() {
  if (razorpay) {
    return razorpay;
  }

  const razorpaySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || "";

  if (!process.env.RAZORPAY_KEY_ID || !razorpaySecret) {
    throw new Error("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (or RAZORPAY_SECRET).");
  }

  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: razorpaySecret
  });

  return razorpay;
}

module.exports = getRazorpayClient;
