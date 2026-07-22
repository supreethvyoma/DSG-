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
import { Line, Doughnut, Bar } from "react-chartjs-2";
import "./AdminShared.css";
import "./AdminSalesDashboard.css";

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

function AdminSalesDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get("/api/orders/analytics/sales", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data?.success) {
          setData(res.data);
        } else {
          setError("Failed to parse sales analytics.");
        }
      } catch (err) {
        console.error("Fetch sales analytics error:", err);
        setError(err.response?.data?.message || "Failed to load sales dashboard analytics.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [token]);

  // Chart Data preparation
  const monthlyTrendData = {
    labels: data?.monthlySalesTrends?.map((d) => d.month) || [],
    datasets: [
      {
        label: "Sales Volume (INR)",
        data: data?.monthlySalesTrends?.map((d) => d.amount) || [],
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.05)",
        borderWidth: 2.5,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: "#2563eb",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  const formatDistributionData = {
    labels: data?.formatDistribution ? Object.keys(data.formatDistribution) : [],
    datasets: [
      {
        data: data?.formatDistribution ? Object.values(data.formatDistribution) : [],
        backgroundColor: [
          "#2563eb", // Web Version (Blue)
          "#d97706", // Flipbook (Amber)
          "#ff9900", // Kindle (Orange)
          "#10b981", // Paperback (Green)
          "#8b5cf6", // E-Book/PDF (Purple)
          "#64748b"  // Other (Slate)
        ],
        borderWidth: 2,
        borderColor: "var(--site-surface, #ffffff)"
      }
    ]
  };

  const topProductsData = {
    labels: data?.topProducts?.map((p) => p.name.length > 25 ? p.name.slice(0, 25) + "..." : p.name) || [],
    datasets: [
      {
        label: "Units Sold",
        data: data?.topProducts?.map((p) => p.quantity) || [],
        backgroundColor: "rgba(217, 119, 6, 0.85)",
        borderColor: "#d97706",
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  const trendOptions = {
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
        ticks: { color: "#64748b", font: { size: 11 } }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: {
          color: "var(--site-text, #111827)",
          font: { size: 11.5, weight: "bold" },
          padding: 14
        }
      }
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        grid: { color: "rgba(209, 213, 219, 0.15)" },
        ticks: { color: "#64748b", font: { size: 11 } }
      },
      y: {
        grid: { display: false },
        ticks: { color: "#334155", font: { size: 11.5, weight: 600 } }
      }
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main sales-dashboard-page">
        <header className="admin-orders-header">
          <div>
            <p className="admin-orders-kicker">Analytics & Insights</p>
            <h1>Sales Dashboard</h1>
            <p className="admin-orders-subtitle">
              Monitor catalog orders growth, format distributions, and top-selling product assets.
            </p>
          </div>
        </header>

        {error && <p className="admin-orders-feedback error">{error}</p>}

        {isLoading ? (
          <div className="admin-dashboard-loading">
            <div className="admin-dashboard-spinner" />
            <p>Gathering analytics data...</p>
          </div>
        ) : (
          <>
            {/* Sales Summary Statistics */}
            <section className="admin-orders-overview" aria-label="Sales summary statistics">
              <article className="admin-overview-card">
                <p className="admin-overview-label">Gross Revenue</p>
                <p className="admin-overview-value text-blue">
                  Rs {(data?.summary?.totalRevenue || 0).toLocaleString("en-IN")}
                </p>
              </article>
              <article className="admin-overview-card">
                <p className="admin-overview-label">Total Orders</p>
                <p className="admin-overview-value">{data?.summary?.totalOrders}</p>
              </article>
              <article className="admin-overview-card">
                <p className="admin-overview-label">Items Sold</p>
                <p className="admin-overview-value">{data?.summary?.totalItemsSold}</p>
              </article>
              <article className="admin-overview-card">
                <p className="admin-overview-label">Average Order Value</p>
                <p className="admin-overview-value text-amber">
                  Rs {(data?.summary?.averageOrderValue || 0).toLocaleString("en-IN")}
                </p>
              </article>
            </section>

            {/* Dashboard Graphs Row 1 */}
            <div className="sales-dashboard-grid">
              <div className="sales-dashboard-chart-card double-width">
                <h3>📈 Monthly Sales Performance</h3>
                <div className="chart-container">
                  <Line data={monthlyTrendData} options={trendOptions} />
                </div>
              </div>

              <div className="sales-dashboard-chart-card">
                <h3>📖 Sales by Product Format</h3>
                <div className="chart-container">
                  <Doughnut data={formatDistributionData} options={doughnutOptions} />
                </div>
              </div>
            </div>

            {/* Dashboard Graphs Row 2 */}
            <div className="sales-dashboard-grid">
              <div className="sales-dashboard-chart-card double-width">
                <h3>🏆 Top 10 Best-Selling Products</h3>
                <div className="chart-container">
                  <Bar data={topProductsData} options={barOptions} />
                </div>
              </div>

              <div className="sales-dashboard-chart-card">
                <h3>🌍 Geographic Sales Distribution</h3>
                <div className="sales-geo-list">
                  {data?.geographicDistribution?.length > 0 ? (
                    data.geographicDistribution.map((geo, index) => (
                      <div key={`${geo.name}-${index}`} className="sales-geo-row">
                        <span className="sales-geo-name">📍 {geo.name}</span>
                        <strong className="sales-geo-count">
                          {geo.count} order{geo.count === 1 ? "" : "s"}
                        </strong>
                      </div>
                    ))
                  ) : (
                    <p style={{ margin: "20px 0", color: "#64748b", textAlign: "center" }}>
                      No location data captured yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default AdminSalesDashboard;
