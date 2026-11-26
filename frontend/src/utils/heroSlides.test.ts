import test from "node:test";
import assert from "node:assert/strict";
import {
  HERO_SLIDE_INTERVAL_MS,
  FALLBACK_HERO_SLIDES,
  buildHeroSupplierSlides,
  getNextSlideIndex,
} from "./heroSlides.js";

test("HERO_SLIDE_INTERVAL_MS uses a balanced 4.5s rotation interval", () => {
  assert.equal(HERO_SLIDE_INTERVAL_MS, 4500);
});

test("buildHeroSupplierSlides falls back to curated hub slides when products are empty", () => {
  const slides = buildHeroSupplierSlides([]);
  assert.equal(slides.length, FALLBACK_HERO_SLIDES.length);
  assert.equal(slides[0].isLiveSupplier, false);
});

test("buildHeroSupplierSlides prioritizes diverse suppliers and distinct images", () => {
  const products = [
    {
      _id: "p1",
      name: "100% Combed Cotton Fabric",
      images: ["/img/cotton.jpg"],
      supplier: { _id: "s1", businessName: "Dhaka Textile House", city: "Dhaka" },
    },
    {
      _id: "p2",
      name: "Heavyweight Twill Chino",
      images: ["/img/twill.jpg"],
      supplier: { _id: "s1", businessName: "Dhaka Textile House", city: "Dhaka" },
    },
    {
      _id: "p3",
      name: "5-Ply Carton Box",
      images: ["/img/carton.jpg"],
      supplier: { _id: "s2", businessName: "Bangla Packaging Ltd.", city: "Narayanganj" },
    },
    {
      _id: "p4",
      name: "Courier Poly Mailer",
      images: ["/img/carton.jpg"], // duplicate image should be skipped
      supplier: { _id: "s3", businessName: "Other Packaging Co.", city: "Dhaka" },
    },
    {
      _id: "p5",
      name: "12V Industrial SMPS",
      images: ["/img/smps.jpg"],
      supplier: { _id: "s4", businessName: "Modern Electronics BD", city: "Dhaka" },
    },
  ];

  const slides = buildHeroSupplierSlides(products, 4);
  assert.equal(slides.length, 4);
  // First 3 slides come from distinct suppliers s1, s2, s4 before picking p2 from s1
  assert.deepEqual(
    slides.map((s) => s.id),
    ["p1", "p3", "p5", "p2"]
  );
  assert.equal(slides[0].subtitle, "Featured Supplier · Dhaka Textile House, Dhaka");
  assert.equal(slides[0].href, "/products/p1");
  assert.equal(slides[0].isLiveSupplier, true);
});

test("buildHeroSupplierSlides supplements single live product with fallback slides for smooth rotation", () => {
  const slides = buildHeroSupplierSlides([
    {
      _id: "only-1",
      name: "Single Live Product",
      images: ["/img/custom-live.jpg"],
      supplier: { _id: "s9", businessName: "Solo Supplier BD", city: "Gazipur" },
    },
  ]);
  assert.ok(slides.length >= 2);
  assert.equal(slides[0].id, "only-1");
  assert.equal(slides[1].isLiveSupplier, false);
});

test("getNextSlideIndex wraps cleanly forward and backward", () => {
  assert.equal(getNextSlideIndex(0, 4, 1), 1);
  assert.equal(getNextSlideIndex(3, 4, 1), 0);
  assert.equal(getNextSlideIndex(0, 4, -1), 3);
  assert.equal(getNextSlideIndex(0, 0, 1), 0);
});
