import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ImagePlus, Trash2, UploadCloud } from "lucide-react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ProductImage from "../components/ProductImage";
import { formatCurrency, formatShortDate } from "../utils/compare";
import "./Dashboard.css";

const initialProduct = {
  name: "",
  description: "",
  category: "Garments & Textile",
  price: "",
  currency: "BDT",
  quantity: "",
  unit: "piece",
  minimumOrderQuantity: "1",
  imageUrl: "",
};

export default function SupplierDashboard() {
  const { user, brandLogoSrc } = useAuth();

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState("products");
  const [form, setForm] = useState(initialProduct);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const [imageError, setImageError] = useState("");
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  // Inline confirmation / reply / verification / order details states
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [replyingInquiryId, setReplyingInquiryId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [verificationForm, setVerificationForm] = useState({
    businessName: "",
    businessType: "Wholesaler",
    ownershipType: "Sole Proprietorship",
    yearEstablished: "",
    businessDescription: "",
    tradeLicenseNumber: "",
    tradeLicenseAuthority: "",
    tinNumber: "",
    binNumber: "",
    nidNumber: "",
    contactPersonName: "",
    contactPersonRole: "",
    address: "",
    city: "",
    monthlyCapacity: "",
    bankName: "",
    bankAccountNumber: "",
    websiteUrl: "",
  });
  const [verificationDocs, setVerificationDocs] = useState({
    tradeLicense: null,
    tinCertificate: null,
    binCertificate: null,
  });

  const loadDashboard = async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      apiRequest("/supplier/products"),
      apiRequest("/orders/supplier"),
      apiRequest("/supplier/profile"),
      apiRequest("/sourcing/inquiries/supplier"),
      apiRequest("/sourcing/categories"),
    ]);

    if (results[0].status === "fulfilled") {
      setProducts(results[0].value.products || []);
    } else {
      setMessage(results[0].reason.message);
    }
    if (results[1].status === "fulfilled") setOrders(results[1].value.orders || []);
    if (results[2].status === "fulfilled") {
      const sup = results[2].value.supplier || results[2].value;
      setProfile(sup);
      setVerificationForm({
        businessName: sup?.businessName || "",
        businessType: sup?.businessType || "Wholesaler",
        ownershipType: sup?.ownershipType || "Sole Proprietorship",
        yearEstablished: sup?.yearEstablished || "",
        businessDescription: sup?.businessDescription || "",
        tradeLicenseNumber: sup?.tradeLicenseNumber || "",
        tradeLicenseAuthority: sup?.tradeLicenseAuthority || "",
        tinNumber: sup?.tinNumber || "",
        binNumber: sup?.binNumber || "",
        nidNumber: sup?.nidNumber || "",
        contactPersonName: sup?.contactPersonName || sup?.name || "",
        contactPersonRole: sup?.contactPersonRole || "",
        address: sup?.address || "",
        city: sup?.city || "",
        monthlyCapacity: sup?.monthlyCapacity || "",
        bankName: sup?.bankName || "",
        bankAccountNumber: sup?.bankAccountNumber || "",
        websiteUrl: sup?.websiteUrl || "",
      });
      setVerificationDocs({
        tradeLicense: sup?.verificationDocuments?.tradeLicense || null,
        tinCertificate: sup?.verificationDocuments?.tinCertificate || null,
        binCertificate: sup?.verificationDocuments?.binCertificate || null,
      });
    }
    if (results[3].status === "fulfilled") setInquiries(results[3].value.inquiries || []);
    if (results[4].status === "fulfilled") setCategories(results[4].value.categories || []);
    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(initialProduct);
    setEditingId(null);
    setImageFileName("");
    setImageError("");
    setIsDraggingImage(false);
  };

  const handleProductImageFile = (file) => {
    if (!file) return;
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setImageError("Please upload a PNG, JPG, or WebP product image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setImageError("Product image must be 2 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setImageError("Could not read this image file. Please try another photo.");
    reader.onload = () => {
      setForm((prev) => ({ ...prev, imageUrl: String(reader.result || "") }));
      setImageFileName(file.name);
      setImageError("");
      setMessage("");
    };
    reader.readAsDataURL(file);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!form.imageUrl.trim()) {
      const errText = "Product image is required. Please upload a clear product photo before saving.";
      setImageError(errText);
      setMessage(errText);
      return;
    }

    setSaving(true);
    setMessage("");
    setImageError("");
    try {
      const payload = {
        name: form.name,
        description: form.description,
        category: form.category,
        price: Number(form.price),
        currency: form.currency,
        quantity: Number(form.quantity),
        unit: form.unit,
        minimumOrderQuantity: Number(form.minimumOrderQuantity),
        images: [form.imageUrl.trim()],
      };

      if (editingId) {
        await apiRequest(`/supplier/products/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/supplier/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setMessage(editingId ? "Product updated successfully." : "Product created successfully.");
      resetForm();
      await loadDashboard();
      setActiveTab("products");
    } catch (error) {
      setMessage(error.message || "Could not save product.");
    } finally {
      setSaving(false);
    }
  };

  const editProduct = (product) => {
    const existingImg = product.images?.[0] || "";
    setForm({
      name: product.name || "",
      description: product.description || "",
      category: product.category || "Garments & Textile",
      price: String(product.price ?? ""),
      currency: product.currency || "BDT",
      quantity: String(product.quantity ?? ""),
      unit: product.unit || "piece",
      minimumOrderQuantity: String(product.minimumOrderQuantity ?? 1),
      imageUrl: existingImg,
    });
    setImageFileName(existingImg ? "Current listing photo" : "");
    setImageError("");
    setEditingId(product._id);
    setActiveTab("add-product");
    setMessage("");
  };

  const publishProduct = async (productId) => {
    try {
      setMessage("");
      await apiRequest(`/supplier/products/${productId}/publish`, { method: "PATCH" });
      setMessage("Product published successfully.");
      await loadDashboard();
    } catch (error) {
      setMessage(error.message || "Could not publish product.");
    }
  };

  const deleteProduct = async (productId) => {
    try {
      await apiRequest(`/supplier/products/${productId}`, { method: "DELETE" });
      setConfirmDeleteId(null);
      setMessage("Product deleted successfully.");
      await loadDashboard();
    } catch (error) {
      setMessage(error.message || "Could not delete product.");
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      setMessage("");
      await apiRequest(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setSelectedOrder((prev) => (prev && prev._id === orderId ? { ...prev, status } : prev));
      setMessage(`Order status updated to ${status}.`);
      await loadDashboard();
    } catch (error) {
      setMessage(error.message || "Could not update order status.");
    }
  };

  const handleVerificationFile = (docKey, file) => {
    if (!file) return;
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      setMessage("Please upload a PDF, PNG, JPG, or WEBP file.");
      return;
    }
    if (file.size > 2.4 * 1024 * 1024) {
      setMessage("Each document must be 2.4 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setVerificationDocs((prev) => ({
        ...prev,
        [docKey]: {
          fileName: file.name,
          mimeType: file.type,
          dataUrl: String(reader.result || ""),
        },
      }));
      setMessage("");
    };
    reader.readAsDataURL(file);
  };

  const submitVerification = async (e) => {
    e.preventDefault();
    try {
      setMessage("");
      await apiRequest("/sourcing/supplier/verification", {
        method: "POST",
        body: JSON.stringify({
          ...verificationForm,
          verificationDocuments: verificationDocs,
        }),
      });
      setMessage("Verification application and documents submitted for admin review.");
      setShowVerificationForm(false);
      await loadDashboard();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const sendReply = async (inquiryId) => {
    if (!replyText.trim()) return;
    try {
      await apiRequest(`/sourcing/inquiries/${inquiryId}/respond`, {
        method: "PATCH",
        body: JSON.stringify({ response: replyText.trim() }),
      });
      setReplyingInquiryId(null);
      setReplyText("");
      setMessage("Inquiry response sent.");
      await loadDashboard();
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <p className="dashboard-loading">Loading Supplier Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-header-brand">
            <img src={brandLogoSrc} alt="SourceBD" referrerPolicy="no-referrer" />
            <span>Supplier Dashboard</span>
          </h1>
          <p>
            Welcome, {profile?.businessName || profile?.name || user?.name || "Supplier"} · Manage
            catalog, RFQs, and fulfillment
          </p>
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
          <span>Total Products</span>
          <strong>{products.length}</strong>
        </article>
        <article className="dashboard-stat">
          <span>Published Products</span>
          <strong>{products.filter((p) => p.status === "published").length}</strong>
        </article>
        <article className="dashboard-stat">
          <span>Customer Orders</span>
          <strong>{orders.length}</strong>
        </article>
      </section>

      <nav className="dashboard-tabs" aria-label="Supplier dashboard sections">
        <button type="button" className={activeTab === "products" ? "active" : ""} onClick={() => setActiveTab("products")}>
          My Products ({products.length})
        </button>
        <button
          type="button"
          className={activeTab === "add-product" ? "active" : ""}
          onClick={() => {
            resetForm();
            setActiveTab("add-product");
          }}
        >
          {editingId ? "Edit Product" : "Add Product"}
        </button>
        <button type="button" className={activeTab === "orders" ? "active" : ""} onClick={() => setActiveTab("orders")}>
          Customer Orders ({orders.length})
        </button>
        <button type="button" className={activeTab === "inquiries" ? "active" : ""} onClick={() => setActiveTab("inquiries")}>
          Inquiries ({inquiries.filter((i) => i.status === "new").length})
        </button>
        <button type="button" className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}>
          Business Profile
        </button>
      </nav>

      {activeTab === "products" && (
        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <h2>My Products</h2>
            <button
              type="button"
              className="dashboard-primary-button w-auto"
              onClick={() => {
                resetForm();
                setActiveTab("add-product");
              }}
            >
              + Add Product
            </button>
          </div>

          {products.length === 0 ? (
            <p className="dashboard-empty">You have not added any products yet.</p>
          ) : (
            <div className="dashboard-product-grid">
              {products.map((product) => (
                <article className="dashboard-product" key={product._id}>
                  <ProductImage src={product.images?.[0]} alt={product.name} className="dashboard-product-image" />
                  <div className="dashboard-product-content">
                    <span className="dashboard-meta-line">
                      {product.category} · {product.status === "published" ? "Published" : "Draft"}
                    </span>
                    <h3>{product.name}</h3>
                    <p>{product.description || "No description."}</p>
                    <strong className="dashboard-price">
                      {formatCurrency(product.price, product.currency)} / {product.unit}
                    </strong>
                    <p>
                      Stock: {product.quantity} {product.unit} · MOQ {product.minimumOrderQuantity}
                    </p>

                    <div className="flex flex-col gap-2 mt-2">
                      <button type="button" className="dashboard-secondary-button" onClick={() => editProduct(product)}>
                        Edit Product
                      </button>

                      {product.status === "draft" && (
                        <button type="button" className="dashboard-primary-button w-full" onClick={() => publishProduct(product._id)}>
                          Publish Product
                        </button>
                      )}

                      {confirmDeleteId === product._id ? (
                        <div className="flex gap-2">
                          <button type="button" className="dashboard-cancel-button flex-1" onClick={() => deleteProduct(product._id)}>
                            Confirm Delete
                          </button>
                          <button type="button" className="dashboard-secondary-button flex-1" onClick={() => setConfirmDeleteId(null)}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button type="button" className="dashboard-cancel-button" onClick={() => setConfirmDeleteId(product._id)}>
                          Delete Product
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "add-product" && (
        <section className="dashboard-section">
          <h2>{editingId ? "Edit Product" : "Add New Product"}</h2>
          <form className="supplier-product-form" onSubmit={handleProductSubmit}>
            <label>
              Product Name
              <input name="name" value={form.name} onChange={handleFormChange} required />
            </label>

            <label>
              Description
              <textarea name="description" value={form.description} onChange={handleFormChange} rows={4} required />
            </label>

            <label>
              Category
              <select name="category" value={form.category} onChange={handleFormChange} required>
                {(categories.length
                  ? categories
                  : [{ name: "Garments & Textile" }, { name: "Packaging" }, { name: "Electronics" }, { name: "Food & Beverage" }]
                ).map((cat) => (
                  <option key={cat._id || cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="supplier-form-grid">
              <label>
                Approx. Unit Price
                <input name="price" type="number" min="0.01" step="0.01" value={form.price} onChange={handleFormChange} required />
              </label>

              <label>
                Currency
                <select name="currency" value={form.currency} onChange={handleFormChange}>
                  <option value="BDT">BDT (৳)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </label>

              <label>
                Stock Quantity
                <input name="quantity" type="number" min="0" step="1" value={form.quantity} onChange={handleFormChange} required />
              </label>

              <label>
                Unit
                <select name="unit" value={form.unit} onChange={handleFormChange}>
                  <option value="piece">Piece</option>
                  <option value="yard">Yard</option>
                  <option value="meter">Meter</option>
                  <option value="kg">Kilogram</option>
                  <option value="sack">Sack</option>
                  <option value="bag">Bag</option>
                  <option value="box">Box</option>
                  <option value="set">Set</option>
                  <option value="unit">Unit</option>
                </select>
              </label>
            </div>

            <div>
              <label>
                Minimum Order Quantity (MOQ)
                <input
                  name="minimumOrderQuantity"
                  type="number"
                  min="1"
                  step="1"
                  value={form.minimumOrderQuantity}
                  onChange={handleFormChange}
                  required
                />
              </label>
            </div>

            <div className="p-4 rounded-xl border border-[#e2e8f0] bg-white flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#0b2149] m-0">Product Photo * (Required)</h3>
                  <p className="text-xs text-[#64748b] m-0 mt-0.5">
                    Upload a clear product picture (PNG, JPG, or WebP, max 2 MB) and preview how buyers will see it.
                  </p>
                </div>
                {form.imageUrl && (
                  <button
                    type="button"
                    className="dashboard-danger-button inline-flex items-center gap-1.5 py-1.5 px-3 text-xs"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, imageUrl: "" }));
                      setImageFileName("");
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Remove Photo
                  </button>
                )}
              </div>

              <div className="supplier-image-upload-grid">
                <label
                  className={`supplier-image-dropzone ${isDraggingImage ? "dragging" : ""} ${imageError ? "has-error" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingImage(true);
                  }}
                  onDragLeave={() => setIsDraggingImage(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingImage(false);
                    const droppedFile = e.dataTransfer.files?.[0];
                    if (droppedFile) handleProductImageFile(droppedFile);
                  }}
                >
                  <UploadCloud className="w-9 h-9 text-[#f56600]" aria-hidden="true" />
                  <span className="text-sm font-semibold text-[#0b2149]">
                    {form.imageUrl ? "Click or drop to replace product photo" : "Click to upload or drag & drop photo"}
                  </span>
                  <span className="text-xs text-[#64748b]">
                    {imageFileName ? `Selected: ${imageFileName}` : "PNG, JPG, or WebP · Recommended 4:3 ratio (Max 2 MB)"}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    aria-label="Upload product photo"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) handleProductImageFile(file);
                    }}
                  />
                </label>

                <div className="supplier-image-preview-card" aria-label="Live product image preview">
                  <div className="px-3 py-2 bg-[#f8fafc] border-b border-[#e2e8f0] text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                    Live Listing Preview
                  </div>
                  {form.imageUrl ? (
                    <img
                      src={form.imageUrl}
                      alt={form.name || "Uploaded product preview"}
                      className="w-full aspect-[4/3] object-cover"
                    />
                  ) : (
                    <div className="supplier-image-preview-empty">
                      <ImagePlus className="w-7 h-7 text-[#94a3b8]" aria-hidden="true" />
                      <span>Your uploaded product photo preview will appear here</span>
                    </div>
                  )}
                  <div className="p-3 flex flex-col gap-1">
                    <span className="text-[11px] font-medium text-[#64748b] truncate">
                      {form.category || "Category"}
                    </span>
                    <strong className="text-sm font-bold text-[#0b2149] truncate">
                      {form.name.trim() || "Product Name Preview"}
                    </strong>
                    <div className="flex items-center justify-between gap-2 text-xs mt-0.5">
                      <span className="font-mono-num font-bold text-[#0b2149]">
                        {form.price ? `${formatCurrency(form.price, form.currency)} / ${form.unit}` : "৳0 / " + form.unit}
                      </span>
                      <span className="text-[#64748b]">
                        MOQ {form.minimumOrderQuantity || 1}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {imageError && (
                <p className="text-xs font-semibold text-[#b91c1c] m-0" role="alert">
                  {imageError}
                </p>
              )}
            </div>

            <div className="supplier-form-actions">
              <button className="dashboard-primary-button" type="submit" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update Product" : "Save Product as Draft"}
              </button>
              <button
                className="dashboard-secondary-button"
                type="button"
                onClick={() => {
                  resetForm();
                  setActiveTab("products");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {activeTab === "orders" && (
        <section className="dashboard-section">
          <h2>Customer Orders</h2>
          {orders.length === 0 ? (
            <p className="dashboard-empty">No customer orders yet.</p>
          ) : (
            <div className="dashboard-table-wrapper">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Buyer</th>
                    <th>Qty</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <td className="font-medium text-[#0b2149]">{order.productName || order._id}</td>
                      <td>
                        <div className="font-medium text-[#0f172a]">{order.buyer?.name || "Buyer"}</div>
                        {(order.contactPhone || order.buyer?.phone) && (
                          <div className="text-xs text-[#64748b] font-mono-num">
                            {order.contactPhone || order.buyer?.phone}
                          </div>
                        )}
                      </td>
                      <td>
                        {order.quantity} {order.product?.unit || ""}
                      </td>
                      <td>
                        <span className="dashboard-status-text">{order.status}</span>
                      </td>
                      <td className="font-mono-num">
                        {formatCurrency(order.totalPrice || order.totalAmount || order.total || 0, order.currency)}
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="dashboard-secondary-button"
                            onClick={() => setSelectedOrder(order)}
                          >
                            Details
                          </button>
                          {order.status === "pending" && (
                            <button type="button" className="dashboard-primary-button w-auto" onClick={() => updateOrderStatus(order._id, "confirmed")}>
                              Confirm
                            </button>
                          )}
                          {order.status === "confirmed" && (
                            <button type="button" className="dashboard-primary-button w-auto" onClick={() => updateOrderStatus(order._id, "processing")}>
                              Start Processing
                            </button>
                          )}
                          {order.status === "processing" && (
                            <button type="button" className="dashboard-primary-button w-auto" onClick={() => updateOrderStatus(order._id, "shipped")}>
                              Mark Shipped
                            </button>
                          )}
                          {order.status === "shipped" && (
                            <button type="button" className="dashboard-primary-button w-auto" onClick={() => updateOrderStatus(order._id, "delivered")}>
                              Mark Delivered
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === "inquiries" && (
        <section className="dashboard-section">
          <h2>Buyer Inquiries / RFQs</h2>
          {inquiries.length === 0 ? (
            <p className="dashboard-empty">No buyer inquiries yet.</p>
          ) : (
            inquiries.map((item) => (
              <article className="dashboard-panel" key={item._id}>
                <h3>{item.productName}</h3>
                <p>
                  <strong>Buyer:</strong> {item.buyer?.name || item.buyer?.email || "—"} ·{" "}
                  <span className="dashboard-status-text">{item.status}</span>
                </p>
                <p>{item.details}</p>
                {item.quantity && <p>Requested Qty: {item.quantity}</p>}
                {item.targetPrice !== null && item.targetPrice !== undefined && <p>Target price: {item.targetPrice}</p>}
                {item.supplierResponse && (
                  <p className="text-[#0b2149] font-medium">
                    <strong>Your reply:</strong> {item.supplierResponse}
                  </p>
                )}

                {item.status === "new" && (
                  replyingInquiryId === item._id ? (
                    <div className="mt-3 flex flex-col gap-2 max-w-md">
                      <textarea
                        rows={2}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write quotation terms, lead time, or contact instructions..."
                        className="p-2 border border-[#cbd5e1] rounded-lg text-sm"
                      />
                      <div className="flex gap-2">
                        <button type="button" className="dashboard-primary-button w-auto" onClick={() => sendReply(item._id)}>
                          Send Reply
                        </button>
                        <button type="button" className="dashboard-secondary-button" onClick={() => setReplyingInquiryId(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="dashboard-primary-button w-auto mt-2"
                      onClick={() => {
                        setReplyingInquiryId(item._id);
                        setReplyText("");
                      }}
                    >
                      Respond to Inquiry
                    </button>
                  )
                )}
              </article>
            ))
          )}
        </section>
      )}

      {activeTab === "profile" && (
        <section className="dashboard-section">
          <h2>Business Profile &amp; Supplier Verification (KYC)</h2>
          <div className="dashboard-profile mb-6 !max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              <p><strong>Contact Name:</strong> {profile?.name || user?.name || "—"}</p>
              <p><strong>Email:</strong> {profile?.email || user?.email || "—"}</p>
              <p><strong>Phone:</strong> {profile?.phone || "Not provided"}</p>
              <p><strong>Business Name:</strong> {profile?.businessName || "Not provided"}</p>
              <p><strong>Business Type:</strong> {profile?.businessType || "Not provided"}</p>
              <p><strong>Legal Structure:</strong> {profile?.ownershipType || "Not provided"}</p>
              <p><strong>Year Established:</strong> {profile?.yearEstablished || "Not provided"}</p>
              <p><strong>Location:</strong> {[profile?.address, profile?.city].filter(Boolean).join(", ") || "Not provided"}</p>
              <p><strong>Trade License No.:</strong> {profile?.tradeLicenseNumber || "Not submitted"}</p>
              <p><strong>e-TIN (12-digit):</strong> {profile?.tinNumber || "Not submitted"}</p>
              <p><strong>BIN / VAT No.:</strong> {profile?.binNumber || "Not provided"}</p>
              <p><strong>Authorized NID:</strong> {profile?.nidNumber || "Not submitted"}</p>
              <p><strong>Monthly Capacity:</strong> {profile?.monthlyCapacity || "Not provided"}</p>
              <p>
                <strong>Verification Status:</strong>{" "}
                <span className="dashboard-status-text">
                  {(profile?.verificationStatus || (profile?.isVerified ? "verified" : "not submitted")).replace(/_/g, " ")}
                </span>
              </p>
            </div>
            {profile?.verificationDocuments && Object.values(profile.verificationDocuments).some(Boolean) && (
              <p className="mt-2">
                <strong>Submitted Documents:</strong>{" "}
                {[
                  profile.verificationDocuments.tinCertificate?.fileName && `e-TIN (${profile.verificationDocuments.tinCertificate.fileName})`,
                  profile.verificationDocuments.tradeLicense?.fileName && `Trade License (${profile.verificationDocuments.tradeLicense.fileName})`,
                  profile.verificationDocuments.binCertificate?.fileName && `BIN (${profile.verificationDocuments.binCertificate.fileName})`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {profile?.verificationNote && <p><strong>Admin Note:</strong> {profile.verificationNote}</p>}
          </div>

          {profile?.verificationStatus !== "verified" && (
            showVerificationForm ? (
              <form onSubmit={submitVerification} className="flex flex-col gap-6 max-w-4xl">
                <div className="p-5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] flex flex-col gap-4">
                  <h3 className="text-base font-bold text-[#0b2149] m-0">1. Business Identity</h3>
                  <div className="supplier-form-grid">
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#0b2149]">
                      Registered Business Name *
                      <input
                        required
                        className="px-3 py-2.5 border border-[#cbd5e1] rounded-lg bg-white text-sm font-normal"
                        value={verificationForm.businessName}
                        onChange={(e) => setVerificationForm((prev) => ({ ...prev, businessName: e.target.value }))}
                        placeholder="e.g. Dhaka Textile House"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#0b2149]">
                      Business Type *
                      <select
                        className="px-3 py-2.5 border border-[#cbd5e1] rounded-lg bg-white text-sm font-normal"
                        value={verificationForm.businessType}
                        onChange={(e) => setVerificationForm((prev) => ({ ...prev, businessType: e.target.value }))}
                      >
                        <option value="Wholesaler">Wholesaler</option>
                        <option value="Manufacturer">Manufacturer</option>
                        <option value="Importer">Importer</option>
                        <option value="Distributor">Distributor</option>
                        <option value="Exporter">Exporter</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#0b2149]">
                      Legal Ownership Structure *
                      <select
                        className="px-3 py-2.5 border border-[#cbd5e1] rounded-lg bg-white text-sm font-normal"
                        value={verificationForm.ownershipType}
                        onChange={(e) => setVerificationForm((prev) => ({ ...prev, ownershipType: e.target.value }))}
                      >
                        <option value="Sole Proprietorship">Sole Proprietorship</option>
                        <option value="Partnership">Partnership</option>
                        <option value="Private Limited (Pvt. Ltd.)">Private Limited (Pvt. Ltd.)</option>
                        <option value="Public Limited">Public Limited</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#0b2149]">
                      Year Established *
                      <input
                        required
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        className="px-3 py-2.5 border border-[#cbd5e1] rounded-lg bg-white text-sm font-normal tabular-nums"
                        value={verificationForm.yearEstablished}
                        onChange={(e) => setVerificationForm((prev) => ({ ...prev, yearEstablished: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                        placeholder="e.g. 2018"
                      />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#0b2149]">
                    Business Description &amp; Core Wholesale Products *
                    <textarea
                      rows={3}
                      required
                      className="px-3 py-2.5 border border-[#cbd5e1] rounded-lg bg-white text-sm font-normal"
                      value={verificationForm.businessDescription}
                      onChange={(e) => setVerificationForm((prev) => ({ ...prev, businessDescription: e.target.value }))}
                      placeholder="Describe your product lines, wholesale minimums, and sourcing hubs..."
                    />
                  </label>
                </div>

                <div className="p-5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] flex flex-col gap-4">
                  <h3 className="text-base font-bold text-[#0b2149] m-0">2. Bangladesh Regulatory &amp; Tax KYC</h3>
                  <div className="supplier-form-grid">
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#0b2149]">
                      Trade License Number *
                      <input
                        required
                        className="px-3 py-2.5 border border-[#cbd5e1] rounded-lg bg-white text-sm font-normal"
                        value={verificationForm.tradeLicenseNumber}
                        onChange={(e) => setVerificationForm((prev) => ({ ...prev, tradeLicenseNumber: e.target.value }))}
                        placeholder="e.g. TRAD/DSCC/014582/2025"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#0b2149]">
                      Issuing City Corp. / Authority *
                      <input
                        required
                        className="px-3 py-2.5 border border-[#cbd5e1] rounded-lg bg-white text-sm font-normal"
                        value={verificationForm.tradeLicenseAuthority}
                        onChange={(e) => setVerificationForm((prev) => ({ ...prev, tradeLicenseAuthority: e.target.value }))}
                        placeholder="e.g. Dhaka South City Corporation (DSCC)"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#0b2149]">
                      12-Digit e-TIN Number *
                      <input
                        required
                        inputMode="numeric"
                        maxLength={12}
                        className="px-3 py-2.5 border border-[#cbd5e1] rounded-lg bg-white text-sm font-normal tabular-nums"
                        value={verificationForm.tinNumber}
                        onChange={(e) => setVerificationForm((prev) => ({ ...prev, tinNumber: e.target.value.replace(/\D/g, "").slice(0, 12) }))}
                        placeholder="12-digit e-TIN (e.g. 418290345612)"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#0b2149]">
                      VAT / BIN Registration Number (Optional)
                      <input
                        className="px-3 py-2.5 border border-[#cbd5e1] rounded-lg bg-white text-sm font-normal tabular-nums"
                        value={verificationForm.binNumber}
                        onChange={(e) => setVerificationForm((prev) => ({ ...prev, binNumber: e.target.value }))}
                        placeholder="e.g. 002418593-0102"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#0b2149]">
                      Proprietor / Authorized Person NID Number *
                      <input
                        required
                        inputMode="numeric"
                        maxLength={17}
                        className="px-3 py-2.5 border border-[#cbd5e1] rounded-lg bg-white text-sm font-normal tabular-nums"
                        value={verificationForm.nidNumber}
                        onChange={(e) => setVerificationForm((prev) => ({ ...prev, nidNumber: e.target.value.replace(/\D/g, "").slice(0, 17) }))}
                        placeholder="10, 13, or 17-digit NID"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#0b2149]">
                      Authorized Contact Person *
                      <input
                        required
                        className="px-3 py-2.5 border border-[#cbd5e1] rounded-lg bg-white text-sm font-normal"
                        value={verificationForm.contactPersonName}
                        onChange={(e) => setVerificationForm((prev) => ({ ...prev, contactPersonName: e.target.value }))}
                        placeholder="Full name of proprietor or director"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#0b2149]">
                      Designation / Role (Optional)
                      <input
                        className="px-3 py-2.5 border border-[#cbd5e1] rounded-lg bg-white text-sm font-normal"
                        value={verificationForm.contactPersonRole}
                        onChange={(e) => setVerificationForm((prev) => ({ ...prev, contactPersonRole: e.target.value }))}
                        placeholder="e.g. Proprietor / Managing Director"
                      />
                    </label>
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] flex flex-col gap-4">
                  <h3 className="text-base font-bold text-[#0b2149] m-0">3. Location, Capacity &amp; Bank Reference</h3>
                  <div className="supplier-form-grid">
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#0b2149]">
                      Warehouse / Factory / Shop Address *
                      <input
                        required
                        className="px-3 py-2.5 border border-[#cbd5e1] rounded-lg bg-white text-sm font-normal"
                        value={verificationForm.address}
                        onChange={(e) => setVerificationForm((prev) => ({ ...prev, address: e.target.value }))}
                        placeholder="e.g. 42 Islampur Road, Kotwali"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#0b2149]">
                      City / District *
                      <input
                        required
                        className="px-3 py-2.5 border border-[#cbd5e1] rounded-lg bg-white text-sm font-normal"
                        value={verificationForm.city}
                        onChange={(e) => setVerificationForm((prev) => ({ ...prev, city: e.target.value }))}
                        placeholder="e.g. Dhaka, Narayanganj, Gazipur"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#0b2149]">
                      Monthly Supply Capacity (Optional)
                      <input
                        className="px-3 py-2.5 border border-[#cbd5e1] rounded-lg bg-white text-sm font-normal"
                        value={verificationForm.monthlyCapacity}
                        onChange={(e) => setVerificationForm((prev) => ({ ...prev, monthlyCapacity: e.target.value }))}
                        placeholder="e.g. 50,000 yards / month"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#0b2149]">
                      Website or Facebook Business Page (Optional)
                      <input
                        className="px-3 py-2.5 border border-[#cbd5e1] rounded-lg bg-white text-sm font-normal"
                        value={verificationForm.websiteUrl}
                        onChange={(e) => setVerificationForm((prev) => ({ ...prev, websiteUrl: e.target.value }))}
                        placeholder="https://..."
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#0b2149]">
                      Business Bank Name &amp; Branch (Optional)
                      <input
                        className="px-3 py-2.5 border border-[#cbd5e1] rounded-lg bg-white text-sm font-normal"
                        value={verificationForm.bankName}
                        onChange={(e) => setVerificationForm((prev) => ({ ...prev, bankName: e.target.value }))}
                        placeholder="e.g. Dutch-Bangla Bank, Motijheel Branch"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#0b2149]">
                      Business Bank Account Number (Optional)
                      <input
                        className="px-3 py-2.5 border border-[#cbd5e1] rounded-lg bg-white text-sm font-normal tabular-nums"
                        value={verificationForm.bankAccountNumber}
                        onChange={(e) => setVerificationForm((prev) => ({ ...prev, bankAccountNumber: e.target.value }))}
                        placeholder="Company account number"
                      />
                    </label>
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] flex flex-col gap-4">
                  <div>
                    <h3 className="text-base font-bold text-[#0b2149] m-0">4. Supporting Documents (PDF or Image)</h3>
                    <p className="text-xs text-[#64748b] m-0 mt-1">
                      Upload scanned PDF or image copies (max 2.4 MB each) so SourceBD admins can verify your certificates.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      ["tinCertificate", "e-TIN Certificate (PDF / Image)"],
                      ["tradeLicense", "Trade License Copy (PDF / Image)"],
                      ["binCertificate", "BIN / VAT Certificate (Optional)"],
                    ].map(([key, label]) => (
                      <div key={key} className="p-3.5 rounded-lg border border-[#cbd5e1] bg-white flex flex-col gap-2">
                        <span className="text-xs font-semibold text-[#0b2149]">{label}</span>
                        <input
                          type="file"
                          accept="application/pdf,image/png,image/jpeg,image/webp"
                          onChange={(e) => handleVerificationFile(key, e.target.files?.[0])}
                          className="text-xs text-[#475569]"
                        />
                        {verificationDocs[key]?.fileName && (
                          <div className="flex items-center justify-between gap-2 text-xs text-[#15803d] font-medium">
                            <span className="truncate">{verificationDocs[key].fileName}</span>
                            <button
                              type="button"
                              onClick={() => setVerificationDocs((prev) => ({ ...prev, [key]: null }))}
                              className="text-[#b91c1c] bg-transparent border-0 p-0 text-xs font-semibold"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="supplier-form-actions">
                  <button type="submit" className="dashboard-primary-button w-auto">
                    Submit Verification Application
                  </button>
                  <button type="button" className="dashboard-secondary-button" onClick={() => setShowVerificationForm(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                className="dashboard-primary-button w-auto"
                disabled={profile?.verificationStatus === "pending"}
                onClick={() => setShowVerificationForm(true)}
              >
                {profile?.verificationStatus === "pending"
                  ? "Verification Application Pending Admin Review"
                  : profile?.verificationStatus === "rejected"
                    ? "Update & Re-submit Verification Form"
                    : "Complete Supplier Verification Form (KYC)"}
              </button>
            )
          )}
        </section>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedOrder(null);
          }}
        >
          <section
            className="admin-permission-modal supplier-order-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="supplier-order-details-title"
          >
            <div className="admin-modal-heading">
              <div>
                <h3 id="supplier-order-details-title">Order &amp; Buyer Details</h3>
                <p className="text-xs text-[#64748b] m-0">
                  Order #{String(selectedOrder._id).slice(-8)} · Placed {formatShortDate(selectedOrder.createdAt)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelectedOrder(null)}
                className="border-0 bg-transparent text-xl"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col gap-4 text-sm">
              <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569] m-0 mb-2.5">
                  Buyer Information
                </h4>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 m-0">
                  <div>
                    <dt className="text-xs text-[#64748b]">Buyer Name</dt>
                    <dd className="m-0 mt-0.5 font-semibold text-[#0b2149]">
                      {selectedOrder.buyer?.name || "Verified Buyer"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#64748b]">Contact Phone</dt>
                    <dd className="m-0 mt-0.5 font-mono-num font-semibold text-[#0b2149]">
                      {selectedOrder.contactPhone || selectedOrder.buyer?.phone ? (
                        <a
                          href={`tel:${selectedOrder.contactPhone || selectedOrder.buyer?.phone}`}
                          className="text-[#f56600] hover:underline"
                        >
                          {selectedOrder.contactPhone || selectedOrder.buyer?.phone}
                        </a>
                      ) : (
                        "Not provided"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#64748b]">Buyer Email</dt>
                    <dd className="m-0 mt-0.5 text-[#334155] break-all">
                      {selectedOrder.buyer?.email || "Not provided"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#64748b]">Delivery Address</dt>
                    <dd className="m-0 mt-0.5 text-[#334155]">
                      {selectedOrder.shippingAddress || "Not provided"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#e2e8f0]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569] m-0 mb-2.5">
                  Order Summary &amp; Special Notes
                </h4>
                <dl className="grid grid-cols-2 gap-3 m-0">
                  <div className="col-span-2">
                    <dt className="text-xs text-[#64748b]">Product</dt>
                    <dd className="m-0 mt-0.5 font-semibold text-[#0b2149]">
                      {selectedOrder.productName || selectedOrder.product?.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#64748b]">Quantity</dt>
                    <dd className="m-0 mt-0.5 font-medium tabular-nums text-[#0f172a]">
                      {selectedOrder.quantity} {selectedOrder.product?.unit || "units"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#64748b]">Total Amount</dt>
                    <dd className="m-0 mt-0.5 font-mono-num font-bold text-[#0b2149]">
                      {formatCurrency(
                        selectedOrder.totalPrice || selectedOrder.totalAmount || selectedOrder.total || 0,
                        selectedOrder.currency
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#64748b]">Current Status</dt>
                    <dd className="m-0 mt-0.5 font-semibold capitalize text-[#0b2149]">
                      {selectedOrder.status}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#64748b]">Unit Price</dt>
                    <dd className="m-0 mt-0.5 font-mono-num text-[#475569]">
                      {formatCurrency(selectedOrder.unitPrice || 0, selectedOrder.currency)}
                    </dd>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-[#f1f5f9]">
                    <dt className="text-xs text-[#64748b]">Special Notes</dt>
                    <dd className="m-0 mt-1 text-[#0f172a] leading-relaxed">
                      {selectedOrder.note || "No special notes provided."}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="dashboard-secondary-button"
                onClick={() => setSelectedOrder(null)}
              >
                Close
              </button>
              {selectedOrder.status === "pending" && (
                <button
                  type="button"
                  className="dashboard-primary-button w-auto"
                  onClick={() => updateOrderStatus(selectedOrder._id, "confirmed")}
                >
                  Confirm Order
                </button>
              )}
              {selectedOrder.status === "confirmed" && (
                <button
                  type="button"
                  className="dashboard-primary-button w-auto"
                  onClick={() => updateOrderStatus(selectedOrder._id, "processing")}
                >
                  Start Processing
                </button>
              )}
              {selectedOrder.status === "processing" && (
                <button
                  type="button"
                  className="dashboard-primary-button w-auto"
                  onClick={() => updateOrderStatus(selectedOrder._id, "shipped")}
                >
                  Mark Shipped
                </button>
              )}
              {selectedOrder.status === "shipped" && (
                <button
                  type="button"
                  className="dashboard-primary-button w-auto"
                  onClick={() => updateOrderStatus(selectedOrder._id, "delivered")}
                >
                  Mark Delivered
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
