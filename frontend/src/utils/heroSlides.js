export const HERO_SLIDE_INTERVAL_MS = 4500;

export const FALLBACK_HERO_SLIDES = [
  {
    id: "hub-islampur",
    image: "/src/assets/images/wholesale_cotton_fabric_1795544890535.jpg",
    alt: "Wholesale cotton textile rolls in Bangladesh",
    subtitle: "Featured Hub · Islampur, Dhaka",
    title: "Direct sourcing from manufacturers & wholesale depots",
    href: "/products?category=Garments%20%26%20Textile",
    isLiveSupplier: false,
  },
  {
    id: "hub-fatullah",
    image: "/src/assets/images/corrugated_packaging_boxes_1795544890383.jpg",
    alt: "Corrugated wholesale packaging cartons in Bangladesh",
    subtitle: "Featured Hub · Fatullah, Narayanganj",
    title: "Export-grade corrugated cartons & custom packaging",
    href: "/products?category=Packaging",
    isLiveSupplier: false,
  },
  {
    id: "hub-gulistan",
    image: "/src/assets/images/electronics_power_supply_1795544891798.jpg",
    alt: "Wholesale industrial LED power supplies and components",
    subtitle: "Featured Hub · Gulistan, Dhaka",
    title: "Industrial power supplies & electronic components",
    href: "/products?category=Electronics",
    isLiveSupplier: false,
  },
  {
    id: "hub-khatunganj",
    image: "/src/assets/images/wholesale_spices_grains_1795544891683.jpg",
    alt: "Wholesale spices and aromatic grains in Chattogram",
    subtitle: "Featured Hub · Khatunganj, Chattogram",
    title: "Bulk spices, aromatic grains & food ingredients",
    href: "/products?category=Food%20%26%20Beverage",
    isLiveSupplier: false,
  },
];

function getFirstValidImage(product) {
  if (!product || !Array.isArray(product.images)) return "";
  for (const img of product.images) {
    if (typeof img === "string" && img.trim()) {
      return img.trim();
    }
  }
  return "";
}

function getSupplierKey(product) {
  const supplier = product?.supplier;
  if (!supplier || typeof supplier !== "object") return "";
  if (supplier._id) return String(supplier._id);
  const name = (supplier.businessName || supplier.name || "").trim().toLowerCase();
  return name;
}

function toProductSlide(product, imageUrl) {
  const supplier = product?.supplier && typeof product.supplier === "object" ? product.supplier : {};
  const supplierName = (supplier.businessName || supplier.name || "Verified Supplier").trim();
  const city = (supplier.city || "").trim();
  const productName = (product?.name || "Wholesale Listing").trim();
  const subtitle = city
    ? `Featured Supplier · ${supplierName}, ${city}`
    : `Featured Supplier · ${supplierName}`;

  return {
    id: String(product?._id || imageUrl),
    image: imageUrl,
    alt: `${productName} — ${supplierName}`,
    subtitle,
    title: productName,
    href: product?._id ? `/products/${product._id}` : "/products",
    isLiveSupplier: true,
  };
}

export function buildHeroSupplierSlides(products = [], maxSlides = 6) {
  const safeList = Array.isArray(products) ? products : [];
  const slides = [];
  const usedImages = new Set();
  const usedSuppliers = new Set();
  const usedProductIds = new Set();

  // Pass 1: prioritize one featured product per unique supplier with a distinct image
  for (const product of safeList) {
    if (slides.length >= maxSlides) break;
    const imageUrl = getFirstValidImage(product);
    if (!imageUrl || usedImages.has(imageUrl)) continue;

    const supplierKey = getSupplierKey(product);
    if (supplierKey && usedSuppliers.has(supplierKey)) continue;

    if (supplierKey) usedSuppliers.add(supplierKey);
    usedImages.add(imageUrl);
    if (product?._id) usedProductIds.add(String(product._id));
    slides.push(toProductSlide(product, imageUrl));
  }

  // Pass 2: fill remaining slots with additional distinct product images if available
  for (const product of safeList) {
    if (slides.length >= maxSlides) break;
    const pid = product?._id ? String(product._id) : "";
    if (pid && usedProductIds.has(pid)) continue;
    const imageUrl = getFirstValidImage(product);
    if (!imageUrl || usedImages.has(imageUrl)) continue;

    usedImages.add(imageUrl);
    if (pid) usedProductIds.add(pid);
    slides.push(toProductSlide(product, imageUrl));
  }

  // Ensure dynamic rotation even when live DB has 0 or 1 published products
  if (slides.length === 0) {
    return [...FALLBACK_HERO_SLIDES];
  }

  if (slides.length < 2) {
    for (const fallback of FALLBACK_HERO_SLIDES) {
      if (slides.length >= FALLBACK_HERO_SLIDES.length) break;
      if (!usedImages.has(fallback.image)) {
        usedImages.add(fallback.image);
        slides.push(fallback);
      }
    }
  }

  return slides;
}

export function getNextSlideIndex(currentIndex, totalSlides, step = 1) {
  if (!Number.isInteger(totalSlides) || totalSlides <= 0) return 0;
  const safeCurrent = Number.isInteger(currentIndex) ? currentIndex : 0;
  const safeStep = Number.isInteger(step) ? step : 1;
  return (((safeCurrent + safeStep) % totalSlides) + totalSlides) % totalSlides;
}
