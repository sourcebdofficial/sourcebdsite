import { useEffect, useState } from "react";
import { Package } from "lucide-react";

export default function ProductImage({ src, alt, className = "" }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#eef3f9] to-[#e2e8f0] text-[#0b2149] p-4 text-center ${className}`}
        aria-label={alt || "Wholesale product image"}
      >
        <Package className="w-8 h-8 text-[#0b2149]/60" aria-hidden="true" />
        <span className="text-xs font-medium text-[#475569] line-clamp-2 max-w-[180px]">
          {alt || "Wholesale listing"}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
