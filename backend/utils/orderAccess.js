const DIGITAL_ITEM_FIELDS = ["webReaderLink", "kindleLink", "kindleAsin", "digitalInstructions"];

const hasDigitalAccess = (o) =>
  !!o &&
  o.paymentStatus === "Paid" &&
  o.status !== "Cancelled" &&
  o.refundStatus !== "Refunded";

const hasItemDigitalAccess = (o, it) =>
  hasDigitalAccess(o) && it?.returnRequest?.status !== "Refunded";

function stripDigitalFields(item) {
  if (!item || typeof item !== "object") return item;
  const out = { ...item };
  DIGITAL_ITEM_FIELDS.forEach((f) => delete out[f]);
  if (Array.isArray(out.bundleItems)) {
    out.bundleItems = out.bundleItems.map((b) => {
      const c = { ...b };
      DIGITAL_ITEM_FIELDS.forEach((f) => delete c[f]);
      return c;
    });
  }
  return out;
}

function serializeOrderForOwner(order) {
  if (!order) return null;
  const plain = typeof order?.toObject === "function" ? order.toObject() : { ...order };
  plain.digitalAccess = hasDigitalAccess(plain);
  plain.items = (plain.items || []).map((it) => {
    const allowed = !(plain.isGift || it?.giftCode) && hasItemDigitalAccess(plain, it);
    return allowed
      ? { ...it, digitalAccess: true }
      : { ...stripDigitalFields(it), digitalAccess: false };
  });
  return plain;
}

module.exports = {
  DIGITAL_ITEM_FIELDS,
  hasDigitalAccess,
  hasItemDigitalAccess,
  stripDigitalFields,
  serializeOrderForOwner
};
