import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";
import { useWishlist } from "../../hooks/useWishlist";
import "./Navbar.css";

function Navbar() {
  const { user, logout } = useAuth();
  const { cartItems } = useCart();
  const { wishlist } = useWishlist();
  const navigate = useNavigate();

  const handleSearch = (e) => {
    if (e.key === "Enter") {
      const query = (e.target.value || "").trim();
      navigate(query ? `/?search=${encodeURIComponent(query)}` : "/");
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          Digital Sanskrit Guru
        </Link>

        <input
          className="navbar-search"
          placeholder="Search courses and topics..."
          onKeyDown={handleSearch}
        />

        <div className="navbar-links">
          <Link className="navbar-link" to="/">
            Home
          </Link>

          <Link className="navbar-link navbar-cart" to="/cart">
            Cart <span className="navbar-badge">{cartItems.length}</span>
          </Link>

          <Link className="navbar-link navbar-cart" to="/wishlist">
            Wishlist <span className="navbar-badge">{wishlist.length}</span>
          </Link>

          {user ? (
            <>
              <Link className="navbar-link" to="/my-orders">
                My Orders
              </Link>

              {user.isAdmin && (
                <Link className="navbar-link" to="/admin">
                  Admin
                </Link>
              )}

              <span className="navbar-user">Hi, {user.name}</span>

              <button className="navbar-logout" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link className="navbar-link" to="/login">
                Login
              </Link>
              <Link className="navbar-link" to="/register">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
