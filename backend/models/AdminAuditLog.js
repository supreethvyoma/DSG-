const mongoose = require("mongoose");

const adminAuditLogSchema = new mongoose.Schema(
  {
    actorUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    actorName: {
      type: String,
      default: "",
      trim: true
    },
    actorEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true
    },
    action: {
      type: String,
      required: true,
      trim: true
    },
    entityType: {
      type: String,
      required: true,
      trim: true
    },
    entityId: {
      type: String,
      default: "",
      trim: true
    },
    entityLabel: {
      type: String,
      default: "",
      trim: true
    },
    summary: {
      type: String,
      required: true,
      trim: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminAuditLog", adminAuditLogSchema);
