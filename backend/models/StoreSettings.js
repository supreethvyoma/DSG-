const mongoose = require("mongoose");

const SITE_THEMES = ["sunrise", "forest", "midnight"];
const customThemeSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: "",
      trim: true
    },
    palette: {
      bg: { type: String, required: true, trim: true },
      surface: { type: String, required: true, trim: true },
      text: { type: String, required: true, trim: true },
      header: { type: String, required: true, trim: true },
      accent: { type: String, required: true, trim: true },
      button: { type: String, required: true, trim: true }
    }
  },
  { _id: false }
);

const storeSettingsSchema = new mongoose.Schema(
  {
    gstPercent: {
      type: Number,
      default: 18,
      min: 0,
      max: 50
    },
    deliveryCharge: {
      type: Number,
      default: 0,
      min: 0
    },
    siteTheme: {
      type: String,
      default: "sunrise"
    },
    customThemes: {
      type: [customThemeSchema],
      default: []
    }
  },
  { timestamps: true }
);

storeSettingsSchema.statics.SITE_THEMES = SITE_THEMES;

module.exports = mongoose.model("StoreSettings", storeSettingsSchema);
