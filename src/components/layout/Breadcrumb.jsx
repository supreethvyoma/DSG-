import { useMemo, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Breadcrumb.css";

/**
 * Route dictionary for static segment labels & parent hierarchy
 */
const ROUTE_MAP = {
  // Store Pages
  collection: { label: "Store Catalog", path: "/collection" },
  search: { label: "Search Results", path: "/search" },
  cart: { label: "Shopping Cart", path: "/cart" },
  checkout: { label: "Checkout", path: "/checkout", parent: { label: "Shopping Cart", path: "/cart" } },
  wishlist: { label: "My Wishlist", path: "/wishlist" },
  account: { label: "My Account", path: "/account" },
  "my-orders": { label: "My Orders", path: "/my-orders", parent: { label: "My Account", path: "/account" } },
  "my-library": { label: "Digital Library", path: "/my-library", parent: { label: "My Account", path: "/account" } },
  "redeem-gift": { label: "Redeem Gift Card", path: "/redeem-gift" },
  login: { label: "Sign In", path: "/login" },
  register: { label: "Create Account", path: "/register" },
  "reset-password": { label: "Reset Password", path: "/reset-password" },
  "guest-buy": { label: "Quick Checkout", path: "/guest-buy" },
  about: { label: "About Us", path: "/about" },
  faq: { label: "FAQs", path: "/faq" },
  contact: { label: "Contact Us", path: "/contact" },
  "shipping-policy": { label: "Shipping Policy", path: "/shipping-policy" },

  // Admin Pages
  admin: { label: "Admin Console", path: "/admin" },
  "sales-dashboard": { label: "Sales Analytics", path: "/admin/sales-dashboard", parent: { label: "Admin Console", path: "/admin" } },
  "financial-dashboard": { label: "Finance & Taxes", path: "/admin/financial-dashboard", parent: { label: "Admin Console", path: "/admin" } },
  orders: { label: "Orders", path: "/admin/orders", parent: { label: "Admin Console", path: "/admin" } },
  products: { label: "Products Catalog", path: "/admin/products", parent: { label: "Admin Console", path: "/admin" } },
  "add-products": { label: "Add & Edit Products", path: "/admin/add-products", parent: { label: "Admin Console", path: "/admin" } },
  coupons: { label: "Discount Coupons", path: "/admin/coupons", parent: { label: "Admin Console", path: "/admin" } },
  users: { label: "User Insights", path: "/admin/users", parent: { label: "Admin Console", path: "/admin" } },
  "access-control": { label: "Admin Roles", path: "/admin/access-control", parent: { label: "Admin Console", path: "/admin" } },
  "theme-settings": { label: "Site & Theme Settings", path: "/admin/theme-settings", parent: { label: "Admin Console", path: "/admin" } },
  marketing: { label: "Marketing Campaigns", path: "/admin/marketing", parent: { label: "Admin Console", path: "/admin" } },
  "security-logs": { label: "Security Logs", path: "/admin/security-logs", parent: { label: "Admin Console", path: "/admin" } },
  trash: { label: "Recycle Bin", path: "/admin/trash", parent: { label: "Admin Console", path: "/admin" } },
  "wp-archive": { label: "WP Archive Dashboard", path: "/admin/wp-archive", parent: { label: "Admin Console", path: "/admin" } }
};

export default function Breadcrumb() {
  const location = useLocation();

  const breadcrumbs = useMemo(() => {
    const path = location.pathname;

    // Do not show breadcrumbs on Home Page
    if (path === "/" || path === "") {
      return [];
    }

    const segments = path.split("/").filter(Boolean);
    const searchParams = new URLSearchParams(location.search);
    const items = [{ label: "Home", path: "/" }];

    // Handle Admin Routes
    if (segments[0] === "admin") {
      items.push({ label: "Admin Console", path: "/admin" });

      if (segments.length === 1) {
        items.push({ label: "Dashboard", path: "/admin" });
        return items;
      }

      const subSegment = segments[1];
      if (subSegment === "orders" && segments[2]) {
        items.push({ label: "Orders", path: "/admin/orders" });
        items.push({ label: `Order #${segments[2]}`, path: location.pathname });
        return items;
      }

      const mappedSub = ROUTE_MAP[subSegment];
      if (mappedSub) {
        items.push({ label: mappedSub.label, path: mappedSub.path });
      } else {
        const titleCase = subSegment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        items.push({ label: titleCase, path: `/admin/${subSegment}` });
      }
      return items;
    }

    // Handle Product Detail Route: /product/:id
    if (segments[0] === "product") {
      items.push({ label: "Store Catalog", path: "/collection" });
      
      // Clean product title from document.title if available
      let productTitle = "Product Details";
      if (document.title && !document.title.toLowerCase().includes("loading")) {
        const rawTitle = document.title.split("|")[0].split("—")[0].trim();
        if (rawTitle && rawTitle.toLowerCase() !== "digital sanskrit guru") {
          productTitle = rawTitle;
        }
      }
      items.push({ label: productTitle, path: location.pathname });
      return items;
    }

    // Handle Collection / Catalog Page: /collection
    if (segments[0] === "collection") {
      items.push({ label: "Store Catalog", path: "/collection" });
      const categoryParam = searchParams.get("category");
      if (categoryParam && categoryParam.toLowerCase() !== "store catalog" && categoryParam.toLowerCase() !== "collection") {
        items.push({ label: categoryParam, path: `/collection?category=${encodeURIComponent(categoryParam)}` });
      }
      return items;
    }

    // Handle Search Page: /search
    if (segments[0] === "search") {
      items.push({ label: "Store Catalog", path: "/collection" });
      const queryParam = searchParams.get("q");
      if (queryParam) {
        items.push({ label: `Search: "${queryParam}"`, path: `/search?q=${encodeURIComponent(queryParam)}` });
      } else {
        items.push({ label: "Search Results", path: "/search" });
      }
      return items;
    }

    // Handle Standard Routes
    const primarySegment = segments[0];
    const mapped = ROUTE_MAP[primarySegment];

    if (mapped) {
      if (mapped.parent) {
        items.push(mapped.parent);
      }
      items.push({ label: mapped.label, path: mapped.path });
    } else {
      const formattedLabel = primarySegment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      items.push({ label: formattedLabel, path: `/${primarySegment}` });
    }

    // Filter consecutive duplicate labels
    return items.filter((item, idx) => {
      if (idx === 0) return true;
      return item.label.toLowerCase().trim() !== items[idx - 1].label.toLowerCase().trim();
    });
  }, [location.pathname, location.search]);

  // Inject Structured Data (JSON-LD BreadcrumbList) for SEO
  useEffect(() => {
    if (breadcrumbs.length <= 1) return;

    const schema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((crumb, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        name: crumb.label,
        item: `${window.location.origin}/#${crumb.path}`
      }))
    };

    const scriptId = "dynamic-breadcrumb-jsonld";
    let scriptEl = document.getElementById(scriptId);
    if (!scriptEl) {
      scriptEl = document.createElement("script");
      scriptEl.id = scriptId;
      scriptEl.type = "application/ld+json";
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(schema);
  }, [breadcrumbs]);

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav
      className="site-breadcrumb-nav"
      aria-label="Breadcrumb"
      style={{
        width: "100%",
        background: "rgba(255, 255, 255, 0.96)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderBottom: "1px solid #e2e8f0",
        padding: "6px 0",
        marginBottom: "8px",
        position: "relative",
        zIndex: 90,
        overflow: "hidden"
      }}
    >
      <div
        className="site-breadcrumb-container"
        style={{
          maxWidth: "1300px",
          margin: "0 auto",
          padding: "0 12px",
          overflowX: "auto",
          overflowY: "hidden",
          whiteSpace: "nowrap",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          display: "flex",
          alignItems: "center"
        }}
      >
        <ol
          className="site-breadcrumb-list"
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "nowrap",
            alignItems: "center",
            gap: "6px",
            listStyle: "none",
            margin: 0,
            padding: 0,
            fontSize: "12px",
            fontWeight: 500,
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            width: "max-content",
            minWidth: "100%"
          }}
        >
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <li
                key={`${crumb.path}-${idx}`}
                className={`site-breadcrumb-item ${isLast ? "active" : ""}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  flexWrap: "nowrap",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                  gap: "6px",
                  color: "#64748b"
                }}
              >
                {idx > 0 && (
                  <span
                    className="site-breadcrumb-separator"
                    style={{
                      color: "#94a3b8",
                      fontSize: "11px",
                      fontWeight: 400,
                      userSelect: "none",
                      display: "inline-block",
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                      lineHeight: 1,
                      margin: "0 2px"
                    }}
                  >
                    /
                  </span>
                )}
                {isLast ? (
                  <span
                    className="site-breadcrumb-current"
                    aria-current="page"
                    style={{
                      color: "#64748b",
                      fontWeight: 500,
                      maxWidth: "160px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "inline-block",
                      verticalAlign: "middle",
                      flexShrink: 0
                    }}
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    to={crumb.path}
                    className="site-breadcrumb-link"
                    style={{
                      color: "#0284c7",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                      display: "inline-block",
                      flexShrink: 0
                    }}
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
