import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, Mail, ShieldCheck, Star } from "lucide-react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ProductCard from "../components/ProductCard";

export default function SupplierProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [supplier, setSupplier] = useState(null);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [productName, setProductName] = useState("");
  const [details, setDetails] = useState("");
  const [quantity, setQuantity] = useState("");
  const [sending, setSending] = useState(false);
  const [rfqMessage, setRfqMessage] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    apiRequest(`/sourcing/suppliers/${id}`)
      .then((data) => {
        setSupplier(data.supplier);
        setProducts(data.products || []);
        setReviews(data.reviews || []);
      })
      .catch((err) => setError(err.message || "Could not load supplier profile."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRfqSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "buyer") {
      setRfqMessage("Please log in with a buyer account to send a quotation request.");
      return;
    }
    setSending(true);
    setRfqMessage("");
    try {
      await apiRequest("/sourcing/inquiries", {
        method: "POST",
        body: JSON.stringify({
          supplierId: supplier._id,
          productName: productName.trim() || "Wholesale requirement",
          details: details.trim(),
          ...(quantity ? { quantity: Number(quantity) } : {}),
        }),
      });
      setRfqMessage("Quotation request sent! Track responses in your Buyer Dashboard.");
      setProductName("");
      setDetails("");
      setQuantity("");
    } catch (err) {
      setRfqMessage(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-sm text-[#475569]">Loading supplier profile...</p>
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-[#0b2149]">Supplier not found</h1>
        <p className="text-sm text-[#475569] mt-2 mb-6">{error}</p>
        <Link
          to="/suppliers"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0b2149] text-white text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to Suppliers Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <Link
          to="/suppliers"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#475569] hover:text-[#0b2149]"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to Suppliers Directory
        </Link>
      </div>

      {/* Supplier Header & Direct RFQ Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <section className="lg:col-span-7 bg-white border border-[#e2e8f0] rounded-xl p-6 sm:p-8 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748b]">
            <span>{supplier.businessType || "Wholesale Supplier"}</span>
            <span aria-hidden="true">·</span>
            <span>Contact: {supplier.name}</span>
            {supplier.isVerified && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-[#15803d] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  Verified Business
                </span>
              </>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#0b2149] m-0">
            {supplier.businessName || supplier.name}
          </h1>

          <p className="text-sm text-[#475569] leading-relaxed m-0">
            {supplier.businessDescription || "Verified wholesale supplier operating on SourceBD."}
          </p>

          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#e2e8f0]">
            <div>
              <dt className="text-xs text-[#64748b] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> Location
              </dt>
              <dd className="text-sm font-medium text-[#0b2149] m-0 mt-1">
                {[supplier.address, supplier.city].filter(Boolean).join(", ") || "Bangladesh"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748b] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" aria-hidden="true" /> Phone
              </dt>
              <dd className="text-sm font-medium text-[#0b2149] m-0 mt-1 font-mono-num">
                {supplier.phone || "Available after inquiry"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748b] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" aria-hidden="true" /> Email
              </dt>
              <dd className="text-sm font-medium text-[#0b2149] m-0 mt-1 break-all">
                {supplier.email || "—"}
              </dd>
            </div>
          </dl>

          <div className="pt-4 border-t border-[#e2e8f0] flex flex-wrap items-center gap-6 text-sm text-[#475569] tabular-nums">
            <span>
              <strong className="text-[#0b2149]">{products.length}</strong> published listings
            </span>
            <span>
              <strong className="text-[#0b2149]">
                {supplier.reviewCount > 0 ? `★ ${supplier.averageRating}` : "—"}
              </strong>{" "}
              ({supplier.reviewCount} approved {supplier.reviewCount === 1 ? "review" : "reviews"})
            </span>
          </div>
        </section>

        {/* Direct RFQ Box */}
        <section className="lg:col-span-5 bg-white border border-[#e2e8f0] rounded-xl p-6">
          <h2 className="text-lg font-bold text-[#0b2149] m-0">Request Direct Quotation (RFQ)</h2>
          <p className="text-xs text-[#64748b] m-0 mt-1 mb-4">
            Send custom bulk requirements directly to {supplier.businessName || supplier.name}.
          </p>

          {rfqMessage && (
            <div role="status" className="mb-4 p-3 rounded-lg bg-[#eef3f9] text-xs font-medium text-[#0b2149]">
              {rfqMessage}
            </div>
          )}

          <form onSubmit={handleRfqSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-[#0b2149]">
              Material or Product Needed
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Custom 280 GSM cotton twill"
                className="px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm font-normal"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-[#0b2149]">
              Estimated Quantity (Optional)
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 500"
                className="px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm font-normal"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-[#0b2149]">
              Requirement Details
              <textarea
                rows={3}
                required
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe target delivery district, specs, and packaging needs..."
                className="px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm font-normal"
              />
            </label>
            <button
              type="submit"
              disabled={sending}
              className="w-full py-2.5 px-4 rounded-lg bg-[#f56600] hover:bg-[#d95600] text-white text-sm font-semibold transition-colors"
            >
              {sending ? "Sending RFQ..." : "Send Quotation Request"}
            </button>
          </form>
        </section>
      </div>

      {/* Supplier Catalog */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-[#0b2149] m-0 mb-5">
          Published Catalog ({products.length})
        </h2>
        {products.length === 0 ? (
          <div className="bg-white border border-dashed border-[#cbd5e1] rounded-xl p-10 text-center text-sm text-[#64748b]">
            This supplier has no published listings right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Supplier Reviews */}
      {reviews.length > 0 && (
        <section className="mt-10 bg-white border border-[#e2e8f0] rounded-xl p-6">
          <h2 className="text-xl font-bold text-[#0b2149] m-0 mb-4">Approved Buyer Reviews</h2>
          <div className="divide-y divide-[#e2e8f0]">
            {reviews.map((rev) => (
              <article key={rev._id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2 text-xs text-[#64748b]">
                  <span>
                    <strong className="text-[#0b2149]">{rev.buyer?.name || "Buyer"}</strong>
                    {rev.product?.name ? ` · on ${rev.product.name}` : ""}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[#f56600] font-semibold tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                    {rev.rating} / 5
                  </span>
                </div>
                <p className="text-sm text-[#334155] m-0 mt-1.5">{rev.comment}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
