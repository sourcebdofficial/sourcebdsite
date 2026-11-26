import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Footer() {
  const { brandLogoSrc } = useAuth();

  return (
    <footer className="bg-[#061533] text-white border-t border-[#1e3a6d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-2 flex flex-col gap-3">
          <Link to="/" className="inline-flex items-center bg-white rounded-lg px-3 py-1.5 w-fit">
            <img
              src={brandLogoSrc}
              alt="SourceBD"
              referrerPolicy="no-referrer"
              className="h-9 w-auto object-contain"
            />
          </Link>
          <p className="text-sm text-slate-300 max-w-md leading-relaxed m-0 mt-1">
            A wholesale supplier and raw material discovery platform built for small businesses,
            manufacturers, and entrepreneurs across Bangladesh.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 text-sm">
          <h3 className="text-white text-sm font-semibold m-0 mb-1">Marketplace</h3>
          <Link to="/products" className="text-slate-300 hover:text-white transition-colors">
            Browse Products
          </Link>
          <Link to="/categories" className="text-slate-300 hover:text-white transition-colors">
            All Categories
          </Link>
          <Link to="/suppliers" className="text-slate-300 hover:text-white transition-colors">
            Suppliers Directory
          </Link>
          <Link to="/compare" className="text-slate-300 hover:text-white transition-colors">
            Compare Suppliers
          </Link>
        </div>

        <div className="flex flex-col gap-2.5 text-sm">
          <h3 className="text-white text-sm font-semibold m-0 mb-1">Platform</h3>
          <Link to="/about" className="text-slate-300 hover:text-white transition-colors">
            How It Works
          </Link>
          <Link to="/login" className="text-slate-300 hover:text-white transition-colors">
            Log in
          </Link>
          <Link to="/register" className="text-slate-300 hover:text-white transition-colors">
            Register as Buyer or Supplier
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <span>© 2026 SourceBD · Buy · Sell · Grow</span>
          <span>Approximate wholesale prices are subject to direct supplier confirmation.</span>
        </div>
      </div>
    </footer>
  );
}
