import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import AdminSidebar from "../components/admin/AdminSidebar";
import { formatDate, formatTime } from "../utils/date";
import "./AdminShared.css";
import "./AdminUsers.css";

function formatTimeSpent(totalSec) {
  const sec = Math.max(0, Math.floor(Number(totalSec) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function AdminUsers() {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTimeSpentSec: 0,
    users: []
  });

  const fetchMetrics = async () => {
    try {
      const res = await axios.get("/api/auth/admin/users-metrics", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMetrics({
        totalUsers: Number(res?.data?.totalUsers || 0),
        activeUsers: Number(res?.data?.activeUsers || 0),
        totalTimeSpentSec: Number(res?.data?.totalTimeSpentSec || 0),
        users: Array.isArray(res?.data?.users) ? res.data.users : []
      });
      setError("");
    } catch {
      setMetrics({
        totalUsers: 0,
        activeUsers: 0,
        totalTimeSpentSec: 0,
        users: []
      });
      setError("Failed to load user activity metrics.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const avgTimePerUser = useMemo(() => {
    if (metrics.totalUsers <= 0) return 0;
    return metrics.totalTimeSpentSec / metrics.totalUsers;
  }, [metrics.totalTimeSpentSec, metrics.totalUsers]);

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        <div className="admin-header">
          <h1>👥 User Activity & Insights</h1>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--admin-muted)" }}>
            Live customer engagement, active online users, and time spent on site (updated every 15s).
          </p>
        </div>

        {error && <p className="pricing-message error">{error}</p>}

        <section className="users-metrics-grid">
          <div className="users-metric-card">
            <span>Total Registered Users</span>
            <strong>{metrics.totalUsers}</strong>
          </div>
          <div className="users-metric-card">
            <span>Active Users (Last 5 min)</span>
            <strong>{metrics.activeUsers}</strong>
          </div>
          <div className="users-metric-card">
            <span>Total Time Spent</span>
            <strong>{formatTimeSpent(metrics.totalTimeSpentSec)}</strong>
          </div>
          <div className="users-metric-card">
            <span>Average Time / User</span>
            <strong>{formatTimeSpent(avgTimePerUser)}</strong>
          </div>
        </section>

        <section className="card">
          <h3>Customer User Activity</h3>
          {isLoading ? (
            <p>Loading user activity...</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Email Address</th>
                    <th>Status</th>
                    <th>Total Time Spent</th>
                    <th>Last Active Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.users.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <strong>{item.name || "Customer"}</strong>
                        {item.isAdmin && (
                          <span
                            style={{
                              marginLeft: "8px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontSize: "10px",
                              backgroundColor: "rgba(233, 69, 96, 0.15)",
                              color: "#e94560",
                              fontWeight: 600
                            }}
                          >
                            Admin Account
                          </span>
                        )}
                      </td>
                      <td>{item.email || "-"}</td>
                      <td>
                        <span className={item.isActive ? "users-status active" : "users-status idle"}>
                          {item.isActive ? "Online Now" : "Offline"}
                        </span>
                      </td>
                      <td>{formatTimeSpent(item.totalTimeSpentSec)}</td>
                      <td>
                        {item.lastActiveAt
                          ? `${formatDate(item.lastActiveAt)} ${formatTime(item.lastActiveAt)}`
                          : "Never active"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {metrics.users.length === 0 && <p style={{ margin: "12px 0 0" }}>No registered users found.</p>}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default AdminUsers;
