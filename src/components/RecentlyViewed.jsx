import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatCurrencyForUser } from "../utils/currency";
import "./RecentlyViewed.css";

function RecentlyViewed({ className = "" }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("recentProducts")) || [];
    setProducts(stored);
  }, []);

  const clearRecentlyViewed = () => {
    localStorage.removeItem("recentProducts");
    setProducts([]);
  };

  if (products.length === 0) return null;

  return (
    <section className={`recent-section ${className}`.trim()}>
      <div className="recent-header">
        <div>
          <h2>Recently Viewed</h2>
          <p>Jump back into products you explored recently.</p>
        </div>
        <button className="recent-clear-btn" onClick={clearRecentlyViewed}>
          Clear
        </button>
      </div>
      <div className="recent-grid">
        {products.map((p) => (
          <div key={p._id} className="recent-card">
            <img src={p.image || "https://picsum.photos/200"} alt={p.name} />
            <h4>{p.name}</h4>
            <span className="recent-caption">Viewed recently</span>
            <p>{formatCurrencyForUser(p.price)}</p>
            <Link to={`/product/${p._id}`}>
              <button className="view-btn">View</button>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

export default RecentlyViewed;
