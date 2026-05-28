const User = require("../models/User");
const AdminAuditLog = require("../models/AdminAuditLog");

async function getAdminActorSnapshot(actorId) {
  if (!actorId) {
    return {
      userId: null,
      name: "",
      email: ""
    };
  }

  const actor = await User.findById(actorId).select("name email").lean();
  return {
    userId: actorId,
    name: String(actor?.name || "").trim(),
    email: String(actor?.email || "").trim().toLowerCase()
  };
}

async function logAdminAction(options = {}) {
  try {
    const req = options.req;
    const actorId = options.actorId || req?.user || null;
    let actorName = String(options.actorName || "").trim();
    let actorEmail = String(options.actorEmail || "").trim().toLowerCase();

    if (actorId && (!actorName || !actorEmail)) {
      const actor = await User.findById(actorId).select("name email").lean();
      if (actor) {
        if (!actorName) actorName = String(actor.name || "").trim();
        if (!actorEmail) actorEmail = String(actor.email || "").trim().toLowerCase();
      }
    }

    return await AdminAuditLog.create({
      actorUser: actorId || null,
      actorName,
      actorEmail,
      action: String(options.action || "").trim(),
      entityType: String(options.entityType || "").trim(),
      entityId: String(options.entityId || "").trim(),
      entityLabel: String(options.entityLabel || "").trim(),
      summary: String(options.summary || "").trim(),
      details: options.details && typeof options.details === "object" ? options.details : {}
    });
  } catch (error) {
    console.error("Failed to write admin audit log", error);
    return null;
  }
}

module.exports = {
  logAdminAction,
  getAdminActorSnapshot
};
