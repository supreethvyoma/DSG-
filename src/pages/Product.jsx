import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useCart } from "../hooks/useCart";
import { useAuth } from "../hooks/useAuth";
import "./Product.css";
import { formatCurrencyForUser } from "../utils/currency";

function Product() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [qty, setQty] = useState(1);
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [mainImage, setMainImage] = useState("");

  const renderStars = (value) => {
    const rounded = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
    return `${"\u2605".repeat(rounded)}${"\u2606".repeat(5 - rounded)}`;
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [res, recRes] = await Promise.all([
        axios.get("http://localhost:5000/api/products"),
        axios
          .get(`http://localhost:5000/api/products/recommend/${id}`)
          .catch(() => ({ data: [] }))
      ]);
      const allProducts = Array.isArray(res.data) ? res.data : [];
      const recommended = Array.isArray(recRes.data) ? recRes.data : [];
      const found = allProducts.find((p) => p._id === id) || null;

      setProduct(found);
      setMainImage(found?.image || "");
      setQty(1);
      setRelatedProducts(
        recommended.length > 0
          ? recommended.filter((p) => p?._id !== id).slice(0, 4)
          : allProducts.filter((p) => p._id !== id).slice(0, 4)
      );
    } catch {
      setProduct(null);
      setRelatedProducts([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {

  if (!product) return;

  const stored = JSON.parse(localStorage.getItem("recentProducts")) || [];

  // remove duplicate if product already exists
  const filtered = stored.filter((p) => p._id !== product._id);

  // add product to start
  const updated = [product, ...filtered].slice(0, 6);

  localStorage.setItem("recentProducts", JSON.stringify(updated));

}, [product]);
  const submitReview = async () => {
    if (!token) {
      alert("Please login to add a review.");
      return;
    }

    try {
      await axios.post(
        `http://localhost:5000/api/products/${id}/reviews`,
        {
          rating: Number(rating),
          comment
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setRating("5");
      setComment("");
      await loadData();
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to submit review";
      alert(message);
    }
  };

  const handleBuyNow = async () => {
    if (product.stock === 0) {
      return;
    }

    await addToCart(product, qty);
    navigate("/checkout");
  };

  if (loading) return <p style={{ padding: "20px" }}>Loading...</p>;

  if (!product) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>Product not found</h2>
        <Link to="/">Back to Home</Link>
      </div>
    );
  }

  return (
    <>
      <div className="product-container">
        <div className="product-left">
          <div className="image-gallery">
            <div className="thumbnail-column">
              {[product.image].map((img, i) => (
                <img
                  key={i}
                  src={img || "https://picsum.photos/200"}
                  className={`thumbnail ${mainImage === img ? "active" : ""}`}
                  onClick={() => setMainImage(img)}
                  alt=""
                />
              ))}
            </div>

            <div className="main-image-container">
              <img
                src={mainImage || product.image || "https://picsum.photos/500"}
                alt={product.name}
                className="product-main-image"
              />
            </div>
          </div>
        </div>

        <div className="product-center">
          <h1 className="product-title">{product.name}</h1>
          <p className="rating">
            {renderStars(product.rating)} ({Number(product.rating || 0).toFixed(1)})
          </p>
          <hr />
          <p className="price">{formatCurrencyForUser(product.price)}</p>
          <p className="stock">
            {product.stock > 0 ? (
              <span className="in-stock">In Stock</span>
            ) : (
              <span className="out-stock">Out of Stock</span>
            )}
          </p>
          <p className="description">{product.description}</p>
        </div>

        <div className="product-right">
          <div className="buy-box">
            <p className="buy-price">{formatCurrencyForUser(product.price)}</p>
            <p className="delivery">FREE Delivery</p>

            <div className="qty-box">
              <button className="qty-btn" onClick={() => setQty(qty > 1 ? qty - 1 : 1)}>
                -
              </button>

              <span className="qty-number">{qty}</span>

              <button
                className="qty-btn"
                onClick={() => setQty(qty < (product.stock || 10) ? qty + 1 : qty)}
              >
                +
              </button>
            </div>
            
            {/* <Button type="add-to-cart-button" disabled={false} onClick={() => addToCart(product, qty)} fullWidth="true">
              Add to Cart
            </Button> */}

            <button
              className="add-cart-btn"
              disabled={product.stock === 0}
              onClick={() => addToCart(product, qty)}
            >
              {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
            </button>
            <button
              className="buy-now-btn"
              disabled={product.stock === 0}
              onClick={handleBuyNow}
            >
              {product.stock === 0 ? "Out of Stock" : "Buy Now"}
            </button>
          </div>
        </div>
      </div>

      <div className="reviews-section">
        <h3>Customer Reviews</h3>

        {product.reviews && product.reviews.length > 0 ? (
          product.reviews.map((r, index) => (
            <div key={index} className="review-card">
              <strong>{r.user}</strong>
              <p>{renderStars(r.rating)}</p>
              <p>{r.comment}</p>
            </div>
          ))
        ) : (
          <p>No reviews yet</p>
        )}

        <div className="review-form">
          <h4>Add Review</h4>
          {!user && <p>Login to submit a review.</p>}
          <label>Rating</label>
          <select value={rating} onChange={(e) => setRating(e.target.value)}>
            <option value="5">5 stars</option>
            <option value="4">4 stars</option>
            <option value="3">3 stars</option>
            <option value="2">2 stars</option>
            <option value="1">1 star</option>
          </select>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Write your review..."
          />
          <button className="add-cart-btn" onClick={submitReview}>
            Submit Review
          </button>
        </div>
      </div>

      <div className="related-section">
        <h3>You may also like</h3>
        <div className="related-products">
          {relatedProducts.length > 0 ? (
            relatedProducts.map((p) => (
              <div key={p._id} className="related-card">
                <img src={p.image || "https://picsum.photos/200"} alt={p.name} />
                <h4>{p.name}</h4>
                <p>{formatCurrencyForUser(p.price)}</p>
                <Link to={`/product/${p._id}`}>
                  <button className="view-btn">View</button>
                </Link>
              </div>
            ))
          ) : (
            <p className="related-empty">No related products found.</p>
          )}
        </div>
      </div>
    </>
  );
}

export default Product;
