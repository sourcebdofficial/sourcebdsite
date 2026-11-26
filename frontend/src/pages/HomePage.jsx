import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, MapPin, ArrowRight, ShieldCheck, Layers, Building2, Scale } from "lucide-react";
import { apiRequest } from "../api/client";
import ProductCard from "../components/ProductCard";
import HeroSupplierShowcase from "../components/HeroSupplierShowcase";

export default function HomePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("All Bangladesh");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      apiRequest("/products?limit=12"),
      apiRequest("/sourcing/categories"),
    ]).then(([prodRes, catRes]) => {
      if (prodRes.status === "fulfilled") {
        setProducts(prodRes.value.products || []);
      }
      if (catRes.status === "fulfilled") {
        const sorted = [...(catRes.value.categories || [])].sort(
          (a, b) => (b.productCount || 0) - (a.productCount || 0) || a.name.localeCompare(b.name)
        );
        setCategories(sorted.slice(0, 6));
      }
      setLoading(false);
    });
  }, []);

  const handleHeroSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (location && location !== "All Bangladesh") params.set("location", location);
    navigate(`/products${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <div>
      {/* 1. Split Hero Section */}
      <section className="bg-[#0b2149] text-white border-b border-[#163468]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center gap-6">
            <div className="text-xs font-medium text-slate-300 tracking-wide">
              Bangladesh Wholesale Network · Verified Local Suppliers
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-[1.12] tracking-tight text-balance m-0">
              Find trusted suppliers.{" "}
              <span className="text-[#f56600]">Source smarter.</span>
            </h1>

            <p className="text-base text-slate-300 max-w-xl leading-relaxed m-0">
              Discover raw materials, wholesale packaging, electronics, and verified
              manufacturers across Dhaka, Narayanganj, Chattogram, and Gazipur—all in one transparent catalog.
            </p>

            {/* Search Panel */}
            <form
              onSubmit={handleHeroSearch}
              className="bg-white rounded-xl p-2 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
            >
              <label className="sm:col-span-6 flex items-center gap-2.5 px-3 py-2 border-b sm:border-b-0 sm:border-r border-[#e2e8f0]">
                <Search className="w-4 h-4 text-[#64748b] shrink-0" aria-hidden="true" />
                <span className="sr-only">Search products or materials</span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search cotton fabric, cartons, spices..."
                  className="w-full bg-transparent text-sm text-[#0f172a] placeholder:text-[#64748b] border-0 outline-none"
                />
              </label>

              <label className="sm:col-span-3 flex items-center gap-2 px-3 py-2">
                <MapPin className="w-4 h-4 text-[#64748b] shrink-0" aria-hidden="true" />
                <span className="sr-only">Select location</span>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-transparent text-sm text-[#0f172a] border-0 outline-none"
                >
                  <option value="All Bangladesh">All Bangladesh</option>
                  <option value="Dhaka">Dhaka</option>
                  <option value="Narayanganj">Narayanganj</option>
                  <option value="Chattogram">Chattogram</option>
                  <option value="Gazipur">Gazipur</option>
                </select>
              </label>

              <button
                type="submit"
                className="sm:col-span-3 w-full py-3 px-4 rounded-lg bg-[#f56600] hover:bg-[#d95600] text-white text-sm font-semibold whitespace-nowrap transition-colors"
              >
                Find Suppliers
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
              <span>Verified Suppliers</span>
              <span aria-hidden="true">·</span>
              <span>Transparent MOQ &amp; Approx. Pricing</span>
              <span aria-hidden="true">·</span>
              <span>Direct Buyer-to-Supplier RFQs</span>
            </div>
          </div>

          <div className="lg:col-span-5 flex items-stretch">
            <HeroSupplierShowcase products={products} />
          </div>
        </div>
      </section>

      {/* Full-width Value Strip */}
      <section className="bg-white border-b border-[#e2e8f0]" aria-label="Platform highlights">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#f56600] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-[#0b2149] m-0">Verified Businesses</h2>
              <p className="text-xs text-[#64748b] m-0 mt-1">Admin-reviewed supplier credentials and locations</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Layers className="w-5 h-5 text-[#f56600] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-[#0b2149] m-0">12+ Core Categories</h2>
              <p className="text-xs text-[#64748b] m-0 mt-1">Textiles, packaging, electronics, agro &amp; printing</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Scale className="w-5 h-5 text-[#f56600] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-[#0b2149] m-0">Side-by-Side Compare</h2>
              <p className="text-xs text-[#64748b] m-0 mt-1">Evaluate unit price, MOQ, and ratings in one table</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-[#f56600] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-[#0b2149] m-0">Direct RFQ &amp; Orders</h2>
              <p className="text-xs text-[#64748b] m-0 mt-1">Send wholesale inquiries or place MOQ orders directly</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#0b2149] m-0">Browse by Industry Category</h2>
            <p className="text-sm text-[#475569] m-0 mt-1">
              Start with an industry to filter wholesale listings across Bangladesh.
            </p>
          </div>
          <Link
            to="/categories"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#f56600] hover:text-[#d95600] whitespace-nowrap"
          >
            View all categories <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat._id || cat.name}
              to={`/products?category=${encodeURIComponent(cat.name)}`}
              className="bg-white border border-[#e2e8f0] hover:border-[#0b2149] rounded-xl p-5 flex items-center justify-between gap-4 transition-colors"
            >
              <div>
                <h3 className="text-base font-semibold text-[#0b2149] m-0">{cat.name}</h3>
                <p className="text-xs text-[#64748b] m-0 mt-1 tabular-nums">
                  {cat.productCount || 0} published {cat.productCount === 1 ? "listing" : "listings"}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#f56600] shrink-0" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Featured Wholesale Listings */}
      <section className="bg-white border-y border-[#e2e8f0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#0b2149] m-0">Featured Wholesale Products</h2>
              <p className="text-sm text-[#475569] m-0 mt-1">
                Live supplier listings with transparent minimum order quantities and approximate unit prices.
              </p>
            </div>
            <Link
              to="/products"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#f56600] hover:text-[#d95600] whitespace-nowrap"
            >
              Explore marketplace <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-80 rounded-xl border border-[#e2e8f0] bg-[#f8fafc]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.slice(0, 6).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. Supplier Onboarding Callout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-[#0b2149] text-white rounded-2xl p-8 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-white m-0">
              Are you a wholesale supplier or manufacturer in Bangladesh?
            </h2>
            <p className="text-sm text-slate-300 m-0 mt-2 leading-relaxed">
              Create your verified business profile, publish raw material catalogs with MOQ tiers,
              and receive direct quotation requests from buyers nationwide.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/register"
              className="px-5 py-3 rounded-lg bg-[#f56600] hover:bg-[#d95600] text-white text-sm font-semibold whitespace-nowrap transition-colors"
            >
              List Your Business
            </Link>
            <Link
              to="/about"
              className="px-5 py-3 rounded-lg border border-white/25 text-white hover:bg-white/10 text-sm font-semibold whitespace-nowrap transition-colors"
            >
              How It Works
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
