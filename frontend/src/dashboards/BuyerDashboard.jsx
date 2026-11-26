import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ProductImage from "../components/ProductImage";
import {
  formatBdPhonePrefill,
  formatCurrency,
  isValidBdPhone,
  sanitizeBdPhoneInput,
} from "../utils/compare";
import "./Dashboard.css";

export default function BuyerDashboard() {
  const { user, brandLogoSrc, compareIds, toggleCompare } = useAuth();

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [categories, setCategories] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [activeTab, setActiveTab] = useState("products");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Inline modal/action states (replacing window.prompt/confirm)
  const [orderModalProduct, setOrderModalProduct] = useState(null);
  const [orderQty, setOrderQty] = useState(1);
  const [orderPhone, setOrderPhone] = useState("");
  const [orderAddress, setOrderAddress] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [inquiryProduct, setInquiryProduct] = useState(null);
  const [inquiryDetails, setInquiryDetails] = useState("");
  const [inquiryQty, setInquiryQty] = useState("");
  const [confirmCancelId, setConfirmCancelId] = useState(null);

  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    setMessage("");
    try {
      const results = await Promise.allSettled([
        apiRequest("/products?limit=24"),
        apiRequest("/orders/my"),
        apiRequest("/buyer/profile"),
        apiRequest("/sourcing/favorites"),
        apiRequest("/sourcing/inquiries/mine"),
        apiRequest("/sourcing/categories"),
      ]);

      if (results[0].status === "fulfilled") {
        setProducts(results[0].value.products || []);
      } else {
        setMessage(results[0].reason.message);
      }
      if (results[1].status === "fulfilled") {
        setOrders(results[1].value.orders || []);
      }
      if (results[2].status === "fulfilled") {
        const p = results[2].value.buyer || results[2].value;
        setProfile(p);
        setProfileForm({ name: p?.name || "", phone: formatBdPhonePrefill(p?.phone) });
      }
      if (results[3].status === "fulfilled") setFavorites(results[3].value.favorites || []);
      if (results[4].status === "fulfilled") setInquiries(results[4].value.inquiries || []);
      if (results[5].status === "fulfilled") setCategories(results[5].value.categories || []);
    } catch (error) {
      setMessage(error.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const submitOrder = async (e) => {
    e.preventDefault();
    if (!orderModalProduct) return;
    const moq = orderModalProduct.minimumOrderQuantity || 1;
    const qty = Number(orderQty);
    if (!Number.isInteger(qty) || qty < moq) {
      setMessage(`Minimum order quantity is ${moq}.`);
      return;
    }
    if (!isValidBdPhone(orderPhone)) {
      setMessage("Contact phone must be an exact 11-digit Bangladeshi number (e.g. 01711000001).");
      return;
    }
    try {
      setMessage("");
      await apiRequest("/orders", {
        method: "POST",
        body: JSON.stringify({
          productId: orderModalProduct._id,
          quantity: qty,
          contactPhone: orderPhone.trim(),
          shippingAddress: orderAddress.trim(),
          note: orderNote.trim(),
        }),
      });
      setOrderModalProduct(null);
      setOrderAddress("");
      setOrderNote("");
      setMessage("Order placed successfully!");
      await loadDashboard();
      setActiveTab("orders");
    } catch (error) {
      setMessage(error.message || "Could not place order.");
    }
  };

  const cancelOrder = async (orderId) => {
    try {
      await apiRequest(`/orders/${orderId}/cancel`, { method: "PATCH" });
      setConfirmCancelId(null);
      setMessage("Order cancelled successfully.");
      await loadDashboard();
    } catch (error) {
      setMessage(error.message || "Could not cancel order.");
    }
  };

  const isFavorite = (productId) =>
    favorites.some((row) => String(row.product?._id || row.product) === String(productId));

  const toggleFavorite = async (product) => {
    try {
      if (isFavorite(product._id)) {
        await apiRequest(`/sourcing/favorites/${product._id}`, { method: "DELETE" });
      } else {
        await apiRequest("/sourcing/favorites", {
          method: "POST",
          body: JSON.stringify({ productId: product._id }),
        });
      }
      const data = await apiRequest("/sourcing/favorites");
      setFavorites(data.favorites || []);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const submitInquiry = async (e) => {
    e.preventDefault();
    if (!inquiryProduct || !inquiryDetails.trim()) return;
    try {
      await apiRequest("/sourcing/inquiries", {
        method: "POST",
        body: JSON.stringify({
          productId: inquiryProduct._id,
          details: inquiryDetails.trim(),
          ...(inquiryQty ? { quantity: Number(inquiryQty) } : {}),
        }),
      });
      const data = await apiRequest("/sourcing/inquiries/mine");
      setInquiries(data.inquiries || []);
      setInquiryProduct(null);
      setInquiryDetails("");
      setInquiryQty("");
      setMessage("Inquiry sent to supplier.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (profileForm.phone && !isValidBdPhone(profileForm.phone)) {
      setMessage("Phone number must be an exact 11-digit Bangladeshi number (e.g. 01711000001).");
      return;
    }
    setSavingProfile(true);
    setMessage("");
    try {
      const data = await apiRequest("/buyer/profile", {
        method: "PATCH",
        body: JSON.stringify(profileForm),
      });
      setProfile(data.buyer);
      setMessage("Profile updated successfully.");
    } catch (error) {
      setMessage(error.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const text = `${product.name || ""} ${product.category || ""} ${product.description || ""}`.toLowerCase();
    const productLocation = `${product.supplier?.city || ""} ${product.supplier?.address || ""}`.toLowerCase();
    return (
      text.includes(search.toLowerCase()) &&
      (!category || product.category === category) &&
      (!location || productLocation.includes(location.toLowerCase()))
    );
  });

  if (loading) {
    return (
      <div className="dashboard-page">
        <p className="dashboard-loading">Loading Buyer Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-header-brand">
            <img src={brandLogoSrc} alt="SourceBD" referrerPolicy="no-referrer" />
            <span>Buyer Dashboard</span>
          </h1>
          <p>Welcome, {profile?.name || user?.name || "Buyer"} · Manage orders, inquiries, and saved products</p>
        </div>

        <Link to="/products" className="dashboard-secondary-button">
          Browse Marketplace
        </Link>
      </header>

      {message && (
        <div className="dashboard-message" role="status">
          {message}
        </div>
      )}

      <section className="dashboard-stats">
        <article className="dashboard-stat">
          <span>Available Listings</span>
          <strong>{products.length}</strong>
        </article>
        <article className="dashboard-stat">
          <span>My Orders</span>
          <strong>{orders.length}</strong>
        </article>
        <article className="dashboard-stat">
          <span>Active Inquiries</span>
          <strong>{inquiries.length}</strong>
        </article>
      </section>

      <nav className="dashboard-tabs" aria-label="Buyer dashboard sections">
        <button type="button" className={activeTab === "products" ? "active" : ""} onClick={() => setActiveTab("products")}>
          Products
        </button>
        <button type="button" className={activeTab === "favorites" ? "active" : ""} onClick={() => setActiveTab("favorites")}>
          Favorites ({favorites.length})
        </button>
        <button type="button" className={activeTab === "inquiries" ? "active" : ""} onClick={() => setActiveTab("inquiries")}>
          My Inquiries ({inquiries.length})
        </button>
        <button type="button" className={activeTab === "orders" ? "active" : ""} onClick={() => setActiveTab("orders")}>
          My Orders ({orders.length})
        </button>
        <button type="button" className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}>
          My Profile
        </button>
        <Link to="/compare" className="px-4 py-2 text-sm font-semibold text-[#f56600] hover:underline self-center ml-auto whitespace-nowrap">
          Compare Page ({compareIds.length})
        </Link>
      </nav>

      {activeTab === "products" && (
        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <h2>Explore Products</h2>
            <div className="flex flex-wrap gap-2">
              <input
                type="search"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
                <option value="">All categories</option>
                {categories.map((item) => (
                  <option key={item._id || item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
              <input
                type="search"
                placeholder="City or area..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <p className="dashboard-empty">No products match your search.</p>
          ) : (
            <div className="dashboard-product-grid">
              {filteredProducts.map((product) => (
                <article className="dashboard-product" key={product._id}>
                  <Link to={`/products/${product._id}`}>
                    <ProductImage src={product.images?.[0]} alt={product.name} className="dashboard-product-image" />
                  </Link>
                  <div className="dashboard-product-content">
                    <span className="dashboard-meta-line">
                      {product.category || "General"} · {product.supplier?.city || "Bangladesh"}
                      {product.supplier?.isVerified ? " · Verified" : ""}
                    </span>
                    <h3>
                      <Link to={`/products/${product._id}`} className="hover:text-[#f56600]">
                        {product.name}
                      </Link>
                    </h3>
                    <strong className="dashboard-price">
                      {formatCurrency(product.price, product.currency)} / {product.unit}
                    </strong>
                    <p>
                      MOQ {product.minimumOrderQuantity || 1} {product.unit} · Stock {product.quantity}
                    </p>

                    <div className="sourcing-actions">
                      <button type="button" className="dashboard-secondary-button" onClick={() => toggleFavorite(product)}>
                        {isFavorite(product._id) ? "Saved" : "Save"}
                      </button>
                      <button type="button" className="dashboard-secondary-button" onClick={() => toggleCompare(product._id)}>
                        {compareIds.includes(product._id) ? "In Compare" : "Compare"}
                      </button>
                      <button
                        type="button"
                        className="dashboard-secondary-button"
                        onClick={() => {
                          setInquiryProduct(product);
                          setInquiryDetails("");
                          setInquiryQty("");
                        }}
                      >
                        Send RFQ
                      </button>
                    </div>

                    <button
                      type="button"
                      className="dashboard-primary-button w-full"
                      disabled={Number(product.quantity) <= 0}
                      onClick={() => {
                        setOrderModalProduct(product);
                        setOrderQty(product.minimumOrderQuantity || 1);
                        setOrderPhone(formatBdPhonePrefill(profile?.phone || user?.phone));
                        setOrderNote("");
                      }}
                    >
                      {Number(product.quantity) <= 0 ? "Out of Stock" : "Place Order"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "favorites" && (
        <section className="dashboard-section">
          <h2>Saved Products</h2>
          {favorites.length === 0 ? (
            <p className="dashboard-empty">No saved products yet.</p>
          ) : (
            <div className="dashboard-product-grid">
              {favorites.map(
                (row) =>
                  row.product && (
                    <article className="dashboard-product" key={row._id}>
                      <div className="dashboard-product-content">
                        <span className="dashboard-meta-line">
                          {row.product.category} · {row.product.supplier?.city || "Bangladesh"}
                        </span>
                        <h3>
                          <Link to={`/products/${row.product._id}`}>{row.product.name}</Link>
                        </h3>
                        <strong className="dashboard-price">
                          {formatCurrency(row.product.price, row.product.currency)} / {row.product.unit}
                        </strong>
                        <button type="button" className="dashboard-cancel-button" onClick={() => toggleFavorite(row.product)}>
                          Remove from Saved
                        </button>
                      </div>
                    </article>
                  )
              )}
            </div>
          )}
        </section>
      )}

      {activeTab === "inquiries" && (
        <section className="dashboard-section">
          <h2>My Supplier Inquiries</h2>
          {inquiries.length === 0 ? (
            <p className="dashboard-empty">No inquiries sent yet.</p>
          ) : (
            inquiries.map((item) => (
              <article className="dashboard-panel" key={item._id}>
                <h3>{item.productName}</h3>
                <p>
                  <strong>Supplier:</strong> {item.supplier?.businessName || item.supplier?.name || "—"} ·{" "}
                  <span className="dashboard-status-text">{item.status}</span>
                </p>
                <p>{item.details}</p>
                {item.supplierResponse && (
                  <p className="mt-2 text-[#0b2149] font-medium">
                    <strong>Supplier response:</strong> {item.supplierResponse}
                  </p>
                )}
              </article>
            ))
          )}
        </section>
      )}

      {activeTab === "orders" && (
        <section className="dashboard-section">
          <h2>My Orders</h2>
          {orders.length === 0 ? (
            <p className="dashboard-empty">You have not placed any orders yet.</p>
          ) : (
            <div className="dashboard-table-wrapper">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <td>{order.productName || order.product?.name || order._id}</td>
                      <td>{order.quantity}</td>
                      <td>
                        <span className="dashboard-status-text">{order.status}</span>
                      </td>
                      <td className="font-mono-num">
                        {formatCurrency(order.totalPrice || order.totalAmount || order.total || 0, order.currency)}
                      </td>
                      <td>
                        {order.status === "pending" && (
                          confirmCancelId === order._id ? (
                            <div className="flex items-center gap-2">
                              <button type="button" className="dashboard-cancel-button" onClick={() => cancelOrder(order._id)}>
                                Confirm Cancel
                              </button>
                              <button type="button" className="dashboard-secondary-button" onClick={() => setConfirmCancelId(null)}>
                                Keep
                              </button>
                            </div>
                          ) : (
                            <button type="button" className="dashboard-cancel-button" onClick={() => setConfirmCancelId(order._id)}>
                              Cancel
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === "profile" && (
        <section className="dashboard-section">
          <h2>My Profile</h2>
          <form onSubmit={handleProfileUpdate} className="supplier-product-form max-w-md">
            <label>
              Full Name
              <input
                value={profileForm.name}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </label>
            <label>
              Phone Number (11 digits)
              <input
                type="tel"
                inputMode="numeric"
                maxLength={11}
                pattern="01[3-9][0-9]{8}"
                placeholder="01XXXXXXXXX"
                value={profileForm.phone}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: sanitizeBdPhoneInput(e.target.value) }))}
              />
            </label>
            <p className="text-xs text-[#64748b] m-0">
              Email: {profile?.email || user?.email} · Role: {profile?.role || "buyer"}
            </p>
            <button type="submit" disabled={savingProfile} className="dashboard-primary-button w-fit">
              {savingProfile ? "Saving..." : "Update Profile"}
            </button>
          </form>
        </section>
      )}

      {/* Inline Place Order Modal */}
      {orderModalProduct && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setOrderModalProduct(null); }}>
          <section className="admin-permission-modal" role="dialog" aria-modal="true" aria-labelledby="order-modal-title">
            <div className="admin-modal-heading">
              <div>
                <h3 id="order-modal-title">Place Wholesale Order</h3>
                <p className="text-xs text-[#64748b] m-0">{orderModalProduct.name}</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setOrderModalProduct(null)} className="border-0 bg-transparent text-xl">
                ×
              </button>
            </div>
            <form onSubmit={submitOrder} className="supplier-product-form">
              <label>
                Quantity (Min {orderModalProduct.minimumOrderQuantity || 1} {orderModalProduct.unit})
                <input
                  type="number"
                  min={orderModalProduct.minimumOrderQuantity || 1}
                  max={orderModalProduct.quantity}
                  value={orderQty}
                  onChange={(e) => setOrderQty(e.target.value)}
                  required
                />
              </label>
              <label>
                Contact Phone Number (11 digits)
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  pattern="01[3-9][0-9]{8}"
                  value={orderPhone}
                  onChange={(e) => setOrderPhone(sanitizeBdPhoneInput(e.target.value))}
                  placeholder="01XXXXXXXXX"
                  required
                />
              </label>
              <label>
                Delivery Address
                <input
                  type="text"
                  value={orderAddress}
                  onChange={(e) => setOrderAddress(e.target.value)}
                  placeholder="e.g. Mirpur-10, Dhaka"
                  required
                />
              </label>
              <label>
                Special Notes (Optional)
                <textarea
                  rows={2}
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Color, grade, delivery timing, or packaging instructions"
                />
              </label>
              <div className="admin-modal-actions">
                <button type="button" className="dashboard-secondary-button" onClick={() => setOrderModalProduct(null)}>
                  Cancel
                </button>
                <button type="submit" className="dashboard-primary-button w-auto">
                  Confirm Order ({formatCurrency(Number(orderQty || 0) * orderModalProduct.price, orderModalProduct.currency)})
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Inline Inquiry Modal */}
      {inquiryProduct && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setInquiryProduct(null); }}>
          <section className="admin-permission-modal" role="dialog" aria-modal="true" aria-labelledby="inquiry-modal-title">
            <div className="admin-modal-heading">
              <div>
                <h3 id="inquiry-modal-title">Send Inquiry / RFQ</h3>
                <p className="text-xs text-[#64748b] m-0">{inquiryProduct.name}</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setInquiryProduct(null)} className="border-0 bg-transparent text-xl">
                ×
              </button>
            </div>
            <form onSubmit={submitInquiry} className="supplier-product-form">
              <label>
                Requirement Details
                <textarea
                  rows={3}
                  required
                  value={inquiryDetails}
                  onChange={(e) => setInquiryDetails(e.target.value)}
                  placeholder="Ask about bulk discount, lead time, or specifications..."
                />
              </label>
              <label>
                Target Quantity (Optional)
                <input
                  type="number"
                  min="1"
                  value={inquiryQty}
                  onChange={(e) => setInquiryQty(e.target.value)}
                />
              </label>
              <div className="admin-modal-actions">
                <button type="button" className="dashboard-secondary-button" onClick={() => setInquiryProduct(null)}>
                  Cancel
                </button>
                <button type="submit" className="dashboard-primary-button w-auto">
                  Send Inquiry
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
