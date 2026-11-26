import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductImage from "./ProductImage";
import {
  HERO_SLIDE_INTERVAL_MS,
  buildHeroSupplierSlides,
  getNextSlideIndex,
} from "../utils/heroSlides";

export default function HeroSupplierShowcase({ products = [] }) {
  const slides = useMemo(() => buildHeroSupplierSlides(products, 6), [products]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const slideCount = slides.length;
  const safeIndex = activeIndex < slideCount ? activeIndex : 0;
  const activeSlide = slides[safeIndex];
  const slidesSignature = slides.map((s) => s.id).join("|");

  useEffect(() => {
    setActiveIndex(0);
  }, [slidesSignature]);

  useEffect(() => {
    if (slideCount <= 1 || isPaused) return undefined;
    const timer = window.setTimeout(() => {
      setActiveIndex((prev) => getNextSlideIndex(prev, slideCount, 1));
    }, HERO_SLIDE_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [safeIndex, slideCount, isPaused]);

  const handleStep = (step) => {
    setActiveIndex((prev) => getNextSlideIndex(prev, slideCount, step));
  };

  return (
    <div
      className="w-full rounded-xl overflow-hidden border border-white/15 bg-[#061533] relative min-h-[260px] sm:min-h-[300px] lg:min-h-full select-none"
      aria-roledescription="carousel"
      aria-label="Featured wholesale suppliers"
      data-testid="hero-supplier-showcase"
      data-active-slide-id={activeSlide.id}
      data-active-index={safeIndex}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsPaused(false);
        }
      }}
    >
      {slides.map((slide, index) => {
        const isActive = index === safeIndex;
        return (
          <div
            key={slide.id}
            aria-hidden={!isActive}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out motion-reduce:transition-none ${
              isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            <ProductImage
              src={slide.image}
              alt={isActive ? slide.alt : ""}
              className="w-full h-full"
            />
          </div>
        );
      })}

      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#061533] via-[#061533]/80 to-transparent p-5 pt-16">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-slate-300 truncate">{activeSlide.subtitle}</div>
            <Link
              to={activeSlide.href}
              className="block text-sm font-semibold text-white hover:text-[#ff944d] mt-0.5 truncate transition-colors"
            >
              {activeSlide.title}
            </Link>
          </div>

          {slideCount > 1 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleStep(-1)}
                aria-label="Previous featured supplier"
                className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20 flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleStep(1)}
                aria-label="Next featured supplier"
                className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20 flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {slideCount > 1 && (
          <div className="flex items-center gap-1.5 mt-3" role="group" aria-label="Slide selector">
            {slides.map((slide, index) => {
              const isActive = index === safeIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Show slide ${index + 1}: ${slide.title}`}
                  aria-pressed={isActive}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isActive
                      ? "w-6 bg-[#f56600]"
                      : "w-2 bg-white/40 hover:bg-white/75"
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
