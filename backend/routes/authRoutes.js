const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const axios = require("axios");
const User = require("../models/User");
const AdminAuditLog = require("../models/AdminAuditLog");
const protect = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const { logAdminAction } = require("../utils/adminAudit");
const { sendEmail } = require("../utils/email");

const router = express.Router();

// ── Rate limiters ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // max 20 login attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in 15 minutes." }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,                   // max 10 registrations per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many accounts created. Please try again later." }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const getTokenExpiry = (rememberMe) => (rememberMe ? "30d" : "12h");

const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || "").trim().toLowerCase());

const normalizeAddress = (item = {}, index = 0) => {
  const normalizedLabel = ["Home", "Work", "Other"].includes(String(item?.label || "").trim())
    ? String(item.label).trim()
    : "Home";

  const latitudeRaw = item?.latitude;
  const longitudeRaw = item?.longitude;
  const latitude =
    latitudeRaw === null || latitudeRaw === undefined || latitudeRaw === "" ? null : Number(latitudeRaw);
  const longitude =
    longitudeRaw === null || longitudeRaw === undefined || longitudeRaw === "" ? null : Number(longitudeRaw);

  return {
    label: normalizedLabel,
    name: String(item?.name || "").trim(),
    phone: String(item?.phone || "").trim(),
    address: String(item?.address || "").trim(),
    landmark: String(item?.landmark || "").trim(),
    city: String(item?.city || "").trim(),
    state: String(item?.state || "").trim(),
    pincode: String(item?.pincode || "").trim(),
    country: String(item?.country || "").trim() || "India",
    latitude: Number.isNaN(latitude) ? null : latitude,
    longitude: Number.isNaN(longitude) ? null : longitude,
    isDefault: Boolean(item?.isDefault && index >= 0)
  };
};

const normalizeAddressList = (rawAddresses = []) => {
  const list = Array.isArray(rawAddresses) ? rawAddresses : [];
  const normalized = list.map((item, index) => normalizeAddress(item, index));

  if (normalized.length > 0 && !normalized.some((item) => item.isDefault)) {
    normalized[0].isDefault = true;
  }

  let defaultSeen = false;
  return normalized.map((item) => {
    if (!item.isDefault) return item;
    if (!defaultSeen) {
      defaultSeen = true;
      return item;
    }
    return { ...item, isDefault: false };
  });
};

// ── Routes ────────────────────────────────────────────────────────────────────

router.get("/register", (_req, res) => {
  res.status(405).json({ message: "Use POST /api/auth/register with name, email, and password." });
});

router.post("/register", registerLimiter, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const { rememberMe } = req.body;

    if (!name || name.length < 2) {
      return res.status(400).json({ message: "Name must be at least 2 characters." });
    }
    if (name.length > 80) {
      return res.status(400).json({ message: "Name must be 80 characters or fewer." });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }
    if (password.length > 128) {
      return res.status(400).json({ message: "Password must be 128 characters or fewer." });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "An account with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashedPassword });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: getTokenExpiry(rememberMe === true) }
    );

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token
    });
  } catch (err) {
    console.error("[Auth] Register error:", err.message);
    res.status(500).json({ message: "Registration failed. Please try again." });
  }
});

router.get("/login", (_req, res) => {
  res.status(405).json({ message: "Use POST /api/auth/login with email and password." });
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const { rememberMe } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }
    if (!password) {
      return res.status(400).json({ message: "Password is required." });
    }

    const user = await User.findOne({ email });

    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: getTokenExpiry(rememberMe === true) }
      );
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        token
      });
    }

    res.status(401).json({ message: "Invalid email or password." });
  } catch (err) {
    console.error("[Auth] Login error:", err.message);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
});

router.put("/make-admin", protect, admin, async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isAdmin) {
      return res.json({ message: "User is already an admin" });
    }

    const actor = await User.findById(req.user).select("name email").lean();
    user.isAdmin = true;
    user.adminGrantedAt = new Date();
    user.adminGrantedByName = String(actor?.name || "").trim();
    user.adminGrantedByEmail = String(actor?.email || "").trim().toLowerCase();
    await user.save();

    await logAdminAction({
      req,
      actorName: actor?.name,
      actorEmail: actor?.email,
      action: "admin-access-granted",
      entityType: "user",
      entityId: String(user._id || ""),
      entityLabel: user.email,
      summary: `Granted admin access to ${user.email}`,
      details: {
        targetUserName: String(user.name || "").trim(),
        targetUserEmail: user.email
      }
    });

    res.json({ message: `${user.email} is now an admin` });
  } catch (err) {
    console.error("[Auth] Make-admin error:", err.message);
    res.status(500).json({ message: "Failed to update admin status." });
  }
});

