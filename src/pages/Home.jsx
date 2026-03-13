import { useEffect, useState, useRef } from "react";
import axios from "axios";
import ProductCard from "../components/ProductCard";
import "./Home.css";
import { useLocation, useNavigate } from "react-router-dom";
import RecentlyViewed from "../components/RecentlyViewed";

function Home() {
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState("default");

  const location = useLocation();
  const navigate = useNavigate();

  const sliderRef = useRef(null);

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/products")
      .then((res) => setProducts(res.data))
      .catch(() => setProducts([]));
  }, []);

  const scrollLeft = () => {
    sliderRef.current?.scrollBy({ left: -300, behavior: "smooth" });
  };

  const scrollRight = () => {
    sliderRef.current?.scrollBy({ left: 300, behavior: "smooth" });
  };

  const getCategoryLabel = (product) => {
    const raw = String(product?.category || "").trim();

    if (raw && raw.toLowerCase() !== "general") {
      return raw;
    }

    const name = String(product?.name || "").toLowerCase();

    if (name.includes("gita")) return "Gita";
    if (name.includes("grammar")) return "Grammar";
    if (name.includes("vedanta")) return "Vedanta";
    if (name.includes("chant")) return "Chanting";

    return "General";
  };

  const normalize = (value) => String(value || "").trim().toLowerCase();

  const categories = ["All", ...new Set(products.map((p) => getCategoryLabel(p)))];

  const params = new URLSearchParams(location.search);
  const searchQuery = (params.get("search") || "").toLowerCase();

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);

    if (category === "All" && searchQuery) {
      navigate("/");
    }
  };

  const filteredProducts = products.filter((product) => {
    const name = String(product.name || "").toLowerCase();
    const description = String(product.description || "").toLowerCase();
    const category = getCategoryLabel(product);

    const matchesSearch = !searchQuery || name.includes(searchQuery) || description.includes(searchQuery);

    const matchesCategory =
      selectedCategory === "All" || normalize(category) === normalize(selectedCategory);

    return matchesSearch && matchesCategory;
  });

  let sortedProducts = [...filteredProducts];

  if (sortOption === "priceLow") {
    sortedProducts.sort((a, b) => a.price - b.price);
  }

  if (sortOption === "priceHigh") {
    sortedProducts.sort((a, b) => b.price - a.price);
  }

  if (sortOption === "rating") {
    sortedProducts.sort((a, b) => {
      const avgA = (a.reviews?.reduce((s, r) => s + r.rating, 0) || 0) / (a.reviews?.length || 1);

      const avgB = (b.reviews?.reduce((s, r) => s + r.rating, 0) || 0) / (b.reviews?.length || 1);

      return avgB - avgA;
    });
  }

  const topRatedProducts = [...products]
    .sort((a, b) => {
      const avgA = (a.reviews?.reduce((s, r) => s + r.rating, 0) || 0) / (a.reviews?.length || 1);

      const avgB = (b.reviews?.reduce((s, r) => s + r.rating, 0) || 0) / (b.reviews?.length || 1);

      return avgB - avgA;
    })
    .slice(0, 6);

  return (
    <div className="home-page">
      <div className="hero-banner">
        <h1>Digital Sanskrit Guru</h1>
        <p>Learn Sanskrit & Vedanta from authentic sources</p>
      </div>

      <div className="products-section">
        <div className="section-header">
          <h2>Top Rated Courses</h2>

          <div className="slider-controls">
            <button onClick={scrollLeft}>Prev</button>
            <button onClick={scrollRight}>Next</button>
          </div>
        </div>

        <div className="products-slider" ref={sliderRef}>
          {topRatedProducts.map((product) => (
            <div className="slider-item" key={product._id}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>

      <RecentlyViewed className="home-recently-viewed" />

      <div className="products-section">
        <h2>Featured Courses</h2>

        <div className="category-filters">
          {categories.map((category) => (
            <button
              key={category}
              className={selectedCategory === category ? "active" : ""}
              onClick={() => handleCategoryClick(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>Sort by: </label>

          <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
            <option value="default">Default</option>
            <option value="priceLow">Price: Low to High</option>
            <option value="priceHigh">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>

        <div className="products-grid">
          {sortedProducts.length > 0 ? (
            sortedProducts.map((product) => <ProductCard key={product._id} product={product} />)
          ) : (
            <p>No courses found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
