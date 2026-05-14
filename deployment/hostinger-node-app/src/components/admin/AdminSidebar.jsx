import { NavLink } from "react-router-dom";
import "../../pages/AdminDashboard.css";

const adminNavItems = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/products", label: "Warehouse" },
  { to: "/admin/add-products", label: "Add Products" },
  { to: "/admin/coupons", label: "Coupons" },
  { to: "/", label: "Store" }
];

function AdminSidebar() {
  return (
    <aside className="sidebar">
      <h2>Admin</h2>
      <nav>
        {adminNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/admin"}
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default AdminSidebar;
