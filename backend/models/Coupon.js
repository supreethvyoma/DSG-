const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true
    },
    type: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true
    },
    value: {
      type: Number,
      required: true
    },
    minOrder: {
      type: Number,
      default: 0
    },
    expiresAt: {
      type: Date
    },
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      }
    ],
    assignedUserEmail: {
      type: String,
      default: null,
      trim: true,
      lowercase: true
    },
    usedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    usageLimit: {
      type: Number,
      default: null
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastUpdatedByName: {
      type: String,
      default: ""
    },
    lastUpdatedByEmail: {
      type: String,
      default: ""
    },
    lastUpdatedAt: {
      type: Date,
      default: null
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    },
    deletedBy: {
      name: { type: String, default: "" },
      email: { type: String, default: "" }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);
