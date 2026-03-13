const express = require("express");
const StoreSettings = require("../models/StoreSettings");
const protect = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

const router = express.Router();
const DEFAULT_THEME = "sunrise";
const HEX_COLOR_REGEX = /^#([0-9a-f]{6})$/i;

function sanitizeThemeId(value, fallback = "custom-theme") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || fallback;
}

function normalizeCustomThemes(input) {
  if (!Array.isArray(input)) return [];

  const usedIds = new Set(StoreSettings.SITE_THEMES);

  return input.reduce((acc, item, index) => {
    const name = String(item?.name || "").trim();
    if (!name) {
      return acc;
    }

    const palette = {
      bg: String(item?.palette?.bg || "").trim(),
      surface: String(item?.palette?.surface || "").trim(),
      text: String(item?.palette?.text || "").trim(),
      header: String(item?.palette?.header || "").trim(),
      accent: String(item?.palette?.accent || "").trim(),
      button: String(item?.palette?.button || "").trim()
    };

    const paletteValid = Object.values(palette).every((color) => HEX_COLOR_REGEX.test(color));
    if (!paletteValid) {
      return acc;
    }

    let id = sanitizeThemeId(item?.id || name, `custom-theme-${index + 1}`);
    while (usedIds.has(id)) {
      id = `${id}-${index + 1}`;
    }
    usedIds.add(id);

    acc.push({
      id,
      name,
      description: String(item?.description || "").trim(),
      palette
    });

    return acc;
  }, []);
}

function normalizeSettings(settings) {
  return {
    gstPercent: Number(settings?.gstPercent || 0),
    deliveryCharge: Number(settings?.deliveryCharge || 0),
    siteTheme: String(settings?.siteTheme || DEFAULT_THEME),
    customThemes: normalizeCustomThemes(settings?.customThemes || [])
  };
}

async function getOrCreateSettings() {
  let settings = await StoreSettings.findOne();
  if (!settings) {
    settings = await StoreSettings.create({});
  }
  return settings;
}

router.get("/", async (req, res) => {
  const settings = await getOrCreateSettings();
  res.json(normalizeSettings(settings));
});

router.put("/", protect, admin, async (req, res) => {
  const rawGst = Number(req.body?.gstPercent);
  const rawDelivery = Number(req.body?.deliveryCharge);
  const rawTheme = String(req.body?.siteTheme || "").trim().toLowerCase();
  const hasSiteTheme = Boolean(String(req.body?.siteTheme || "").trim());
  const hasCustomThemes = Array.isArray(req.body?.customThemes);

  const gstPercent = Number.isNaN(rawGst) ? 0 : Math.min(50, Math.max(0, rawGst));
  const deliveryCharge = Number.isNaN(rawDelivery) ? 0 : Math.max(0, rawDelivery);

  const settings = await getOrCreateSettings();
  const customThemes = hasCustomThemes
    ? normalizeCustomThemes(req.body?.customThemes)
    : normalizeCustomThemes(settings.customThemes || []);
  const allowedThemeIds = new Set([
    ...StoreSettings.SITE_THEMES,
    ...customThemes.map((theme) => theme.id)
  ]);

  settings.gstPercent = Number.isNaN(rawGst) ? settings.gstPercent : gstPercent;
  settings.deliveryCharge = Number.isNaN(rawDelivery) ? settings.deliveryCharge : deliveryCharge;
  settings.customThemes = customThemes;
  settings.siteTheme = hasSiteTheme && allowedThemeIds.has(rawTheme)
    ? rawTheme
    : allowedThemeIds.has(settings.siteTheme)
      ? settings.siteTheme
      : DEFAULT_THEME;
  await settings.save();

  res.json(normalizeSettings(settings));
});

module.exports = router;
