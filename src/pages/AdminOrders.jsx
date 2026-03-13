import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import AdminSidebar from "../components/admin/AdminSidebar";
import { generateInvoicePdf } from "../utils/invoicePdf";
import { formatDateForFileName, formatDateTime } from "../utils/date";
import "./AdminOrders.css";

function AdminOrders() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [fromDateTime, setFromDateTime] = useState("");
  const [toDateTime, setToDateTime] = useState("");
  const [activeQuickFilter, setActiveQuickFilter] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const allowedStatuses = ["Pending", "Shipped", "Delivered"];
  const statusStep = {
    Pending: 0,
    Shipped: 1,
    Delivered: 2
  };

  const toInputDateTime = (date) => {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const loadOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const res = await axios.get("http://localhost:5000/api/orders", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (!token) {
      return;
    }
    setIsLoadingOrders(true);
    axios
      .get("http://localhost:5000/api/orders", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => setOrders(res.data))
      .catch(() => setOrders([]))
      .finally(() => setIsLoadingOrders(false));
  }, [token]);

  const updateStatus = async (orderId, status) => {
    const safeStatus = allowedStatuses.includes(status) ? status : "Pending";
    setUpdatingOrderId(orderId);
    try {
      await axios.put(
        `http://localhost:5000/api/orders/${orderId}/status`,
        { status: safeStatus },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      await loadOrders();
    } finally {
      setUpdatingOrderId("");
    }
  };

  const filteredOrders = useMemo(() => {
    const rawFromTs = fromDateTime ? new Date(fromDateTime).getTime() : null;
    const rawToTs = toDateTime ? new Date(toDateTime).getTime() : null;

    const hasFrom = rawFromTs !== null && !Number.isNaN(rawFromTs);
    const hasTo = rawToTs !== null && !Number.isNaN(rawToTs);

    let fromTs = hasFrom ? rawFromTs : null;
    let toTs = hasTo ? rawToTs : null;

    // datetime-local usually returns YYYY-MM-DDTHH:mm; include that full minute for "to" filter.
    if (toTs !== null && toDateTime.length === 16) {
      toTs += 59_999;
    }

    // If user accidentally selects an inverted range, still return meaningful results.
    if (fromTs !== null && toTs !== null && fromTs > toTs) {
      const temp = fromTs;
      fromTs = toTs;
      toTs = temp;
    }

    return orders.filter((order) => {
      const orderTs = new Date(order.createdAt).getTime();
      if (Number.isNaN(orderTs)) return false;
      if (fromTs !== null && orderTs < fromTs) return false;
      if (toTs !== null && orderTs > toTs) return false;
      return true;
    });
  }, [orders, fromDateTime, toDateTime]);

  const statusSummary = useMemo(() => {
    return filteredOrders.reduce(
      (acc, order) => {
        const safeStatus = allowedStatuses.includes(order?.status) ? order.status : "Pending";
        acc[safeStatus] += 1;
        return acc;
      },
      { Pending: 0, Shipped: 0, Delivered: 0 }
    );
  }, [filteredOrders]);

  const visibleOrders = useMemo(() => {
    if (selectedStatus === "All") return filteredOrders;
    return filteredOrders.filter((order) => {
      const safeStatus = allowedStatuses.includes(order?.status) ? order.status : "Pending";
      return safeStatus === selectedStatus;
    });
  }, [filteredOrders, selectedStatus]);

  const exportOrdersCsv = () => {
    const headers = ["Order ID", "Customer", "Email", "Items", "Total", "Status", "Created At"];
    const rows = filteredOrders.map((order) => {
      const itemCount = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 1), 0);
      return [
        order._id,
        order.user?.name || "Unknown",
        order.user?.email || "",
        itemCount,
        Math.round(order.total || 0),
        order.status || "Pending",
        new Date(order.createdAt).toISOString()
      ];
    });

    const csv = [headers, ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-${formatDateForFileName(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const applyQuickFilter = (type) => {
    const now = new Date();
    let from = null;

    if (type === "24h") {
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (type === "7d") {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (type === "month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }

    if (!from) return;
    setFromDateTime(toInputDateTime(from));
    setToDateTime(toInputDateTime(now));
    setActiveQuickFilter(type);
  };

  const generateInvoice = (order) => {
    generateInvoicePdf(order, {
      customerName: order?.user?.name || order?.shipping?.name || "Customer",
      customerEmail: order?.user?.email || "N/A",
      filePrefix: "invoice"
    });
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main admin-orders-page">
        <div className="admin-orders-header">
          <h1>All Orders</h1>
          <div className="admin-orders-header-actions">
            <p>
              Showing {visibleOrders.length} of {orders.length}
            </p>
            <button className="export-btn" onClick={exportOrdersCsv}>
              Export Orders CSV
            </button>
          </div>
        </div>

        <section className="status-management-panel">
          <button
            className={selectedStatus === "All" ? "status-filter-chip active" : "status-filter-chip"}
            onClick={() => setSelectedStatus("All")}
          >
            All ({filteredOrders.length})
          </button>
          <button
            className={selectedStatus === "Pending" ? "status-filter-chip active" : "status-filter-chip"}
            onClick={() => setSelectedStatus("Pending")}
          >
            Pending ({statusSummary.Pending})
          </button>
          <button
            className={selectedStatus === "Shipped" ? "status-filter-chip active" : "status-filter-chip"}
            onClick={() => setSelectedStatus("Shipped")}
          >
            Shipped ({statusSummary.Shipped})
          </button>
          <button
            className={selectedStatus === "Delivered" ? "status-filter-chip active" : "status-filter-chip"}
            onClick={() => setSelectedStatus("Delivered")}
          >
            Delivered ({statusSummary.Delivered})
          </button>
        </section>

        <div className="orders-filter-bar">
          <div className="quick-filter-buttons">
            <button
              className={activeQuickFilter === "24h" ? "quick-filter-btn active" : "quick-filter-btn"}
              onClick={() => applyQuickFilter("24h")}
            >
              Last 24h
            </button>
            <button
              className={activeQuickFilter === "7d" ? "quick-filter-btn active" : "quick-filter-btn"}
              onClick={() => applyQuickFilter("7d")}
            >
              Last 7 Days
            </button>
            <button
              className={activeQuickFilter === "month" ? "quick-filter-btn active" : "quick-filter-btn"}
              onClick={() => applyQuickFilter("month")}
            >
              This Month
            </button>
          </div>
          <label>
            From
            <input
              type="datetime-local"
              value={fromDateTime}
              onChange={(e) => {
                setFromDateTime(e.target.value);
                setActiveQuickFilter("");
              }}
            />
          </label>
          <label>
            To
            <input
              type="datetime-local"
              value={toDateTime}
              onChange={(e) => {
                setToDateTime(e.target.value);
                setActiveQuickFilter("");
              }}
            />
          </label>
          <button
            className="clear-filter-btn"
            onClick={() => {
              setFromDateTime("");
              setToDateTime("");
              setActiveQuickFilter("");
            }}
          >
            Clear Filter
          </button>
        </div>

        {!isLoadingOrders && visibleOrders.length === 0 && (
          <p className="admin-orders-empty">No orders found for selected filters.</p>
        )}

        {isLoadingOrders && (
          <div className="admin-orders-table-wrap">
            <table className="admin-orders-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`orders-skeleton-${idx}`}>
                    <td><span className="skeleton-block" /></td>
                    <td><span className="skeleton-block" /></td>
                    <td><span className="skeleton-block" /></td>
                    <td><span className="skeleton-block" /></td>
                    <td><span className="skeleton-block" /></td>
                    <td><span className="skeleton-block" /></td>
                    <td><span className="skeleton-block" /></td>
                    <td><span className="skeleton-block" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoadingOrders && visibleOrders.length > 0 && (
          <div className="admin-orders-table-wrap">
            <table className="admin-orders-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => {
                  const displayStatus = allowedStatuses.includes(order.status) ? order.status : "Pending";
                  const itemCount = (order.items || []).reduce(
                    (sum, item) => sum + Number(item.quantity || 1),
                    0
                  );
                  return (
                    <tr key={order._id}>
                      <td className="order-code">#{order._id.slice(-6).toUpperCase()}</td>
                      <td>{order.user?.name || "Unknown"}</td>
                      <td>{order.user?.email || "-"}</td>
                      <td>{itemCount}</td>
                      <td>Rs {Math.round(order.total || 0)}</td>
                      <td>{formatDateTime(order.createdAt)}</td>
                      <td>
                        <div className="admin-status-update">
                          <div className="order-status-tracker">
                            {allowedStatuses.map((status, index) => {
                              const active = statusStep[displayStatus] >= index;
                              const isCurrent = displayStatus === status;
                              return (
                                <div key={`${order._id}-${status}`} className="order-status-step">
                                  <span className={active ? "tracker-dot active" : "tracker-dot"} />
                                  <span className={isCurrent ? "tracker-label current" : "tracker-label"}>
                                    {status}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="status-controls">
                            <span className={`admin-order-status status-${displayStatus.toLowerCase()}`}>
                              {displayStatus}
                            </span>
                            {displayStatus === "Pending" && (
                              <button
                                className="status-action-btn"
                                disabled={updatingOrderId === order._id}
                                onClick={() => updateStatus(order._id, "Shipped")}
                              >
                                {updatingOrderId === order._id ? "Updating..." : "Mark Shipped"}
                              </button>
                            )}
                            {displayStatus === "Shipped" && (
                              <button
                                className="status-action-btn"
                                disabled={updatingOrderId === order._id}
                                onClick={() => updateStatus(order._id, "Delivered")}
                              >
                                {updatingOrderId === order._id ? "Updating..." : "Mark Delivered"}
                              </button>
                            )}
                            <select
                              id={`status-${order._id}`}
                              value={displayStatus}
                              disabled={updatingOrderId === order._id}
                              onChange={(e) => updateStatus(order._id, e.target.value)}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                          </div>
                        </div>
                      </td>
                      <td>
                        <button className="invoice-btn" onClick={() => generateInvoice(order)}>
                          Generate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminOrders;
