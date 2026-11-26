import { Link } from "react-router-dom";
import { Scale, Check } from "lucide-react";
import ProductImage from "./ProductImage";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../utils/compare";

export default function ProductCard({ product }) {
  const { compareIds, toggleCompare } = useAuth();
  const isCompared = compareIds.includes(String(product._id));
  const supplierName = product.supplier?.businessName || product.supplier?.name || "Verified Supplier";
  const city = product.supplier?.city || "Bangladesh";

  return (
    <article className="group bg-white border border-[#e2e8f0] rounded-xl overflow-hidden flex flex-col transition-transform duration-150 hover:-translate-y-0.5">
      <Link to={`/products/${product._id}`} className="block aspect-[4/3] w-full overflow-hidden bg-[#eef3f9]">
        <ProductImage
          src={product.images?.[0]}
          alt={product.name}
          className="w-full h-full"
        />
      </Link>

      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="flex items-center gap-1.5 text-xs text-[#64748b] truncate">
          <span className="truncate">{product.category || "General"}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{city}</span>
          {product.supplier?.isVerified && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#15803d] font-medium whitespace-nowrap">Verified</span>
            </>
          )}
        </div>

        <h3 className="text-base font-semibold text-[#0b2149] leading-snug line-clamp-2 m-0">
          <Link to={`/products/${product._id}`} className="hover:text-[#f56600] transition-colors">
            {product.name}
          </Link>
        </h3>

        <p className="text-xs text-[#475569] m-0 truncate">
          by{" "}
          {product.supplier?._id ? (
            <Link to={`/suppliers/${product.supplier._id}`} className="hover:underline text-[#0b2149] font-medium">
              {supplierName}
            </Link>
          ) : (
            supplierName
          )}
        </p>

        <div className="mt-auto pt-3 border-t border-[#f1f5f9] flex items-end justify-between gap-2">
          <div>
            <div className="font-mono-num text-base font-bold text-[#0b2149]">
              {formatCurrency(product.price, product.currency)}
              <span className="text-xs font-normal text-[#64748b]"> / {product.unit || "unit"}</span>
            </div>
            <div className="text-xs text-[#64748b] tabular-nums">
              MOQ {product.minimumOrderQuantity || 1} {product.unit || "units"}
              {product.reviewCount > 0 && ` · ★ ${product.averageRating}`}
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleCompare(product._id)}
            aria-pressed={isCompared}
            aria-label={isCompared ? `Remove ${product.name} from compare` : `Add ${product.name} to compare`}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 border transition-colors ${
              isCompared
                ? "bg-[#0b2149] text-white border-[#0b2149]"
                : "bg-white text-[#475569] border-[#e2e8f0] hover:border-[#0b2149] hover:text-[#0b2149]"
            }`}
          >
            {isCompared ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Scale className="w-3.5 h-3.5" aria-hidden="true" />}
            <span>{isCompared ? "Added" : "Compare"}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
