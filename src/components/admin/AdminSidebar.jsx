import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import "../../pages/AdminShared.css";

const adminNavSections = [
  {
    title: "OVERVIEW",
    items: [
      { to: "/admin", label: "Dashboard", icon: "📊", pageKey: "dashboard" },
      { to: "/admin/sales-dashboard", label: "Sales Analytics", icon: "📈", pageKey: "sales-dashboard" },
      { to: "/admin/financial-dashboard", label: "Finance & Taxes", icon: "💳", pageKey: "financial-dashboard" }
    ]
  },
  {
    title: "MANAGEMENT",
    items: [
      { to: "/admin/orders", label: "Orders", icon: "📦", pageKey: "orders" },
      { to: "/admin/users", label: "User Insights", icon: "👥", pageKey: "users" },
      { to: "/admin/admin-access", label: "Admin Roles", icon: "🛡️", pageKey: "admin-access" }
    ]
  },
  {
    title: "CATALOG",
    items: [
      { to: "/admin/products", label: "Warehouse", icon: "🏪", pageKey: "products" },
      { to: "/admin/add-products", label: "Add Products", icon: "➕", pageKey: "add-products" }
    ]
  },
  {
    title: "ENGAGEMENT & SITE",
    items: [
      { to: "/admin/coupons", label: "Coupons", icon: "🏷️", pageKey: "coupons" },
      { to: "/admin/marketing", label: "Marketing", icon: "📣", pageKey: "marketing" },
      { to: "/admin/theme", label: "Theme & Site", icon: "🎨", pageKey: "theme" },
      { to: "/admin/security-logs", label: "Security Logs", icon: "🔐", pageKey: "security-logs" }
    ]
  }
];

function AdminSidebar() {
  const { user } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const adminLevel = Number(user?.adminLevel || 1);
  const allowedPages = Array.isArray(user?.allowedPages) ? user.allowedPages : ["dashboard"];

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setIsMobileNavOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const filteredSections = useMemo(() => {
    return adminNavSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (item.pageKey === "always") return true;
          if (adminLevel === 1) return true; // Super Admin gets all pages
          return allowedPages.includes(item.pageKey);
        })
      }))
      .filter((section) => section.items.length > 0);
  }, [adminLevel, allowedPages]);

  return (
    <>
      <button
        type="button"
        className={isMobileNavOpen ? "admin-mobile-nav-toggle active" : "admin-mobile-nav-toggle"}
        onClick={() => setIsMobileNavOpen((current) => !current)}
        aria-label={isMobileNavOpen ? "Close admin navigation" : "Open admin navigation"}
        aria-expanded={isMobileNavOpen}
      >
        <span />
        <span />
        <span />
      </button>

      <button
        type="button"
        className={isMobileNavOpen ? "admin-mobile-nav-backdrop active" : "admin-mobile-nav-backdrop"}
        aria-label="Close admin navigation"
        onClick={() => setIsMobileNavOpen(false)}
      />

      <aside className={isMobileNavOpen ? "sidebar mobile-open" : "sidebar"}>
        <div className="sidebar-head">
          <div className="sidebar-brand-box">
            <div className="sidebar-brand-icon">⚡</div>
            <div className="sidebar-brand-info">
              <h2>Admin Console</h2>
              <span className={`sidebar-role-badge ${adminLevel === 1 ? "super" : "level"}`}>
                {adminLevel === 1 ? "👑 Super Admin" : "🛡️ Sub-Admin"}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setIsMobileNavOpen(false)}
            aria-label="Close admin navigation"
          >
            ✕
          </button>
        </div>

        <nav className="sidebar-nav">
          {filteredSections.map((section) => (
            <div key={section.title} className="sidebar-nav-section">
              <span className="sidebar-section-title">{section.title}</span>
              <div className="sidebar-section-items">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/admin"}
                    className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}
                    onClick={() => setIsMobileNavOpen(false)}
                  >
                    <span className="sidebar-link-icon">{item.icon}</span>
                    <span className="sidebar-link-label">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer-box">
          <NavLink to="/" className="sidebar-storefront-btn" onClick={() => setIsMobileNavOpen(false)}>
            <span>🌐 Open Store Front</span>
            <span className="external-arrow">↗</span>
          </NavLink>
        </div>
      </aside>
    </>
  );
}

export default AdminSidebar;
