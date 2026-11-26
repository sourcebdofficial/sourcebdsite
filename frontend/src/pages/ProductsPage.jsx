import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, RotateCcw, Scale } from "lucide-react";
import { apiRequest } from "../api/client";
import ProductCard from "../components/ProductCard";
import { useAuth } from "../context/AuthContext";

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { compareIds } = useAuth();

  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [maxMoq, setMaxMoq] = useState(searchParams.get("maxMoq") || "");
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get("verifiedOnly") === "true");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  const [page, setPage] = useState(Number(searchParams.get("page") || 1));

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalProducts: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Sync local state if URL changes externally (e.g., clicking a header or category link)
  useEffect(() => {
    setSearchInput(searchParams.get("search") || "");
    setCategory(searchParams.get("category") || "");
    setLocation(searchParams.get("location") || "");
    setMinPrice(searchParams.get("minPrice") || "");
    setMaxPrice(searchParams.get("maxPrice") || "");
    setMaxMoq(searchParams.get("maxMoq") || "");
    setVerifiedOnly(searchParams.get("verifiedOnly") === "true");
    setSort(searchParams.get("sort") || "newest");
    setPage(Number(searchParams.get("page") || 1));
  }, [searchParams]);

  useEffect(() => {
    apiRequest("/sourcing/categories")
      .then((data) => setCategories(data.categories || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError("");
      try {
        const query = new URLSearchParams();
        const urlSearch = searchParams.get("search");
        const urlCat = searchParams.get("category");
        const urlLoc = searchParams.get("location");
        const urlMin = searchParams.get("minPrice");
        const urlMax = searchParams.get("maxPrice");
        const urlMoq = searchParams.get("maxMoq");
        const urlVerified = searchParams.get("verifiedOnly");
        const urlSort = searchParams.get("sort");
        const urlPage = searchParams.get("page") || "1";

        if (urlSearch) query.set("search", urlSearch);
        if (urlCat) query.set("category", urlCat);
        if (urlLoc) query.set("location", urlLoc);
        if (urlMin) query.set("minPrice", urlMin);
        if (urlMax) query.set("maxPrice", urlMax);
        if (urlMoq) query.set("maxMoq", urlMoq);
        if (urlVerified === "true") query.set("verifiedOnly", "true");
        if (urlSort) query.set("sort", urlSort);
        query.set("page", urlPage);
        query.set("limit", "12");

        const data = await apiRequest(`/products?${query.toString()}`);
        setProducts(data.products || []);
        setPagination(data.pagination || { currentPage: 1, totalPages: 1, totalProducts: 0 });
      } catch (err) {
        setError(err.message || "Could not load products.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchParams]);

  const applyFilters = (overrides = {}) => {
    const next = new URLSearchParams();
    const s = overrides.search !== undefined ? overrides.search : searchInput;
    const c = overrides.category !== undefined ? overrides.category : category;
    const l = overrides.location !== undefined ? overrides.location : location;
    const minP = overrides.minPrice !== undefined ? overrides.minPrice : minPrice;
    const maxP = overrides.maxPrice !== undefined ? overrides.maxPrice : maxPrice;
    const moq = overrides.maxMoq !== undefined ? overrides.maxMoq : maxMoq;
    const ver = overrides.verifiedOnly !== undefined ? overrides.verifiedOnly : verifiedOnly;
    const srt = overrides.sort !== undefined ? overrides.sort : sort;
    const pg = overrides.page !== undefined ? overrides.page : 1;

    if (s.trim()) next.set("search", s.trim());
    if (c) next.set("category", c);
    if (l) next.set("location", l);
    if (minP !== "") next.set("minPrice", minP);
    if (maxP !== "") next.set("maxPrice", maxP);
    if (moq !== "") next.set("maxMoq", moq);
    if (ver) next.set("verifiedOnly", "true");
    if (srt && srt !== "newest") next.set("sort", srt);
    if (pg > 1) next.set("page", String(pg));

    setSearchParams(next);
  };

  const resetFilters = () => {
    setSearchInput("");
    setCategory("");
    setLocation("");
    setMinPrice("");
    setMaxPrice("");
    setMaxMoq("");
    setVerifiedOnly(false);
    setSort("newest");
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-[#e2e8f0]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0b2149] m-0">
            Wholesale Marketplace
          </h1>
          <p className="text-sm text-[#475569] m-0 mt-1">
            Filter wholesale products and raw materials by category, district, MOQ, and approximate price.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {compareIds.length > 0 && (
            <Link
              to="/compare"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0b2149] text-white text-sm font-semibold whitespace-nowrap"
            >
              <Scale className="w-4 h-4" aria-hidden="true" />
              Compare ({compareIds.length})
            </Link>
          )}
          <span className="text-sm text-[#475569] tabular-nums">
            {pagination.totalProducts} {pagination.totalProducts === 1 ? "listing" : "listings"}
          </span>
        </div>
      </div>

      {/* Main Filter + Grid Layout */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Filter Sidebar */}
        <aside className="lg:col-span-3 bg-white border border-[#e2e8f0] rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0b2149] m-0">Filters</h2>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#f56600] hover:text-[#d95600] bg-transparent border-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              applyFilters({ page: 1 });
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="mkt-search" className="text-xs font-semibold text-[#0b2149]">
                Keyword
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-[#64748b] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="mkt-search"
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Product or material..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#cbd5e1] rounded-lg bg-white text-[#0f172a]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="mkt-category" className="text-xs font-semibold text-[#0b2149]">
                Category
              </label>
              <select
                id="mkt-category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  applyFilters({ category: e.target.value, page: 1 });
                }}
                className="w-full px-3 py-2 text-sm border border-[#cbd5e1] rounded-lg bg-white text-[#0f172a]"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat._id || cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="mkt-location" className="text-xs font-semibold text-[#0b2149]">
                City / District
              </label>
              <select
                id="mkt-location"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  applyFilters({ location: e.target.value, page: 1 });
                }}
                className="w-full px-3 py-2 text-sm border border-[#cbd5e1] rounded-lg bg-white text-[#0f172a]"
              >
                <option value="">All Bangladesh</option>
                <option value="Dhaka">Dhaka</option>
                <option value="Narayanganj">Narayanganj</option>
                <option value="Chattogram">Chattogram</option>
                <option value="Gazipur">Gazipur</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="mkt-min-price" className="text-xs font-semibold text-[#0b2149]">
                  Min Price (৳)
                </label>
                <input
                  id="mkt-min-price"
                  type="number"
                  min="0"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm border border-[#cbd5e1] rounded-lg bg-white text-[#0f172a] tabular-nums"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="mkt-max-price" className="text-xs font-semibold text-[#0b2149]">
                  Max Price (৳)
                </label>
                <input
                  id="mkt-max-price"
                  type="number"
                  min="0"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Any"
                  className="w-full px-3 py-2 text-sm border border-[#cbd5e1] rounded-lg bg-white text-[#0f172a] tabular-nums"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="mkt-max-moq" className="text-xs font-semibold text-[#0b2149]">
                Max MOQ (units)
              </label>
              <input
                id="mkt-max-moq"
                type="number"
                min="1"
                value={maxMoq}
                onChange={(e) => setMaxMoq(e.target.value)}
                placeholder="e.g. 100"
                className="w-full px-3 py-2 text-sm border border-[#cbd5e1] rounded-lg bg-white text-[#0f172a] tabular-nums"
              />
            </div>

            <label className="flex items-center gap-2.5 text-sm text-[#0f172a] cursor-pointer">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => {
                  setVerifiedOnly(e.target.checked);
                  applyFilters({ verifiedOnly: e.target.checked, page: 1 });
                }}
                className="w-4 h-4 accent-[#0b2149]"
              />
              <span>Verified suppliers only</span>
            </label>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-[#f56600] hover:bg-[#d95600] text-white text-sm font-semibold transition-colors"
            >
              Apply Filters
            </button>
          </form>
        </aside>

        {/* Results Column */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-[#e2e8f0] rounded-xl px-4 py-3">
            <div className="text-xs text-[#64748b]">
              Showing approximate wholesale listings · Click any item for full MOQ &amp; supplier details
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="mkt-sort" className="text-xs font-semibold text-[#0b2149]">
                Sort by
              </label>
              <select
                id="mkt-sort"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  applyFilters({ sort: e.target.value, page: 1 });
                }}
                className="px-3 py-1.5 text-sm border border-[#cbd5e1] rounded-lg bg-white text-[#0f172a]"
              >
                <option value="newest">Newest listings</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="moq_asc">Lowest MOQ first</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-80 rounded-xl border border-[#e2e8f0] bg-white" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white border border-dashed border-[#cbd5e1] rounded-xl p-12 text-center">
              <h2 className="text-lg font-semibold text-[#0b2149] m-0">No matching products found</h2>
              <p className="text-sm text-[#475569] mt-2 mb-4">
                Try broadening your keyword, removing price/MOQ caps, or resetting filters.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 rounded-lg bg-[#0b2149] text-white text-sm font-semibold"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => applyFilters({ page: page - 1 })}
                className="px-4 py-2 rounded-lg border border-[#cbd5e1] bg-white text-sm font-medium text-[#0b2149] disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-[#475569] tabular-nums">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => applyFilters({ page: page + 1 })}
                className="px-4 py-2 rounded-lg border border-[#cbd5e1] bg-white text-sm font-medium text-[#0b2149] disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
