import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, Scale, Check, Star, MapPin, Phone, Mail, Building2 } from "lucide-react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ProductImage from "../components/ProductImage";
import {
  formatBdPhonePrefill,
  formatCurrency,
  formatShortDate,
  isValidBdPhone,
  sanitizeBdPhoneInput,
} from "../utils/compare";

export default function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, compareIds, toggleCompare } = useAuth();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // Order & Favorite & Inquiry & Review states
  const [orderQty, setOrderQty] = useState(1);
  const [contactPhone, setContactPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);

  const [isFavorite, setIsFavorite] = useState(false);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [inquiryDetails, setInquiryDetails] = useState("");
  const [inquiryQty, setInquiryQty] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [sendingInquiry, setSendingInquiry] = useState(false);

  const [canReview, setCanReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      setError("");
      try {
        const [prodData, revData] = await Promise.all([
          apiRequest(`/products/${id}`),
          apiRequest(`/sourcing/reviews/product/${id}`),
        ]);
        setProduct(prodData.product);
        setReviews(revData.reviews || []);
        setOrderQty(prodData.product?.minimumOrderQuantity || 1);

        if (user?.role === "buyer") {
          const [favData, orderData] = await Promise.allSettled([
            apiRequest("/sourcing/favorites"),
            apiRequest("/orders/my"),
          ]);
          if (favData.status === "fulfilled") {
            const favList = favData.value.favorites || [];
            setIsFavorite(
              favList.some((row) => String(row.product?._id || row.product) === String(id))
            );
          }
          if (orderData.status === "fulfilled") {
            const myOrders = orderData.value.orders || [];
            setCanReview(
              myOrders.some(
                (o) =>
                  String(o.product?._id || o.product) === String(id) &&
                  o.status === "delivered"
              )
            );
          }
        }
      } catch (err) {
        setError(err.message || "Could not load product details.");
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id, user]);

  useEffect(() => {
    if (user?.phone) {
      setContactPhone((prev) => prev || formatBdPhonePrefill(user.phone));
    }
  }, [user]);

  const handleToggleFavorite = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "buyer") {
      setStatusMessage("Only buyer accounts can save favorites.");
      return;
    }
    try {
      if (isFavorite) {
        await apiRequest(`/sourcing/favorites/${product._id}`, { method: "DELETE" });
        setIsFavorite(false);
        setStatusMessage("Removed from saved products.");
      } else {
        await apiRequest("/sourcing/favorites", {
          method: "POST",
          body: JSON.stringify({ productId: product._id }),
        });
        setIsFavorite(true);
        setStatusMessage("Saved to your buyer favorites.");
      }
    } catch (err) {
      setStatusMessage(err.message);
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "buyer") {
      setStatusMessage("Log in with a buyer account to place wholesale orders.");
      return;
    }
    const qty = Number(orderQty);
    const moq = product.minimumOrderQuantity || 1;
    if (!Number.isInteger(qty) || qty < moq) {
      setStatusMessage(`Minimum order quantity is ${moq} ${product.unit || "units"}.`);
      return;
    }
    if (!isValidBdPhone(contactPhone)) {
      setStatusMessage("Contact phone must be an exact 11-digit Bangladeshi number (e.g. 01711000001).");
      return;
    }
    setPlacingOrder(true);
    setStatusMessage("");
    try {
      await apiRequest("/orders", {
        method: "POST",
        body: JSON.stringify({
          productId: product._id,
          quantity: qty,
          contactPhone: contactPhone.trim(),
          shippingAddress: shippingAddress.trim(),
          note: orderNote.trim(),
        }),
      });
      setStatusMessage("Wholesale order placed! View it anytime in your Buyer Dashboard.");
      setProduct((prev) => ({ ...prev, quantity: Math.max(0, Number(prev.quantity) - qty) }));
    } catch (err) {
      setStatusMessage(err.message);
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleSendInquiry = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "buyer") {
      setStatusMessage("Log in with a buyer account to send a supplier RFQ.");
      return;
    }
    setSendingInquiry(true);
    setStatusMessage("");
    try {
      await apiRequest("/sourcing/inquiries", {
        method: "POST",
        body: JSON.stringify({
          productId: product._id,
          details: inquiryDetails.trim(),
          ...(inquiryQty ? { quantity: Number(inquiryQty) } : {}),
          ...(targetPrice !== "" ? { targetPrice: Number(targetPrice) } : {}),
        }),
      });
      setStatusMessage("Inquiry / RFQ sent directly to the supplier.");
      setInquiryDetails("");
      setInquiryQty("");
      setTargetPrice("");
      setShowInquiryForm(false);
    } catch (err) {
      setStatusMessage(err.message);
    } finally {
      setSendingInquiry(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    setStatusMessage("");
    try {
      await apiRequest("/sourcing/reviews", {
        method: "POST",
        body: JSON.stringify({
          productId: product._id,
          rating: Number(reviewRating),
          comment: reviewComment.trim(),
        }),
      });
      setStatusMessage("Thank you! Your review has been submitted for admin moderation.");
      setReviewComment("");
    } catch (err) {
      setStatusMessage(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-sm text-[#475569]">Loading product specifications...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-[#0b2149]">Product unavailable</h1>
        <p className="text-sm text-[#475569] mt-2 mb-6">{error || "Listing not found."}</p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0b2149] text-white text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const isCompared = compareIds.includes(String(product._id));
  const supplier = product.supplier || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#475569] hover:text-[#0b2149]"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to Wholesale Marketplace
        </Link>
      </div>

      {statusMessage && (
        <div
          role="status"
          className="mb-6 p-4 rounded-xl border border-[#cbd5e1] bg-[#eef3f9] text-sm font-medium text-[#0b2149]"
        >
          {statusMessage}
        </div>
      )}

      {/* Split Contiguous PDP Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Gallery & Specifications */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden aspect-[4/3]">
            <ProductImage
              src={product.images?.[0]}
              alt={product.name}
              className="w-full h-full"
            />
          </div>

          <section className="bg-white border border-[#e2e8f0] rounded-xl p-6">
            <h2 className="text-lg font-bold text-[#0b2149] m-0 mb-3">Product Description</h2>
            <p className="text-sm text-[#475569] leading-relaxed m-0">
              {product.description || "Wholesale listing provided by verified Bangladeshi supplier."}
            </p>

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#e2e8f0]">
              <div>
                <dt className="text-xs text-[#64748b]">Category</dt>
                <dd className="text-sm font-semibold text-[#0b2149] m-0 mt-1">{product.category}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#64748b]">Min. Order (MOQ)</dt>
                <dd className="text-sm font-semibold text-[#0b2149] m-0 mt-1 tabular-nums">
                  {product.minimumOrderQuantity || 1} {product.unit}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#64748b]">Available Stock</dt>
                <dd className="text-sm font-semibold text-[#0b2149] m-0 mt-1 tabular-nums">
                  {Number(product.quantity).toLocaleString()} {product.unit}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#64748b]">Price Updated</dt>
                <dd className="text-sm font-semibold text-[#0b2149] m-0 mt-1 tabular-nums">
                  {formatShortDate(product.updatedAt || product.createdAt)}
                </dd>
              </div>
            </dl>
          </section>

          {/* Approved Reviews */}
          <section className="bg-white border border-[#e2e8f0] rounded-xl p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-bold text-[#0b2149] m-0">Buyer Reviews</h2>
              <span className="text-sm text-[#475569] tabular-nums">
                {product.reviewCount > 0
                  ? `★ ${product.averageRating} (${product.reviewCount} approved)`
                  : "No approved reviews yet"}
              </span>
            </div>

            {reviews.length === 0 ? (
              <p className="text-sm text-[#64748b] m-0">
                Verified buyers with a delivered order can submit reviews for this listing.
              </p>
            ) : (
              <div className="divide-y divide-[#e2e8f0]">
                {reviews.map((rev) => (
                  <article key={rev._id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2 text-xs text-[#64748b]">
                      <span className="font-semibold text-[#0b2149]">
                        {rev.buyer?.name || "Verified Buyer"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[#f56600] font-semibold tabular-nums">
                        <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                        {rev.rating} / 5
                      </span>
                    </div>
                    <p className="text-sm text-[#334155] m-0 mt-1.5 leading-relaxed">
                      {rev.comment || "Rated this product positively."}
                    </p>
                  </article>
                ))}
              </div>
            )}

            {canReview && (
              <form onSubmit={handleReviewSubmit} className="mt-6 pt-6 border-t border-[#e2e8f0] flex flex-col gap-3">
                <h3 className="text-sm font-bold text-[#0b2149] m-0">Leave a Verified Buyer Review</h3>
                <div className="flex items-center gap-3">
                  <label htmlFor="review-rating" className="text-xs font-semibold text-[#475569]">
                    Rating
                  </label>
                  <select
                    id="review-rating"
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                    className="px-3 py-1.5 border border-[#cbd5e1] rounded-lg text-sm bg-white"
                  >
                    <option value={5}>5 - Excellent</option>
                    <option value={4}>4 - Good</option>
                    <option value={3}>3 - Satisfactory</option>
                    <option value={2}>2 - Fair</option>
                    <option value={1}>1 - Poor</option>
                  </select>
                </div>
                <textarea
                  rows={2}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share product quality, packaging, or delivery feedback..."
                  className="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm"
                />
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-fit px-4 py-2 rounded-lg bg-[#0b2149] text-white text-sm font-semibold"
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </form>
            )}
          </section>
        </div>

        {/* Right Contiguous Purchase & Supplier Module */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 flex flex-col gap-6">
          <section className="bg-white border border-[#e2e8f0] rounded-xl p-6 flex flex-col gap-4">
            <div className="text-xs text-[#64748b] flex items-center gap-1.5 flex-wrap">
              <span>{product.category}</span>
              <span aria-hidden="true">·</span>
              <span>{supplier.city || "Bangladesh"}</span>
              {supplier.isVerified && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#15803d] font-semibold">Verified Supplier</span>
                </>
              )}
            </div>

            <h1 className="text-2xl font-bold text-[#0b2149] leading-snug m-0 text-balance">
              {product.name}
            </h1>

            <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
              <div className="text-xs text-[#64748b]">Approximate wholesale price</div>
              <div className="font-mono-num text-2xl font-bold text-[#0b2149] mt-0.5">
                {formatCurrency(product.price, product.currency)}
                <span className="text-sm font-normal text-[#475569]"> / {product.unit}</span>
              </div>
              <p className="text-xs text-[#64748b] m-0 mt-1.5">
                Market rate guide only — final bulk pricing is confirmed directly with the supplier.
              </p>
            </div>

            <form onSubmit={handlePlaceOrder} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs font-semibold text-[#0b2149]">
                  Quantity ({product.unit})
                  <input
                    type="number"
                    min={product.minimumOrderQuantity || 1}
                    max={Math.max(product.minimumOrderQuantity || 1, product.quantity || 1)}
                    value={orderQty}
                    onChange={(e) => setOrderQty(e.target.value)}
                    required
                    className="px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm font-normal tabular-nums"
                  />
                </label>

                <div className="flex flex-col justify-end">
                  <div className="text-xs text-[#64748b]">Estimated Subtotal</div>
                  <div className="font-mono-num text-base font-bold text-[#0b2149]">
                    {formatCurrency(Number(orderQty || 0) * Number(product.price || 0), product.currency)}
                  </div>
                </div>
              </div>

              <label className="flex flex-col gap-1 text-xs font-semibold text-[#0b2149]">
                Contact Phone Number (11 digits)
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  pattern="01[3-9][0-9]{8}"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(sanitizeBdPhoneInput(e.target.value))}
                  placeholder="01XXXXXXXXX"
                  required
                  className="px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm font-normal tabular-nums"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-[#0b2149]">
                Delivery Address
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="e.g. Mirpur-10, Dhaka"
                  required
                  className="px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm font-normal"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-[#0b2149]">
                Special Notes (Optional)
                <input
                  type="text"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Color, grade, or packaging instructions"
                  className="px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm font-normal"
                />
              </label>

              <button
                type="submit"
                disabled={placingOrder || Number(product.quantity) <= 0}
                className="w-full py-3 px-4 rounded-lg bg-[#f56600] hover:bg-[#d95600] disabled:bg-slate-300 text-white text-sm font-semibold transition-colors"
              >
                {Number(product.quantity) <= 0
                  ? "Out of Stock"
                  : placingOrder
                    ? "Placing Order..."
                    : "Place Wholesale Order"}
              </button>
            </form>

            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#e2e8f0]">
              <button
                type="button"
                onClick={handleToggleFavorite}
                className={`inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                  isFavorite
                    ? "bg-[#fff4eb] border-[#f56600] text-[#f56600]"
                    : "bg-white border-[#cbd5e1] text-[#0b2149] hover:bg-[#eef3f9]"
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} aria-hidden="true" />
                {isFavorite ? "Saved" : "Save Product"}
              </button>

              <button
                type="button"
                onClick={() => toggleCompare(product._id)}
                className={`inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                  isCompared
                    ? "bg-[#0b2149] border-[#0b2149] text-white"
                    : "bg-white border-[#cbd5e1] text-[#0b2149] hover:bg-[#eef3f9]"
                }`}
              >
                {isCompared ? <Check className="w-4 h-4" aria-hidden="true" /> : <Scale className="w-4 h-4" aria-hidden="true" />}
                {isCompared ? "In Compare" : "Compare"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowInquiryForm((prev) => !prev)}
              className="w-full py-2.5 px-4 rounded-lg border border-[#0b2149] text-[#0b2149] hover:bg-[#eef3f9] text-sm font-semibold transition-colors"
            >
              {showInquiryForm ? "Hide Quotation Form" : "Ask Supplier / Request Quotation (RFQ)"}
            </button>

            {showInquiryForm && (
              <form onSubmit={handleSendInquiry} className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-xs font-semibold text-[#0b2149]">
                  Your Requirement Details
                  <textarea
                    rows={3}
                    required
                    value={inquiryDetails}
                    onChange={(e) => setInquiryDetails(e.target.value)}
                    placeholder="Ask about bulk discount, sample dispatch, or custom specs..."
                    className="px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm font-normal bg-white"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-xs font-semibold text-[#0b2149]">
                    Target Quantity
                    <input
                      type="number"
                      min="1"
                      value={inquiryQty}
                      onChange={(e) => setInquiryQty(e.target.value)}
                      placeholder="Optional"
                      className="px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm font-normal bg-white"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-[#0b2149]">
                    Target Price ({product.currency})
                    <input
                      type="number"
                      min="0"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      placeholder="Optional"
                      className="px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm font-normal bg-white"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={sendingInquiry}
                  className="py-2.5 px-4 rounded-lg bg-[#0b2149] text-white text-sm font-semibold"
                >
                  {sendingInquiry ? "Sending..." : "Send RFQ to Supplier"}
                </button>
              </form>
            )}
          </section>

          {/* Supplier Information Card */}
          <section className="bg-white border border-[#e2e8f0] rounded-xl p-6 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-[#64748b]">
                  {supplier.businessType || "Wholesale Supplier"}
                  {supplier.isVerified ? " · Verified Business" : ""}
                </div>
                <h2 className="text-lg font-bold text-[#0b2149] m-0 mt-0.5">
                  {supplier.businessName || supplier.name || "SourceBD Supplier"}
                </h2>
              </div>
              <Building2 className="w-5 h-5 text-[#f56600] shrink-0" aria-hidden="true" />
            </div>

            {supplier.businessDescription && (
              <p className="text-xs text-[#475569] leading-relaxed m-0">
                {supplier.businessDescription}
              </p>
            )}

            <div className="flex flex-col gap-2 text-xs text-[#475569] pt-2 border-t border-[#f1f5f9]">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#64748b] shrink-0" aria-hidden="true" />
                <span>{[supplier.address, supplier.city].filter(Boolean).join(", ") || "Bangladesh"}</span>
              </div>
              {supplier.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#64748b] shrink-0" aria-hidden="true" />
                  <span className="font-mono-num">{supplier.phone}</span>
                </div>
              )}
              {supplier.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#64748b] shrink-0" aria-hidden="true" />
                  <span>{supplier.email}</span>
                </div>
              )}
            </div>

            {supplier._id && (
              <Link
                to={`/suppliers/${supplier._id}`}
                className="mt-2 inline-flex items-center justify-center py-2.5 px-4 rounded-lg border border-[#cbd5e1] hover:border-[#0b2149] text-sm font-semibold text-[#0b2149] transition-colors"
              >
                View Full Supplier Profile
              </Link>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
