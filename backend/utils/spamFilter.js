/**
 * backend/utils/spamFilter.js
 *
 * Spam identifier / Spam Engine:
 *  1. Honeypot check — blocks automatic bot submissions using hidden form inputs.
 *  2. In-memory IP rate limiting (via express-rate-limit) — blocks review request-flooding.
 */

"use strict";

const rateLimit = require("express-rate-limit");

// ── 1. Honeypot Middleware ──
const honeypotMiddleware = (req, res, next) => {
  if (req.body.honey_pot_field) {
    console.warn("[SpamEngine] Honeypot triggered by bot submission!");
    // Return 200 silently so the bot thinks it succeeded, but we discard the entry
    return res.status(200).json({ message: "Bulk enquiry submitted successfully. Our team will contact you soon." });
  }
  next();
};

// ── 2. Review Rate Limiter Middleware ──
const reviewRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 reviews per 15 minutes
  message: { message: "You have submitted too many reviews. Please wait 15 minutes before trying again." },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  honeypotMiddleware,
  reviewRateLimiter
};
