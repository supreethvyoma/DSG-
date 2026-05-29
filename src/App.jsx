import { Suspense, lazy, useEffect } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import { requestLocationPermissionForCurrency } from "./utils/currency";
import { applySiteTheme, DEFAULT_SITE_THEME, readStoredSiteTheme } from "./utils/siteTheme";
import { storePricingConfig } from "./utils/productPricing";

const Home = lazy(() => import("./pages/Home"));
const Collection = lazy(() => import("./pages/Collection"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const Product = lazy(() => import("./pages/Product"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const MyAccount = lazy(() => import("./pages/MyAccount"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const Register = lazy(() => import("./pages/Register"));
const Login = lazy(() => import("./pages/Login"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminOrders = lazy(() => import("./pages/AdminOrders"));
const AdminOrderDetails = lazy(() => import("./pages/AdminOrderDetails"));
const AdminProducts = lazy(() => import("./pages/AdminProducts"));
const AdminAddProducts = lazy(() => import("./pages/AdminAddProducts"));
const AdminCoupons = lazy(() => import("./pages/AdminCoupons"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminThemeSettings = lazy(() => import("./pages/AdminThemeSettings"));

function RouteLoadingFallback() {
  return (
    <div
      style={{
        minHeight: "40vh",
        display: "grid",
        placeItems: "center",
        padding: "32px 16px",
        color: "#1d2a57",
        fontSize: "1rem",
        fontWeight: 600
      }}
    >
      Loading page...
    </div>
  );
}

function App() {
  useEffect(() => {
    requestLocationPermissionForCurrency();
  }, []);

  useEffect(() => {
    let active = true;
    const storedThemeSettings = readStoredSiteTheme();

    axios
      .get("/api/settings/public")
      .then((res) => {
        if (!active) return;
        applySiteTheme(res.data?.siteTheme || DEFAULT_SITE_THEME, res.data?.customThemes || []);
        storePricingConfig({
          pricingMarkets: res.data?.pricingMarkets || [],
          internationalPricingDefaults: res.data?.internationalPricingDefaults || {},
          currencyConversionRates: res.data?.currencyConversionRates || {}
        });
      })
      .catch(() => {
        if (!active) return;
        if (storedThemeSettings) {
          applySiteTheme(
            storedThemeSettings.siteTheme || DEFAULT_SITE_THEME,
            storedThemeSettings.customThemes || []
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <HashRouter>
      <Navbar />

      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/cart" element={<Cart />} />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <MyAccount />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-orders"
            element={
              <ProtectedRoute>
                <MyOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <AdminRoute>
                <AdminOrders />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/orders/:id"
            element={
              <AdminRoute>
                <AdminOrderDetails />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <AdminRoute>
                <AdminProducts />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/add-products"
            element={
              <AdminRoute>
                <AdminAddProducts />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/coupons"
            element={
              <AdminRoute>
                <AdminCoupons />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUsers />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/theme"
            element={
              <AdminRoute>
                <AdminThemeSettings />
              </AdminRoute>
            }
          />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </Suspense>

      <Footer />
    </HashRouter>
  );
}

export default App;
