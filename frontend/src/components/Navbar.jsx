import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getDashboardPath } from "../utils/compare";

export default function Navbar() {
  const { user, logout, brandLogoSrc, compareIds } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const navLinks = [
    { to: "/products", label: "Products" },
    { to: "/suppliers", label: "Suppliers" },
    { to: "/categories", label: "Categories" },
    { to: "/compare", label: compareIds.length > 0 ? `Compare (${compareIds.length})` : "Compare" },
    { to: "/about", label: "How It Works" },
  ];

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#e2e8f0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between gap-8">
        {/* Zone 1: Brand Logo */}
        <Link
          to="/"
          aria-label="SourceBD Home"
          className="inline-flex items-center shrink-0 whitespace-nowrap"
          onClick={() => setMobileOpen(false)}
        >
          <img
            src={brandLogoSrc}
            alt="SourceBD"
            referrerPolicy="no-referrer"
            className="h-12 w-auto max-w-[190px] object-contain mix-blend-multiply"
          />
        </Link>

        {/* Zone 2: 5 concise single-line nav links */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6">
          {navLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive
                    ? "text-[#0b2149] border-[#f56600]"
                    : "text-[#475569] border-transparent hover:text-[#0b2149] hover:border-[#cbd5e1]"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Zone 3: Auth / Dashboard Action */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          {user ? (
            <>
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm font-medium text-[#475569] hover:text-[#0b2149] whitespace-nowrap shrink-0 bg-transparent border-0"
              >
                Log out
              </button>
              <Link
                to={getDashboardPath(user.role)}
                className="px-4 py-2 rounded-lg bg-[#f56600] hover:bg-[#d95600] text-white text-sm font-semibold whitespace-nowrap shrink-0 transition-colors"
              >
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-[#0b2149] hover:text-[#f56600] whitespace-nowrap shrink-0 transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-lg bg-[#f56600] hover:bg-[#d95600] text-white text-sm font-semibold whitespace-nowrap shrink-0 transition-colors"
              >
                Create account
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#e2e8f0] text-[#0b2149] bg-white"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#e2e8f0] bg-white px-4 py-4 flex flex-col gap-2">
          {navLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive ? "bg-[#eef3f9] text-[#0b2149] font-semibold" : "text-[#475569]"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <div className="pt-3 mt-2 border-t border-[#e2e8f0] flex flex-col gap-2">
            {user ? (
              <>
                <Link
                  to={getDashboardPath(user.role)}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-2.5 rounded-lg bg-[#f56600] text-white text-sm font-semibold text-center"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2.5 rounded-lg border border-[#e2e8f0] text-[#0b2149] text-sm font-medium bg-white"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-2.5 rounded-lg border border-[#e2e8f0] text-[#0b2149] text-sm font-semibold text-center"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-2.5 rounded-lg bg-[#f56600] text-white text-sm font-semibold text-center"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
