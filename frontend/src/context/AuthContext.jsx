import { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { toggleCompareList } from "../utils/compare";

const AuthContext = createContext(null);

const COMPARE_STORAGE_KEY = "sourcebd_compare_ids";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [logoData, setLogoData] = useState("");
  const [compareIds, setCompareIds] = useState(() => {
    try {
      const saved = localStorage.getItem(COMPARE_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    apiRequest("/settings")
      .then((data) => {
        if (data?.logoData) setLogoData(data.logoData);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(compareIds));
    } catch {
      // Ignore storage quota errors
    }
  }, [compareIds]);

  const login = (token, userData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const toggleCompare = (productId) => {
    setCompareIds((prev) => toggleCompareList(prev, productId, 4));
  };

  const removeFromCompare = (productId) => {
    setCompareIds((prev) => prev.filter((id) => id !== String(productId)));
  };

  const clearCompare = () => setCompareIds([]);

  const brandLogoSrc = logoData || "/sourcebd-logo.jpeg";

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        logoData,
        setLogoData,
        brandLogoSrc,
        compareIds,
        toggleCompare,
        removeFromCompare,
        clearCompare,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
