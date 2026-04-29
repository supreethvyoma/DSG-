import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import ProductCard from "../components/ProductCard";
import "./Collection.css";

function getCategoryLabel(product) {
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
}

function getAverageRating(product) {
  const reviews = Array.isArray(product?.reviews) ? product.reviews : [];
  if (reviews.length === 0) return Number(product?.rating || 0);
  return reviews.reduce((sum, review) => sum + Number(review?.rating || 0), 0) / reviews.length;
}

const PRODUCTS_PER_PAGE = 8;

function Collection() {
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingMoreProducts, setIsLoadingMoreProducts] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState("featured");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [availableProducts, setAvailableProducts] = useState(0);
  const [hasMoreProducts, setHasMoreProducts] = useState(false);
  const [categories, setCategories] = useState(["All"]);
  const [categoryCounts, setCategoryCounts] = useState({ All: 0 });

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      setCurrentPage(1);

      try {
        const { data } = await axios.get("/api/products", {
          params: {
            page: 1,
            limit: PRODUCTS_PER_PAGE,
            sort: sortOption,
            category: selectedCategory
          }
        });

        if (!isMounted) return;

        setProducts(Array.isArray(data?.items) ? data.items : []);
        setTotalProducts(Number(data?.total || 0));
        setAvailableProducts(Number(data?.totalBase || 0));
        setHasMoreProducts(Boolean(data?.hasMore));
        setCategories(Array.isArray(data?.categories) && data.categories.length > 0 ? data.categories : ["All"]);
        setCategoryCounts(data?.categoryCounts && typeof data.categoryCounts === "object" ? data.categoryCounts : { All: 0 });
      } catch {
        if (!isMounted) return;
        setProducts([]);
        setTotalProducts(0);
        setAvailableProducts(0);
        setHasMoreProducts(false);
        setCategories(["All"]);
        setCategoryCounts({ All: 0 });
      } finally {
        if (isMounted) {
          setIsLoadingProducts(false);
        }
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [selectedCategory, sortOption]);

  useEffect(() => {
    if (!isMobileFilterOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsMobileFilterOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isMobileFilterOpen]);

  const collectionStats = useMemo(() => {
    return {
      total: availableProducts,
      visible: totalProducts
    };
  }, [availableProducts, totalProducts]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== "All") count += 1;
    return count;
  }, [selectedCategory]);

  const resetFilters = () => {
    setSelectedCategory("All");
    setSortOption("featured");
  };

  const handleResetFilters = () => {
    resetFilters();
    setIsMobileFilterOpen(false);
  };

  const handleFilterSelect = (callback) => {
    callback();
  };

  const handleLoadMoreProducts = async () => {
    if (isLoadingMoreProducts || !hasMoreProducts) return;

    const nextPage = currentPage + 1;
    setIsLoadingMoreProducts(true);

    try {
      const { data } = await axios.get("/api/products", {
        params: {
          page: nextPage,
          limit: PRODUCTS_PER_PAGE,
          sort: sortOption,
          category: selectedCategory
        }
      });

      setProducts((current) => [...current, ...(Array.isArray(data?.items) ? data.items : [])]);
      setCurrentPage(Number(data?.page || nextPage));
      setTotalProducts(Number(data?.total || 0));
      setAvailableProducts(Number(data?.totalBase || 0));
      setHasMoreProducts(Boolean(data?.hasMore));
    } catch {
      setHasMoreProducts(false);
    } finally {
      setIsLoadingMoreProducts(false);
    }
  };

  return (
    <div className="collection-page">
      <section className="collection-shell">
        <div className="collection-head">
          <div>
            <span className="collection-kicker">Catalog</span>
            <h1>Browse the full collection</h1>
            <p>Narrow down categories and shop faster with a cleaner filter flow.</p>
          </div>
          <Link to="/" className="collection-back-link">Back to Home</Link>
        </div>

        <div className="collection-layout">
          {isMobileFilterOpen ? (
            <button
              type="button"
              className="collection-filter-backdrop"
              aria-label="Close filters"
              onClick={() => setIsMobileFilterOpen(false)}
            />
          ) : null}

          <aside className={`collection-filters${isMobileFilterOpen ? " collection-filters-open" : ""}`}>
            <div className="collection-filter-card">
              <div className="collection-filter-head">
                <div className="collection-filter-head-copy">
                  <span className="collection-filter-head-kicker">Refine results</span>
                  <h2>Filters</h2>
                  <p>{collectionStats.visible} items match your selection</p>
                </div>
                <div className="collection-filter-head-actions">
                  <button type="button" onClick={handleResetFilters} className="collection-clear-btn">
                    Clear all
                  </button>
                  <button
                    type="button"
                    className="collection-filter-close-btn"
                    aria-label="Close filters"
                    onClick={() => setIsMobileFilterOpen(false)}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="collection-filter-groups">
                <div className="collection-filter-group">
                  <div className="collection-filter-group-head">
                    <strong>Category</strong>
                  </div>
                  <div className="collection-filter-list">
                    {categories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        className={selectedCategory === category ? "active" : ""}
                        onClick={() => handleFilterSelect(() => setSelectedCategory(category))}
                      >
                        <span className="collection-filter-indicator" aria-hidden="true" />
                        <span className="collection-filter-label">
                          {category} <em>({categoryCounts[category] || 0})</em>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              <button
                type="button"
                className="collection-filter-apply-btn"
                onClick={() => setIsMobileFilterOpen(false)}
              >
                View {collectionStats.visible} items
              </button>
            </div>
          </aside>

          <div className="collection-results-panel">
            <div className="collection-results-toolbar">
              <div className="collection-results-copy">
                <strong>Showing {products.length} of {collectionStats.visible}</strong>
                <span>{selectedCategory !== "All" ? selectedCategory : "All categories"}</span>
              </div>

              <div className="collection-results-actions">
                <button
                  type="button"
                  className="collection-mobile-filter-toggle"
                  onClick={() => setIsMobileFilterOpen(true)}
                >
                  Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </button>

                <div className="collection-sort-box">
                  <label htmlFor="collection-sort">Sort by</label>
                  <select id="collection-sort" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                    <option value="featured">Featured</option>
                    <option value="latest">Latest</option>
                    <option value="rating">Highest Rated</option>
                    <option value="priceLow">Price: Low to High</option>
                    <option value="priceHigh">Price: High to Low</option>
                    <option value="name">Name: A to Z</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="collection-grid">
              {isLoadingProducts ? (
                Array.from({ length: PRODUCTS_PER_PAGE }).map((_, index) => (
                  <div key={`collection-skeleton-${index}`} className="collection-skeleton-card">
                    <span className="collection-skeleton collection-skeleton-image" />
                    <span className="collection-skeleton collection-skeleton-line short" />
                    <span className="collection-skeleton collection-skeleton-line" />
                    <span className="collection-skeleton collection-skeleton-line medium" />
                  </div>
                ))
              ) : products.length > 0 ? (
                products.map((product) => (
                  <ProductCard key={product._id} product={product} showDescription={false} variant="home" />
                ))
              ) : (
                <div className="collection-empty-state">
                  <strong>No products found</strong>
                  <p>Try changing your filters or clearing them to see more products.</p>
                  <button type="button" onClick={handleResetFilters}>Reset filters</button>
                </div>
              )}
            </div>

            {!isLoadingProducts && hasMoreProducts ? (
              <div className="collection-load-more-wrap">
                <button
                  type="button"
                  className="collection-load-more-btn"
                  onClick={handleLoadMoreProducts}
                  disabled={isLoadingMoreProducts}
                >
                  {isLoadingMoreProducts ? "Loading..." : "Load More Products"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Collection;