router.post("/activity", protect, async (req, res) => {
  try {
    const raw = Number(req.body?.timeSpentSec || 0);
    const safeTimeSpentSec = Number.isNaN(raw) ? 0 : Math.max(0, Math.min(600, raw));

    const user = await User.findById(req.user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.lastActiveAt = new Date();
    user.totalTimeSpentSec = Math.max(0, Number(user.totalTimeSpentSec || 0) + safeTimeSpentSec);
    await user.save();

    res.json({ ok: true });
  } catch (err) {
    console.error("[Auth] Activity error:", err.message);
    res.status(500).json({ message: "Failed to record activity." });
  }
});

router.get("/admin/audit-logs", protect, admin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 10)));
    const skip = (page - 1) * limit;

    const total = await AdminAuditLog.countDocuments();
    const logs = await AdminAuditLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const recentAdminActions = logs.map((entry) => ({
      _id: String(entry?._id || ""),
      actorUser: entry?.actorUser ? String(entry.actorUser) : "",
      actorName: String(entry?.actorName || "").trim() || "Admin",
      actorEmail: String(entry?.actorEmail || "").trim().toLowerCase(),
      action: String(entry?.action || "").trim(),
      entityType: String(entry?.entityType || "").trim(),
      entityId: String(entry?.entityId || "").trim(),
      entityLabel: String(entry?.entityLabel || "").trim(),
      summary: String(entry?.summary || "").trim(),
      details: entry?.details && typeof entry.details === "object" ? entry.details : {},
      createdAt: entry?.createdAt || null
    }));

    res.json({
      recentAdminActions,
      total,
      hasMore: skip + logs.length < total
    });
  } catch (err) {
    console.error("[Auth] Audit logs pagination error:", err.message);
    res.status(500).json({ message: "Failed to load audit logs." });
  }
});

router.get("/admin/users-metrics", protect, admin, async (req, res) => {
  try {
    const users = await User.find().select("name email isAdmin lastActiveAt totalTimeSpentSec").lean();
    const adminUsersRaw = await User.find({ isAdmin: true })
      .select("name email isAdmin adminGrantedAt adminGrantedByName adminGrantedByEmail lastActiveAt")
      .sort({ adminGrantedAt: -1, createdAt: -1 })
      .lean();
    const now = Date.now();
    const activeWindowMs = 5 * 60 * 1000;

    const mappedUsers = users
      .map((user) => {
        const lastActiveTs = user?.lastActiveAt ? new Date(user.lastActiveAt).getTime() : NaN;
        const isActive = !Number.isNaN(lastActiveTs) && now - lastActiveTs <= activeWindowMs;
        return {
          _id: String(user?._id || ""),
          name: user?.name || "User",
          email: user?.email || "",
          isAdmin: Boolean(user?.isAdmin),
          lastActiveAt: user?.lastActiveAt || null,
          totalTimeSpentSec: Math.max(0, Number(user?.totalTimeSpentSec || 0)),
          isActive
        };
      })
      .sort((a, b) => {
        const aTs = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
        const bTs = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
        return bTs - aTs;
      });

    const totalUsers = mappedUsers.length;
    const activeUsers = mappedUsers.filter((user) => user.isActive).length;
    const totalTimeSpentSec = mappedUsers.reduce((sum, user) => sum + Number(user.totalTimeSpentSec || 0), 0);

    const latestAdminActionByEmail = new Map();

    const admins = adminUsersRaw.map((user) => {
      const key = String(user?.email || "").trim().toLowerCase();
      const latestAction = latestAdminActionByEmail.get(key) || null;
      const lastActiveTs = user?.lastActiveAt ? new Date(user.lastActiveAt).getTime() : NaN;
      return {
        _id: String(user?._id || ""),
        name: user?.name || "Admin",
        email: user?.email || "",
        isActive: !Number.isNaN(lastActiveTs) && now - lastActiveTs <= activeWindowMs,
        lastActiveAt: user?.lastActiveAt || null,
        adminGrantedAt: user?.adminGrantedAt || null,
        adminGrantedByName: String(user?.adminGrantedByName || "").trim(),
        adminGrantedByEmail: String(user?.adminGrantedByEmail || "").trim().toLowerCase(),
        latestActionAt: latestAction?.createdAt || null,
        latestActionSummary: latestAction?.summary || "",
        latestActionType: latestAction?.action || ""
      };
    });

    res.json({ totalUsers, activeUsers, totalTimeSpentSec, users: mappedUsers.slice(0, 30), admins, recentAdminActions: [] });
  } catch (err) {
    console.error("[Auth] Users-metrics error:", err.message);
    res.status(500).json({ message: "Failed to load user metrics." });
  }
});

