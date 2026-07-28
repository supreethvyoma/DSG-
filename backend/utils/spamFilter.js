/**
 * backend/utils/spamFilter.js
 *
 * Spam identifier / Spam Engine:
 *  1. Honeypot check — blocks automatic bot submissions using hidden form inputs.
 *  2. Content Blacklist & Pattern analysis — detects spam phrases/links.
 *  3. In-memory IP rate limiting — blocks request-flooding without external dependencies.
 *  4. Cloudflare Turnstile token validation — validates Turnstile challenge if configured.
 */

"use strict";

const axios = require("axios");

// ── 1. Content Analysis & Blacklist ──
const SPAM_KEYWORDS = [
  "free casino",
  "buy crypto",
  "backlinks",
  "seo backlink",
  "seo service",
  "seo traffic",
  "viagra",
  "casino",
  "earn money",
  "whatsapp spam",
  "make money online",
  "invest bitcoin",
  "adult match",
  "gift cards generator"
];

function isSpamContent(text) {
  if (!text || typeof text !== "string") return false;

  const normalized = text.toLowerCase();

  // A. Keyword matching
  const hasSpamWord = SPAM_KEYWORDS.some((word) => normalized.includes(word));
  if (hasSpamWord) return true;

  // B. Excessive URLs / Hyperlinks check
  const urlMatches = normalized.match(/https?:\/\/[^\s]+/g) || [];
  const htmlLinkMatches = normalized.match(/href\s*=\s*['"]/g) || [];
  const markdownLinkMatches = normalized.match(/\[url\s*=/g) || [];
  
  if (urlMatches.length > 1 || htmlLinkMatches.length > 0 || markdownLinkMatches.length > 0) {
    return true;
  }

  // C. Script / HTML injection patterns
  if (normalized.includes("<script") || normalized.includes("javascript:")) {
    return true;
  }

  return false;
}

// ── 2. In-Memory IP Rate Limiter ──
const ipRequestHistory = new Map();

// Regularly purge expired timestamps to prevent memory leaks (runs every 5 minutes)
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [ip, history] of ipRequestHistory.entries()) {
    const activeRequests = history.filter((time) => now - time < 15 * 60 * 1000); // 15 mins window
    if (activeRequests.length === 0) {
      ipRequestHistory.delete(ip);
    } else {
      ipRequestHistory.set(ip, activeRequests);
    }
  }
}, 5 * 60 * 1000);

if (typeof cleanupInterval.unref === "function") {
  cleanupInterval.unref();
}

function checkIpRateLimit(ip, maxRequests, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  if (!ipRequestHistory.has(ip)) {
    ipRequestHistory.set(ip, [now]);
    return true;
  }

  const history = ipRequestHistory.get(ip);
  const activeRequests = history.filter((time) => now - time < windowMs);

  if (activeRequests.length >= maxRequests) {
    return false;
  }

  activeRequests.push(now);
  ipRequestHistory.set(ip, activeRequests);
  return true;
}

// ── 3. Cloudflare Turnstile Verification ──
async function verifyTurnstileToken(token) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    // If VITE_TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY is not configured, bypass verification
    return true;
  }

  if (!token) return false;

  try {
    const response = await axios.post(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      new URLSearchParams({
        secret: secretKey,
        response: token
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      }
    );

    return !!response?.data?.success;
  } catch (error) {
    console.error("[SpamEngine] Turnstile validation failure:", error.message);
    return false;
  }
}

// ── 4. Express Middleware ──

/**
 * Honeypot + Content analysis middleware
 */
const spamFilterMiddleware = (fieldsToCheck = []) => {
  return (req, res, next) => {
    // A. Check honeypot field
    if (req.body.honey_pot_field) {
      console.warn("[SpamEngine] Honeypot triggered by bot submission!");
      // Return 200/success silently so the bot stops trying, but we discard the entry
      return res.json({ success: true, message: "Enquiry logged successfully." });
    }

    // B. Analyze target fields for spam words / links
    for (const field of fieldsToCheck) {
      const textVal = req.body[field];
      if (textVal && isSpamContent(textVal)) {
        console.warn(`[SpamEngine] Spam content blocked in field: ${field}`);
        return res.status(400).json({
          message: "Your submission contains promotional words or links flagged as spam."
        });
      }
    }

    next();
  };
};

/**
 * Rate limit reviews (max 5 per 15 minutes)
 */
const rateLimitReviews = (req, res, next) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  if (!checkIpRateLimit(ip, 5, 15 * 60 * 1000)) {
    return res.status(429).json({
      message: "You have submitted too many reviews. Please wait 15 minutes before trying again."
    });
  }
  next();
};

/**
 * Rate limit bulk enquiries (max 3 per 15 minutes)
 */
const rateLimitEnquiries = (req, res, next) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  if (!checkIpRateLimit(ip, 3, 15 * 60 * 1000)) {
    return res.status(429).json({
      message: "Too many bulk enquiries submitted from this IP. Please wait 15 minutes."
    });
  }
  next();
};

/**
 * Cloudflare Turnstile Verification Middleware
 */
const verifyTurnstile = async (req, res, next) => {
  const token = req.body.captchaToken;
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (secretKey) {
    const isHuman = await verifyTurnstileToken(token);
    if (!isHuman) {
      return res.status(400).json({
        message: "Security verification failed. Please refresh the page and try again."
      });
    }
  }

  next();
};

module.exports = {
  isSpamContent,
  checkIpRateLimit,
  verifyTurnstileToken,
  spamFilterMiddleware,
  rateLimitReviews,
  rateLimitEnquiries,
  verifyTurnstile
};
