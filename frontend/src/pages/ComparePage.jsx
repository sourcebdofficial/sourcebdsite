import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, Plus, ArrowRight } from "lucide-react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ProductImage from "../components/ProductImage";
import { buildCompareSummary, formatCurrency, formatShortDate } from "../utils/compare";

export default function ComparePage() {
  const { compareIds, toggleCompare, removeFromCompare, clearCompare } = useAuth();
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAddId, setSelectedAddId] = useState("");

  useEffect(() => {
    apiRequest("/products?limit=50")
      .then((data) => setAllProducts(data.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const comparedProducts = allProducts.filter((p) => compareIds.includes(String(p._id)));
  const availableToAdd = allProducts.filter((p) => !compareIds.includes(String(p._id)));
  const summary = buildCompareSummary(comparedProducts);

  const handleQuickAdd = (e) => {
    e.preventDefault();
    if (!selectedAddId) return;
    toggleCompare(selectedAddId);
    setSelectedAddId("");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-[#e2e8f0]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0b2149] m-0">
            Compare Suppliers &amp; Listings
          </h1>
          <p className="text-sm text-[#475569] m-0 mt-1.5">
            Evaluate unit price, minimum order quantity, stock availability, and verification side-by-side (up to 4 items).
          </p>
        </div>

        {comparedProducts.length > 0 && (
          <button
            type="button"
            onClick={clearCompare}
            className="px-4 py-2 rounded-lg border border-[#cbd5e1] bg-white text-sm font-medium text-[#475569] hover:text-[#b91c1c] hover:border-red-300"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Quick Picker to add listings directly from this page */}
      {availableToAdd.length > 0 && comparedProducts.length < 4 && (
        <form
          onSubmit={handleQuickAdd}
          className="mt-6 bg-white border border-[#e2e8f0] rounded-xl p-4 flex flex-wrap items-center gap-3"
        >
          <label htmlFor="compare-add-select" className="text-xs font-semibold text-[#0b2149] whitespace-nowrap">
            Add listing to compare:
          </label>
          <select
            id="compare-add-select"
            value={selectedAddId}
            onChange={(e) => setSelectedAddId(e.target.value)}
            className="flex-1 min-w-[220px] px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm bg-white"
          >
            <option value="">Select a wholesale product...</option>
            {availableToAdd.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name} — {formatCurrency(item.price, item.currency)} / {item.unit} (MOQ {item.minimumOrderQuantity})
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!selectedAddId}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0b2149] disabled:bg-slate-300 text-white text-sm font-semibold whitespace-nowrap"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add to Table
          </button>
        </form>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-[#475569]">Loading comparison data...</p>
      ) : comparedProducts.length === 0 ? (
        <div className="mt-8 bg-white border border-dashed border-[#cbd5e1] rounded-xl p-12 text-center">
          <h2 className="text-lg font-semibold text-[#0b2149] m-0">No products selected for comparison</h2>
          <p className="text-sm text-[#475569] mt-2 mb-6 max-w-md mx-auto">
            Use the selector above or click &ldquo;Compare&rdquo; on any product card in the marketplace to compare pricing and MOQ side-by-side.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#f56600] text-white text-sm font-semibold"
          >
            Browse Wholesale Products <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="mt-6 w-fit max-w-full bg-white border border-[#e2e8f0] rounded-xl overflow-x-auto">
          <table className="w-auto text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                <th className="p-4 text-xs font-semibold text-[#475569] w-44 min-w-[170px]">Specification</th>
                {comparedProducts.map((item) => (
                  <th key={item._id} className="p-4 align-top w-[260px] min-w-[230px] max-w-[270px]">
                    <div className="flex flex-col gap-3">
                      <Link
                        to={`/products/${item._id}`}
                        className="block w-full max-w-[230px] aspect-[4/3] rounded-lg overflow-hidden border border-[#e2e8f0]"
                      >
                        <ProductImage src={item.images?.[0]} alt={item.name} className="w-full h-full" />
                      </Link>
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/products/${item._id}`} className="text-sm font-bold text-[#0b2149] hover:text-[#f56600]">
                          {item.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeFromCompare(item._id)}
                          aria-label={`Remove ${item.name}`}
                          className="p-1.5 rounded-md text-[#64748b] hover:text-[#b91c1c] hover:bg-red-50 bg-transparent border-0"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0] text-sm">
              <tr>
                <th className="p-4 font-semibold text-[#0b2149] bg-[#f8fafc]">Approx. Unit Price</th>
                {comparedProducts.map((item) => (
                  <td key={item._id} className="p-4 font-mono-num">
                    <div className="font-bold text-[#0b2149]">
                      {formatCurrency(item.price, item.currency)} / {item.unit}
                    </div>
                    {summary.lowestPriceId === item._id && comparedProducts.length > 1 && (
                      <div className="text-xs text-[#15803d] font-sans font-semibold mt-0.5">
                        Lowest listed unit price
                      </div>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="p-4 font-semibold text-[#0b2149] bg-[#f8fafc]">Minimum Order (MOQ)</th>
                {comparedProducts.map((item) => (
                  <td key={item._id} className="p-4 tabular-nums">
                    <span className="font-semibold text-[#0f172a]">
                      {item.minimumOrderQuantity || 1} {item.unit}
                    </span>
                    {summary.lowestMoqId === item._id && comparedProducts.length > 1 && (
                      <div className="text-xs text-[#15803d] font-semibold mt-0.5">
                        Lowest MOQ
                      </div>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="p-4 font-semibold text-[#0b2149] bg-[#f8fafc]">Available Stock</th>
                {comparedProducts.map((item) => (
                  <td key={item._id} className="p-4 tabular-nums text-[#475569]">
                    {Number(item.quantity).toLocaleString()} {item.unit}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="p-4 font-semibold text-[#0b2149] bg-[#f8fafc]">Supplier</th>
                {comparedProducts.map((item) => (
                  <td key={item._id} className="p-4">
                    {item.supplier?._id ? (
                      <Link to={`/suppliers/${item.supplier._id}`} className="font-semibold text-[#0b2149] hover:text-[#f56600]">
                        {item.supplier.businessName || item.supplier.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="p-4 font-semibold text-[#0b2149] bg-[#f8fafc]">Location</th>
                {comparedProducts.map((item) => (
                  <td key={item._id} className="p-4 text-[#475569]">
                    {item.supplier?.city || "Bangladesh"}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="p-4 font-semibold text-[#0b2149] bg-[#f8fafc]">Verification</th>
                {comparedProducts.map((item) => (
                  <td key={item._id} className="p-4">
                    {item.supplier?.isVerified ? (
                      <span className="text-[#15803d] font-semibold">Verified Supplier</span>
                    ) : (
                      <span className="text-[#64748b]">Pending verification</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="p-4 font-semibold text-[#0b2149] bg-[#f8fafc]">Buyer Rating</th>
                {comparedProducts.map((item) => (
                  <td key={item._id} className="p-4 tabular-nums text-[#475569]">
                    {item.reviewCount > 0 ? `★ ${item.averageRating} (${item.reviewCount})` : "No reviews yet"}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="p-4 font-semibold text-[#0b2149] bg-[#f8fafc]">Last Updated</th>
                {comparedProducts.map((item) => (
                  <td key={item._id} className="p-4 tabular-nums text-xs text-[#64748b]">
                    {formatShortDate(item.updatedAt || item.createdAt)}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="p-4 font-semibold text-[#0b2149] bg-[#f8fafc]">Action</th>
                {comparedProducts.map((item) => (
                  <td key={item._id} className="p-4">
                    <Link
                      to={`/products/${item._id}`}
                      className="inline-flex items-center justify-center w-full py-2 px-3 rounded-lg bg-[#f56600] hover:bg-[#d95600] text-white text-xs font-semibold whitespace-nowrap"
                    >
                      View &amp; Order / RFQ
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
