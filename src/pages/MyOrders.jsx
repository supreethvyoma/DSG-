import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import { generateInvoicePdf } from "../utils/invoicePdf";
import { formatCurrencyForUser } from "../utils/currency";
import { formatDate } from "../utils/date";
import "./MyOrders.css";

function MyOrders() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!token) return;

    axios
      .get("http://localhost:5000/api/orders/my", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => setOrders(res.data))
      .catch(() => setOrders([]));
  }, [token]);

  const generateInvoice = (order) => {
    generateInvoicePdf(order, {
      customerName: order?.shipping?.name || "Customer",
      customerEmail: "N/A",
      filePrefix: "invoice"
    });
  };

  return (
    <div className="my-orders-page">
      <h1>My Orders</h1>

      {orders.length === 0 && <p className="my-orders-empty">No orders yet.</p>}

      {orders.map((order) => {
        const status = String(order.status || "Pending");
        const canDownloadInvoice = status === "Shipped" || status === "Delivered";

        return (
          <div key={order._id} className="my-order-card">
          <p>
            <strong>Order ID:</strong> {order._id}
          </p>

          <p>
            <strong>Date:</strong> {formatDate(order.createdAt)}
          </p>

          <p>
            <strong>Total:</strong> {formatCurrencyForUser(order.total)}
          </p>

          <p>
            <strong>Status:</strong>{" "}
            <span className="my-order-status">{status}</span>
          </p>

          <div className="my-order-items">
            <strong>Items:</strong>
            {order.items?.map((item, i) => (
              <div key={i} className="my-order-item">
                {item.name} x {item.quantity || 1}
              </div>
            ))}
          </div>

          <button
            className="my-order-invoice-btn"
            disabled={!canDownloadInvoice}
            onClick={() => {
              if (!canDownloadInvoice) return;
              generateInvoice(order);
            }}
          >
            {canDownloadInvoice ? "Download Invoice" : "Invoice Available After Shipping"}
          </button>
          {!canDownloadInvoice && (
            <p className="my-order-invoice-note">
              Invoice will be available once your order status is Shipped.
            </p>
          )}
          </div>
        );
      })}
    </div>
  );
}

export default MyOrders;
