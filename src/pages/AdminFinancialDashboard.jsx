import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import AdminSidebar from "../components/admin/AdminSidebar";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import "./AdminShared.css";
import "./AdminSalesDashboard.css";
import "./AdminFinancialDashboard.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function AdminFinancialDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get("/api/orders/analytics/finance", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data?.success) {
          setData(res.data);
        } else {
          setError("Failed to parse financial analytics.");
        }
      } catch (err) {
        console.error("Fetch financial analytics error:", err);
        setError(err.response?.data?.message || "Failed to load financial dashboard analytics.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [token]);

  // Chart Data preparation
  const monthlyTrendData = {
    labels: data?.monthlyTrends?.map((d) => d.month) || [],
    datasets: [
      {
        label: "Gross Revenue",
        data: data?.monthlyTrends?.map((d) => d.gross) || [],
        borderColor: "#2563eb",
        backgroundColor: "transparent",
        borderWidth: 2,
        tension: 0.3,
        pointBackgroundColor: "#2563eb",
        pointRadius: 3
      },
      {
        label: "Net Earnings",
        data: data?.monthlyTrends?.map((d) => d.net) || [],
        borderColor: "#10b981",
        backgroundColor: "transparent",
        borderWidth: 2,
        tension: 0.3,
        pointBackgroundColor: "#10b981",
        pointRadius: 3
      }
    ]
  };

  const feesBreakdownData = {
    labels: ["Subtotal", "GST Collected", "Delivery Collected", "Discounts Applied"],
    datasets: [
      {
        label: "Total Collection (INR)",
        data: [
          (data?.summary?.grossRevenue || 0) - (data?.summary?.taxGST || 0) - (data?.summary?.shippingCharges || 0),
          data?.summary?.taxGST || 0,
          data?.summary?.shippingCharges || 0,
          data?.summary?.discountsGiven || 0
        ],
        backgroundColor: [
          "#2563eb", // Subtotal
          "#8b5cf6", // GST
          "#d97706", // Delivery
          "#ef4444"  // Discounts
        ],
        borderRadius: 4
      }
    ]
  };

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { color: "var(--site-text, #111827)", boxWidth: 12 }
      }
    },
    scales: {
      y: {
        grid: { color: "rgba(209, 213, 219, 0.15)" },
        ticks: { color: "#64748b", font: { size: 11 } }
      },
      x: {
        grid: { display: false },
        ticks: { color: "#64748b", font: { size: 11 } }
      }
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        grid: { color: "rgba(209, 213, 219, 0.15)" },
        ticks: { color: "#64748b", font: { size: 11 } }
      },
      x: {
        grid: { display: false },
        ticks: { color: "#334155", font: { size: 12, weight: 600 } }
      }
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main financial-dashboard-page">
        <header className="admin-orders-header">
          <div>
            <p className="admin-orders-kicker">Accounting & Taxes</p>
            <h1>Financial Dashboard</h1>
            <p className="admin-orders-subtitle">
              Audit tax collections, coupon discounts, shipping charges, and calculate net earnings.
            </p>
          </div>
        </header>

        {error && <p className="admin-orders-feedback error">{error}</p>}

        {isLoading ? (
          <div className="admin-dashboard-loading">
            <div className="admin-dashboard-spinner" />
            <p>Processing financial registers...</p>
          </div>
        ) : (
          <>
            {/* Financial Cards Grid */}
            <section className="admin-orders-overview" aria-label="Financial summaries grid">
              <article className="admin-overview-card">
                <p className="admin-overview-label">Gross Revenue</p>
                <p className="admin-overview-value text-blue">
                  Rs {(data?.summary?.grossRevenue || 0).toLocaleString("en-IN")}
                </p>
              </article>
              <article className="admin-overview-card">
                <p className="admin-overview-label">Tax (GST) Collected</p>
                <p className="admin-overview-value text-purple">
                  Rs {(data?.summary?.taxGST || 0).toLocaleString("en-IN")}
                </p>
              </article>
              <article className="admin-overview-card">
                <p className="admin-overview-label">Delivery Charges</p>
                <p className="admin-overview-value text-amber">
                  Rs {(data?.summary?.shippingCharges || 0).toLocaleString("en-IN")}
                </p>
              </article>
              <article className="admin-overview-card">
                <p className="admin-overview-label">Discounts Applied</p>
                <p className="admin-overview-value text-red">
                  Rs {(data?.summary?.discountsGiven || 0).toLocaleString("en-IN")}
                </p>
              </article>
              <article className="admin-overview-card highlight-green">
                <p className="admin-overview-label">Net Earnings</p>
                <p className="admin-overview-value text-green">
                  Rs {(data?.summary?.netRevenue || 0).toLocaleString("en-IN")}
                </p>
                <small className="admin-overview-subnote">Gross Revenue - GST - Shipping</small>
              </article>
            </section>

            {/* Charts Row */}
            <div className="sales-dashboard-grid">
              <div className="sales-dashboard-chart-card double-width">
                <h3>📈 Revenue & Profit Growth</h3>
                <div className="chart-container">
                  <Line data={monthlyTrendData} options={trendOptions} />
                </div>
              </div>

              <div className="sales-dashboard-chart-card">
                <h3>📊 Fee Components Breakdown</h3>
                <div className="chart-container">
                  <Bar data={feesBreakdownData} options={barOptions} />
                </div>
              </div>
            </div>

            {/* Recent Transactions Ledger */}
            <div className="financial-ledger-card">
              <h3>📒 Recent Transaction Audit Ledger</h3>
              <div className="admin-orders-table-wrap">
                <table className="admin-orders-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Subtotal</th>
                      <th>GST</th>
                      <th>Delivery</th>
                      <th>Discount</th>
                      <th>Total Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recentTransactions?.length > 0 ? (
                      data.recentTransactions.map((tx) => (
                        <tr key={tx._id}>
                          <td className="order-code">#{tx._id.slice(-6).toUpperCase()}</td>
                          <td>{new Date(tx.createdAt).toLocaleDateString("en-IN")}</td>
                          <td>
                            <strong>{tx.customer}</strong>
                            <small style={{ display: "block", color: "#64748b" }}>{tx.email}</small>
                          </td>
                          <td>Rs {tx.subtotal.toFixed(2)}</td>
                          <td>Rs {tx.gstAmount.toFixed(2)}</td>
                          <td>Rs {tx.deliveryCharge.toFixed(2)}</td>
                          <td className={tx.discount > 0 ? "text-red" : ""}>
                            {tx.discount > 0 ? `- Rs ${tx.discount.toFixed(2)}` : "—"}
                          </td>
                          <td>
                            <strong>Rs {tx.total.toFixed(2)}</strong>
                            <span className="finance-payment-pill">Paid</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" style={{ textAlign: "center", padding: "30px" }}>
                          No transactions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default AdminFinancialDashboard;
