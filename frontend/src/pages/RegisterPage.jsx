import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { getDashboardPath, isValidBdPhone, sanitizeBdPhoneInput } from "../utils/compare";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "buyer",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "phone" ? sanitizeBdPhoneInput(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!isValidBdPhone(form.phone)) {
      setMessage("Phone number must be an exact 11-digit Bangladeshi number (e.g. 01711000001).");
      return;
    }
    if (form.password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (data.token && data.user?.role) {
        login(data.token, data.user);
        navigate(getDashboardPath(data.user.role), { replace: true });
        return;
      }
      navigate("/login", { replace: true });
    } catch (err) {
      setMessage(err.message || "Could not create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0b2149] m-0">Create Your SourceBD Account</h1>
          <p className="text-sm text-[#475569] m-0 mt-1.5">
            Sign up directly as a wholesale buyer or supplier to start sourcing and listing.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="reg-name">Full Name</label>
            <input
              id="reg-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              autoComplete="name"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="reg-email">Email Address</label>
            <input
              id="reg-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="name@company.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="reg-phone">Phone Number (11 digits)</label>
            <input
              id="reg-phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              maxLength={11}
              pattern="01[3-9][0-9]{8}"
              value={form.phone}
              onChange={handleChange}
              placeholder="01XXXXXXXXX"
              autoComplete="tel"
              required
            />
            <span className="text-xs text-[#64748b]">
              Enter 11 digits starting with 01 (e.g. 01711000001).
            </span>
          </div>

          <div className="auth-field">
            <label htmlFor="reg-role">Account Type</label>
            <select id="reg-role" name="role" value={form.role} onChange={handleChange}>
              <option value="buyer">Buyer (Source &amp; Order Wholesale Goods)</option>
              <option value="supplier">Supplier (List Products &amp; Get Verified)</option>
            </select>
          </div>

          <div className="auth-field">
            <label htmlFor="reg-password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="reg-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                placeholder="Minimum 8 characters"
                minLength={8}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {message && (
            <p role="status" className="text-sm text-[#b91c1c] bg-red-50 border border-red-200 rounded-lg px-3 py-2 m-0">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg bg-[#f56600] hover:bg-[#d95600] disabled:bg-slate-300 text-white text-sm font-semibold transition-colors"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#e2e8f0] flex items-center justify-between text-xs text-[#475569]">
          <span>Already have an account?</span>
          <Link to="/login" className="font-semibold text-[#0b2149] hover:text-[#f56600]">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
