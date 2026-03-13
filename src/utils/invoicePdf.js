import { jsPDF } from "jspdf";

function toSafeNumber(value) {
  const num = Number(value);
  return Number.isNaN(num) ? 0 : num;
}

function formatCurrency(value) {
  return `Rs ${Math.round(toSafeNumber(value)).toLocaleString("en-IN")}`;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  const locale =
    (typeof navigator !== "undefined" && (navigator.languages?.[0] || navigator.language)) || "en-IN";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function generateInvoicePdf(order, options = {}) {
  const {
    customerName = order?.user?.name || order?.shipping?.name || "Customer",
    customerEmail = order?.user?.email || "N/A",
    filePrefix = "invoice"
  } = options;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  let y = 46;

  const orderId = String(order?._id || "");
  const orderCode = `#${orderId.slice(-6).toUpperCase()}`;
  const status = String(order?.status || "Pending");
  const items = Array.isArray(order?.items) ? order.items : [];
  const createdAt = formatDateTime(order?.createdAt);
  const shippingAddress = order?.shipping?.address || "N/A";
  const shippingPhone = order?.shipping?.phone || "N/A";

  const computedSubtotal = items.reduce((sum, item) => {
    const qty = Math.max(1, toSafeNumber(item?.quantity || 1));
    const unitPrice = toSafeNumber(item?.price || 0);
    return sum + qty * unitPrice;
  }, 0);

  const subtotalValue = toSafeNumber(order?.subtotal || computedSubtotal);
  const gstPercent = toSafeNumber(order?.gstPercent || 0);
  const gstValue =
    order?.gstAmount !== undefined
      ? toSafeNumber(order?.gstAmount)
      : (subtotalValue * gstPercent) / 100;
  const deliveryValue = toSafeNumber(order?.deliveryCharge || 0);
  const totalValue =
    order?.total !== undefined
      ? toSafeNumber(order?.total)
      : subtotalValue + gstValue + deliveryValue;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(`Invoice ${orderCode}`, marginX, y);
  y += 26;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Issued: ${createdAt}`, marginX, y);
  doc.text(`Status: ${status}`, 430, y);
  y += 26;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Customer Details", marginX, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Name: ${customerName}`, marginX, y);
  y += 14;
  doc.text(`Email: ${customerEmail}`, marginX, y);
  y += 14;
  doc.text(`Phone: ${shippingPhone}`, marginX, y);
  y += 14;
  doc.text(`Address: ${shippingAddress}`, marginX, y, { maxWidth: 510 });
  y += 26;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Order Items", marginX, y);
  y += 16;

  doc.setFontSize(10);
  doc.text("Item", marginX, y);
  doc.text("Qty", 340, y);
  doc.text("Unit Price", 390, y);
  doc.text("Line Total", 470, y);
  y += 8;
  doc.line(marginX, y, 555, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (items.length === 0) {
    doc.text("No items found.", marginX, y);
    y += 14;
  } else {
    items.forEach((item, index) => {
      const name = String(item?.name || item?.product?.name || `Item ${index + 1}`);
      const qty = Math.max(1, toSafeNumber(item?.quantity || 1));
      const unitPrice = toSafeNumber(item?.price || 0);
      const lineTotal = qty * unitPrice;

      const wrapped = doc.splitTextToSize(name, 280);
      doc.text(wrapped, marginX, y);
      doc.text(String(qty), 340, y);
      doc.text(formatCurrency(unitPrice), 390, y);
      doc.text(formatCurrency(lineTotal), 470, y);
      y += Math.max(14, wrapped.length * 12);

      if (y > 760) {
        doc.addPage();
        y = 46;
      }
    });
  }

  y += 10;
  doc.line(marginX, y, 555, y);
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Subtotal: ${formatCurrency(subtotalValue)}`, 370, y);
  y += 14;
  doc.text(`GST (${gstPercent}%): ${formatCurrency(gstValue)}`, 370, y);
  y += 14;
  doc.text(`Delivery: ${formatCurrency(deliveryValue)}`, 370, y);
  y += 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Total: ${formatCurrency(totalValue)}`, 400, y);

  doc.save(`${filePrefix}-${orderId.slice(-6).toUpperCase() || "order"}.pdf`);
}
