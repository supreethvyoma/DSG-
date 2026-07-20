import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import "../../pages/AdminShared.css";

const adminNavItems = [
  { to: "/admin", label: "Dashboard", pageKey: "dashboard" },
  { to: "/admin/users", label: "User Insights", pageKey: "users" },
  { to: "/admin/admin-access", label: "Admin Roles", pageKey: "admin-access" },
  { to: "/admin/orders", label: "Orders", pageKey: "orders" },
  { to: "/admin/products", label: "Warehouse", pageKey: "products" },
  { to: "/admin/add-products", label: "Add Products", pageKey: "add-products" },
  { to: "/admin/coupons", label: "Coupons", pageKey: "coupons" },
  { to: "/admin/marketing", label: "Marketing", pageKey: "marketing" },
  { to: "/admin/theme", label: "Theme & Site", pageKey: "theme" },
  { to: "/", label: "Store Front", pageKey: "always" }
];

function AdminSidebar() {
  const { user } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const adminLevel = Number(user?.adminLevel || 1);
  const currentRole = user?.adminRole || (adminLevel === 1 ? "Super Admin" : "Page Level Sub-Admin");
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

  const filteredNavItems = useMemo(() => {
    return adminNavItems.filter((item) => {
      if (item.pageKey === "always") return true;
      if (adminLevel === 1) return true; // Super Admin gets all pages
      return allowedPages.includes(item.pageKey);
    });
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
          <div>
            <h2>Admin</h2>
            <span
              style={{
                display: "inline-block",
                marginTop: "4px",
                padding: "3px 10px",
                borderRadius: "12px",
                fontSize: "11px",
                fontWeight: 700,
                backgroundColor: adminLevel === 1 ? "rgba(233, 69, 96, 0.15)" : "rgba(59, 130, 246, 0.15)",
                color: adminLevel === 1 ? "#e94560" : "#3b82f6"
              }}
            >
              {adminLevel === 1 ? `Level 1: ${currentRole}` : `Level 2: Sub-Admin`}
            </span>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setIsMobileNavOpen(false)}
            aria-label="Close admin navigation"
          >
            {"\u00D7"}
          </button>
        </div>
        <nav>
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
              className={({ isActive }) => (isActive ? "active" : undefined)}
              onClick={() => setIsMobileNavOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}

export default AdminSidebar;
