import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { getDashboardPath } from "../utils/compare";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ identifier: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });

      if (!data.token || !data.user?.role) {
        throw new Error("Invalid login response from server.");
      }

      login(data.token, data.user);
      navigate(getDashboardPath(data.user.role), { replace: true });
    } catch (err) {
      setMessage(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0b2149] m-0">Welcome back to SourceBD</h1>
          <p className="text-sm text-[#475569] m-0 mt-1.5">
            Sign in with your email or 11-digit phone number.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="login-identifier">Email or Phone Number</label>
            <input
              id="login-identifier"
              type="text"
              name="identifier"
              value={form.identifier}
              onChange={handleChange}
              placeholder="name@company.com or 01XXXXXXXXX"
              autoComplete="username"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
                autoComplete="current-password"
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
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#e2e8f0] flex items-center justify-between text-xs text-[#475569]">
          <span>New to SourceBD?</span>
          <Link to="/register" className="font-semibold text-[#0b2149] hover:text-[#f56600]">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