router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user).select("_id name email isAdmin addresses");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: Boolean(user.isAdmin),
      addresses: normalizeAddressList(user.addresses || [])
    });
  } catch (err) {
    console.error("[Auth] /me error:", err.message);
    res.status(500).json({ message: "Failed to load account." });
  }
});

router.get("/addresses", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user).select("addresses");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ addresses: normalizeAddressList(user.addresses || []) });
  } catch (err) {
    console.error("[Auth] Addresses error:", err.message);
    res.status(500).json({ message: "Failed to load addresses." });
  }
});

router.put("/addresses", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user).select("addresses");
    if (!user) return res.status(404).json({ message: "User not found" });
    const normalized = normalizeAddressList(req.body?.addresses || []);
    user.addresses = normalized.slice(0, 20);
    await user.save();
    res.json({ addresses: normalizeAddressList(user.addresses || []) });
  } catch (err) {
    console.error("[Auth] Update addresses error:", err.message);
    res.status(500).json({ message: "Failed to update addresses." });
  }
});

// ── Password Reset Flow ──────────────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Standard security: do not leak existence of user, just say it's sent
      return res.json({ message: "If that email is registered, a password reset link has been sent." });
    }

    const token = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Construct reset link using HashRouter structure
    const resetUrl = `${req.protocol}://${req.get("host")}/#/reset-password?token=${token}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #1a1a2e;">Password Reset Request</h2>
        <p>Hello ${user.name || "User"},</p>
        <p>You requested a password reset for your account. Please click the button below to set a new password:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #e94560; color: white; padding: 12px 24px; text-decoration: none; border-radius: 10px; display: inline-block; font-weight: bold;">Reset Password</a>
        </p>
        <p>Or copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #666;"><a href="${resetUrl}">${resetUrl}</a></p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 0.85em; color: #999;">This link will expire in 1 hour. If you did not request this, you can safely ignore this email.</p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: "Password Reset Link",
      html: htmlContent,
      type: "password-reset"
    });

    res.json({ message: "If that email is registered, a password reset link has been sent." });
  } catch (err) {
    console.error("[Auth] Forgot password error:", err.message);
    res.status(500).json({ message: "Failed to request password reset. Please try again." });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Password reset token is required." });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }
    if (password.length > 128) {
      return res.status(400).json({ message: "Password must be 128 characters or fewer." });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Password reset token is invalid or has expired." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: "Your password has been successfully updated. You can now log in." });
  } catch (err) {
    console.error("[Auth] Reset password error:", err.message);
    res.status(500).json({ message: "Failed to reset password. Please try again." });
  }
});

// ── Google Sign-In ───────────────────────────────────────────────────────────
router.post("/google", async (req, res) => {
  try {
    const { idToken, rememberMe } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "Google ID Token is required." });
    }

    let email = "";
    let name = "";

    // Check for dev/testing simulation token
    if (idToken.startsWith("mock-google-token-")) {
      email = "mock.google.user@example.com";
      name = "Demo Google User";
    } else {
      const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
      const googleRes = await axios.get(tokenInfoUrl);
      
      const payload = googleRes.data;
      if (!payload || !payload.email) {
        return res.status(400).json({ message: "Invalid Google token payload." });
      }

      email = String(payload.email).trim().toLowerCase();
      name = String(payload.name || payload.given_name || "Google User").trim();
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email from Google account." });
    }

    let user = await User.findOne({ email });
    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 12);
      user = await User.create({
        name,
        email,
        password: hashedPassword
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: getTokenExpiry(rememberMe === true) }
    );

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: Boolean(user.isAdmin),
      token
    });
  } catch (err) {
    console.error("[Auth] Google sign-in validation error:", err?.response?.data || err.message);
    res.status(401).json({ message: "Google verification failed. Please try again." });
  }
});

module.exports = router;
