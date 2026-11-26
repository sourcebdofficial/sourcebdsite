import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, ShieldCheck, ArrowRight } from "lucide-react";
import { apiRequest } from "../api/client";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSuppliers = async (overrides = {}) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      const s = overrides.search !== undefined ? overrides.search : search;
      const l = overrides.location !== undefined ? overrides.location : location;
      const t = overrides.businessType !== undefined ? overrides.businessType : businessType;
      const v = overrides.verifiedOnly !== undefined ? overrides.verifiedOnly : verifiedOnly;

      if (s.trim()) params.set("search", s.trim());
      if (l) params.set("location", l);
      if (t) params.set("businessType", t);
      if (v) params.set("verifiedOnly", "true");

      const data = await apiRequest(`/sourcing/suppliers?${params.toString()}`);
      setSuppliers(data.suppliers || []);
    } catch (err) {
      setError(err.message || "Could not load suppliers directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchSuppliers();
  };

  const reset = () => {
    setSearch("");
    setLocation("");
    setBusinessType("");
    setVerifiedOnly(false);
    fetchSuppliers({ search: "", location: "", businessType: "", verifiedOnly: false });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="pb-6 border-b border-[#e2e8f0]">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0b2149] m-0">
          Suppliers Directory
        </h1>
        <p className="text-sm text-[#475569] m-0 mt-1.5">
          Discover wholesalers, manufacturers, and importers across Bangladesh&apos;s commercial hubs.
        </p>
      </div>

      {/* Filter Bar */}
      <form
        onSubmit={handleSubmit}
        className="mt-6 bg-white border border-[#e2e8f0] rounded-xl p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
      >
        <div className="md:col-span-4 relative">
          <Search className="w-4 h-4 text-[#64748b] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search business name or specialty..."
            aria-label="Search suppliers"
            className="w-full pl-9 pr-3 py-2 border border-[#cbd5e1] rounded-lg text-sm"
          />
        </div>

        <select
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            fetchSuppliers({ location: e.target.value });
          }}
          aria-label="Filter by city"
          className="md:col-span-2 px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm bg-white"
        >
          <option value="">All Bangladesh</option>
          <option value="Dhaka">Dhaka</option>
          <option value="Narayanganj">Narayanganj</option>
          <option value="Chattogram">Chattogram</option>
          <option value="Gazipur">Gazipur</option>
        </select>

        <select
          value={businessType}
          onChange={(e) => {
            setBusinessType(e.target.value);
            fetchSuppliers({ businessType: e.target.value });
          }}
          aria-label="Filter by business type"
          className="md:col-span-2 px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm bg-white"
        >
          <option value="">All Types</option>
          <option value="Wholesaler">Wholesaler</option>
          <option value="Manufacturer">Manufacturer</option>
          <option value="Importer">Importer</option>
        </select>

        <label className="md:col-span-2 flex items-center gap-2 text-sm text-[#0f172a] cursor-pointer px-2">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => {
              setVerifiedOnly(e.target.checked);
              fetchSuppliers({ verifiedOnly: e.target.checked });
            }}
            className="w-4 h-4 accent-[#0b2149]"
          />
          <span className="whitespace-nowrap">Verified only</span>
        </label>

        <div className="md:col-span-2 flex items-center gap-2">
          <button
            type="submit"
            className="flex-1 py-2 px-3 rounded-lg bg-[#f56600] hover:bg-[#d95600] text-white text-sm font-semibold whitespace-nowrap"
          >
            Search
          </button>
          <button
            type="button"
            onClick={reset}
            className="py-2 px-3 rounded-lg border border-[#cbd5e1] text-sm text-[#475569] bg-white"
          >
            Reset
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-6 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-52 rounded-xl border border-[#e2e8f0] bg-white" />
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <div className="mt-6 bg-white border border-dashed border-[#cbd5e1] rounded-xl p-10 text-center">
          <p className="text-sm text-[#475569] m-0">No suppliers match the selected filters.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {suppliers.map((sup) => (
            <article
              key={sup._id}
              className="bg-white border border-[#e2e8f0] rounded-xl p-6 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-[#64748b]">
                  <span>{sup.businessType || "Supplier"}</span>
                  {sup.isVerified ? (
                    <span className="inline-flex items-center gap-1 text-[#15803d] font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                      Verified
                    </span>
                  ) : (
                    <span>Pending verification</span>
                  )}
                </div>

                <h2 className="text-lg font-bold text-[#0b2149] m-0 mt-1.5">
                  <Link to={`/suppliers/${sup._id}`} className="hover:text-[#f56600] transition-colors">
                    {sup.businessName || sup.name}
                  </Link>
                </h2>

                <p className="text-xs text-[#475569] m-0 mt-2 leading-relaxed line-clamp-3">
                  {sup.businessDescription || "Wholesale supplier registered on SourceBD."}
                </p>
              </div>

              <div className="pt-4 border-t border-[#f1f5f9] flex flex-col gap-3">
                <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                  <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{[sup.address, sup.city].filter(Boolean).join(", ") || "Bangladesh"}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-[#475569] tabular-nums">
                    {sup.productCount} {sup.productCount === 1 ? "product" : "products"}
                    {sup.reviewCount > 0 && ` · ★ ${sup.averageRating}`}
                  </div>
                  <Link
                    to={`/suppliers/${sup._id}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[#f56600] hover:text-[#d95600] whitespace-nowrap"
                  >
                    View Profile <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
