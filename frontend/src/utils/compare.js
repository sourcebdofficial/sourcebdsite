export function formatCurrency(amount, currency = "BDT") {
  const num = Number(amount);
  if (!Number.isFinite(num)) return "Price on inquiry";
  const prefix = currency === "USD" ? "$" : "৳";
  return `${prefix}${num.toLocaleString("en-US")}`;
}

export function formatShortDate(value) {
  if (!value) return "Recently updated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently updated";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getDashboardPath(role) {
  if (role === "buyer") return "/buyer/dashboard";
  if (role === "supplier") return "/supplier/dashboard";
  if (role === "admin" || role === "co-admin") return "/admin/dashboard";
  return "/";
}

export function toggleCompareList(currentIds, productId, maxItems = 4) {
  const id = String(productId || "");
  if (!id) return currentIds;
  if (currentIds.includes(id)) {
    return currentIds.filter((item) => item !== id);
  }
  return [...currentIds, id].slice(-maxItems);
}

export function buildCompareSummary(products = []) {
  if (!products.length) {
    return { lowestPriceId: null, lowestMoqId: null, highestRatingId: null };
  }
  let lowestPrice = Infinity;
  let lowestPriceId = null;
  let lowestMoq = Infinity;
  let lowestMoqId = null;
  let highestRating = 0;
  let highestRatingId = null;

  for (const item of products) {
    const price = Number(item.price);
    if (Number.isFinite(price) && price < lowestPrice) {
      lowestPrice = price;
      lowestPriceId = item._id;
    }
    const moq = Number(item.minimumOrderQuantity ?? 1);
    if (Number.isFinite(moq) && moq < lowestMoq) {
      lowestMoq = moq;
      lowestMoqId = item._id;
    }
    const rating = Number(item.averageRating ?? 0);
    if (rating > highestRating) {
      highestRating = rating;
      highestRatingId = item._id;
    }
  }

  return { lowestPriceId, lowestMoqId, highestRatingId };
}

export function sanitizeBdPhoneInput(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

export function formatBdPhonePrefill(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("8801") && digits.length === 13) {
    return digits.slice(2);
  }
  return digits.slice(0, 11);
}

export function isValidBdPhone(value) {
  return /^01[3-9]\d{8}$/.test(String(value || "").trim());
}

