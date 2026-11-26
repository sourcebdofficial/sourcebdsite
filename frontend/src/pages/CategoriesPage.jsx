import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Layers } from "lucide-react";
import { apiRequest } from "../api/client";

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/sourcing/categories")
      .then((data) => setCategories(data.categories || []))
      .catch((err) => setError(err.message || "Could not load categories."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="pb-6 border-b border-[#e2e8f0]">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0b2149] m-0">
          Wholesale Industry Categories
        </h1>
        <p className="text-sm text-[#475569] m-0 mt-1.5 max-w-2xl">
          Browse raw materials, manufacturing supplies, and finished wholesale goods organized by sector.
        </p>
      </div>

      {error && (
        <div className="mt-6 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 rounded-xl border border-[#e2e8f0] bg-white" />
          ))}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((category) => (
            <Link
              key={category._id || category.name}
              to={`/products?category=${encodeURIComponent(category.name)}`}
              className="group bg-white border border-[#e2e8f0] hover:border-[#0b2149] rounded-xl p-6 flex flex-col justify-between gap-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#eef3f9] text-[#0b2149] flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#0b2149] group-hover:text-[#f56600] transition-colors m-0">
                      {category.name}
                    </h2>
                    <div className="text-xs text-[#64748b] mt-0.5 tabular-nums">
                      {category.productCount || 0} published {category.productCount === 1 ? "product" : "products"}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#f56600] shrink-0 mt-1" aria-hidden="true" />
              </div>

              <p className="text-xs text-[#475569] m-0 leading-relaxed">
                {category.description || `Explore verified wholesale suppliers and raw materials in ${category.name}.`}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
