import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import AdminSidebar from "../components/admin/AdminSidebar";
import "./AdminDashboard.css";

function AdminAddProducts() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [stock, setStock] = useState("1");
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoadingProducts(true);
    axios
      .get("http://localhost:5000/api/products")
      .then((res) => {
        if (!active) return;
        setProducts(res.data);
      })
      .catch(() => {
        if (!active) return;
        setProducts([]);
      })
      .finally(() => {
        if (!active) return;
        setIsLoadingProducts(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const res = await axios.get("http://localhost:5000/api/products");
      setProducts(res.data);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const base = [...products].sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
    if (!query) return base;

    return base.filter((product) => {
      const values = [
        String(product?.name || ""),
        String(product?.category || ""),
        String(product?.description || "")
      ]
        .join(" ")
        .toLowerCase();
      return values.includes(query);
    });
  }, [products, searchQuery]);

  const resetForm = () => {
    setName("");
    setPrice("");
    setImage("");
    setDescription("");
    setCategory("General");
    setStock("1");
    setEditingProduct(null);
  };

  const addProduct = async () => {
    await axios.post(
      "http://localhost:5000/api/products",
      {
        name,
        price: Number(price),
        image,
        description,
        category,
        stock: Number(stock)
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    resetForm();
    loadProducts();
  };

  const startEdit = (product) => {
    setEditingProduct(product);
    setName(product.name || "");
    setPrice(String(product.price ?? ""));
    setImage(product.image || "");
    setDescription(product.description || "");
    setCategory(product.category || "General");
    setStock(String(product.stock ?? 1));
  };

  const updateProduct = async () => {
    await axios.put(
      `http://localhost:5000/api/products/${editingProduct._id}`,
      {
        name,
        price: Number(price),
        image,
        description,
        category,
        stock: Number(stock)
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    resetForm();
    loadProducts();
  };

  const deleteProduct = async (id) => {
    const shouldDelete = window.confirm("Delete this product? This action cannot be undone.");
    if (!shouldDelete) return;

    await axios.delete(`http://localhost:5000/api/products/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    loadProducts();
  };

  const parseCsvLine = (line) => {
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === "\"") {
        const escapedQuote = inQuotes && line[i + 1] === "\"";
        if (escapedQuote) {
          current += "\"";
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }

    values.push(current.trim());
    return values;
  };

  const parseCsv = (text) => {
    const lines = String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    return lines.slice(1).map((line) => {
      const cols = parseCsvLine(line);
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx] ?? "";
      });
      return row;
    });
  };

  const normalizeUploadProduct = (item) => {
    const productName = String(item?.name || "").trim();
    const productPrice = Number(item?.price);
    if (!productName || Number.isNaN(productPrice)) return null;

    return {
      name: productName,
      price: productPrice,
      image: String(item?.image || "").trim(),
      description: String(item?.description || "").trim(),
      category: String(item?.category || "General").trim() || "General",
      stock: Math.max(0, Number(item?.stock) || 0)
    };
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMessage("");

    try {
      const text = await file.text();
      const isJson = file.name.toLowerCase().endsWith(".json");
      let rows = [];

      if (isJson) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) rows = parsed;
        else if (Array.isArray(parsed?.products)) rows = parsed.products;
      } else {
        rows = parseCsv(text);
      }

      const payloads = rows.map(normalizeUploadProduct).filter(Boolean);
      if (payloads.length === 0) {
        setUploadMessage("No valid products found in file.");
        return;
      }

      const results = await Promise.allSettled(
        payloads.map((payload) =>
          axios.post("http://localhost:5000/api/products", payload, {
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      );

      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failedCount = results.length - successCount;
      setUploadMessage(`Upload complete. Added: ${successCount}, Failed: ${failedCount}`);
      await loadProducts();
    } catch {
      setUploadMessage("Upload failed. Please use valid CSV/JSON format.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        <div className="admin-header">
          <h1>Add Products</h1>
        </div>

        <section className="card">
          <h3>{editingProduct ? "Edit Product" : "Add Product"}</h3>
          <div className="form-grid">
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
            <input placeholder="Image URL" value={image} onChange={(e) => setImage(e.target.value)} />
            <input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
            <input
              type="number"
              min="0"
              placeholder="Stock"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
            <input
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="actions">
            <button onClick={editingProduct ? updateProduct : addProduct}>
              {editingProduct ? "Update Product" : "Add Product"}
            </button>
            {editingProduct && (
              <button className="danger" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </section>

        <section className="card upload-card">
          <h3>Bulk Upload Files</h3>
          <p className="upload-help">
            Upload a CSV or JSON file with fields: <code>name, price, image, description, category, stock</code>
          </p>
          <label className="upload-dropzone">
            <span className="upload-title">Choose CSV / JSON file</span>
            <span className="upload-subtitle">
              {uploading ? "Uploading..." : "Click to browse and upload products"}
            </span>
            <input
              type="file"
              accept=".csv,.json,application/json,text/csv"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
          {uploadMessage && (
            <p className={`upload-message ${uploadMessage.includes("failed") ? "error" : "success"}`}>
              {uploadMessage}
            </p>
          )}
        </section>

        <section className="card">
          <h3>All Products</h3>
          <div className="products-tools">
            <input
              className="product-search"
              placeholder="Search product by name, category, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <p>
              Showing {filteredProducts.length} of {products.length}
            </p>
          </div>
          <div className="table">
            {isLoadingProducts
              ? Array.from({ length: 5 }).map((_, idx) => (
                  <div key={`products-skeleton-${idx}`} className="table-row skeleton-row">
                    <span className="skeleton-block" />
                    <span className="skeleton-block" />
                    <span className="skeleton-block" />
                    <span className="skeleton-block" />
                  </div>
                ))
              : filteredProducts.map((product) => (
                  <div key={product._id} className="table-row">
                    <span>
                      <strong>{product.name}</strong>
                    </span>
                    <span>Rs {product.price}</span>
                    <span>
                      <span
                        className={
                          Number(product.stock || 0) === 0
                            ? "stock-pill stock-pill-critical"
                            : Number(product.stock || 0) <= 5
                              ? "stock-pill stock-pill-warning"
                              : "stock-pill stock-pill-ok"
                        }
                      >
                        {Number(product.stock || 0) === 0 ? "Out of stock" : `Stock: ${product.stock ?? 0}`}
                      </span>
                    </span>
                    <div className="actions">
                      <button onClick={() => startEdit(product)}>Edit</button>
                      <button className="danger" onClick={() => deleteProduct(product._id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
          </div>
          {!isLoadingProducts && filteredProducts.length === 0 && (
            <p style={{ marginTop: "10px" }}>No matching products found.</p>
          )}
        </section>
      </main>
    </div>
  );
}

export default AdminAddProducts;
