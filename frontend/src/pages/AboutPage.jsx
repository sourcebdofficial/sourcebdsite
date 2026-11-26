import { Link } from "react-router-dom";
import { ShieldCheck, Search, Scale, Send, ArrowRight } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-12">
      {/* Header */}
      <section className="max-w-3xl">
        <div className="text-xs font-semibold text-[#f56600] mb-2">About SourceBD</div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0b2149] m-0 text-balance">
          A clearer wholesale sourcing network for Bangladesh.
        </h1>
        <p className="text-base text-[#475569] leading-relaxed m-0 mt-4">
          Small business owners, garment workshops, and new entrepreneurs in Bangladesh often rely on
          word-of-mouth or travel across Dhaka and Chattogram wholesale markets just to find basic
          raw material pricing. SourceBD brings verified wholesale catalogs, MOQs, and direct RFQ
          communication into one organized web platform.
        </p>
      </section>

      {/* 3-Step Buyer Workflow */}
      <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-10">
        <h2 className="text-2xl font-bold text-[#0b2149] m-0 mb-6">How SourceBD Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col gap-2">
            <div className="w-10 h-10 rounded-lg bg-[#eef3f9] text-[#0b2149] flex items-center justify-center">
              <Search className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-[#0b2149] m-0 mt-2">01. Discover by Category &amp; Hub</h3>
            <p className="text-sm text-[#475569] leading-relaxed m-0">
              Filter live wholesale listings across Islampur, Narayanganj, Gazipur, and Chattogram
              by industry category, approximate price range, and minimum order quantity.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="w-10 h-10 rounded-lg bg-[#eef3f9] text-[#0b2149] flex items-center justify-center">
              <Scale className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-[#0b2149] m-0 mt-2">02. Compare &amp; Verify</h3>
            <p className="text-sm text-[#475569] leading-relaxed m-0">
              Place up to four listings side-by-side on our Compare page, check verified business
              credentials, and read buyer reviews before committing capital.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="w-10 h-10 rounded-lg bg-[#eef3f9] text-[#0b2149] flex items-center justify-center">
              <Send className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-[#0b2149] m-0 mt-2">03. Request Quote or Order</h3>
            <p className="text-sm text-[#475569] leading-relaxed m-0">
              Send a Request for Quotation (RFQ) with your target price and volume, or place a direct
              MOQ order and track fulfillment from your Buyer Dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* Role Breakdown & Pricing Notice */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[#0b2149]">
            <ShieldCheck className="w-5 h-5 text-[#15803d]" aria-hidden="true" />
            <h2 className="text-lg font-bold m-0">Supplier Verification Process</h2>
          </div>
          <p className="text-sm text-[#475569] leading-relaxed m-0">
            Suppliers submit their registered business name, business type (Manufacturer, Wholesaler,
            or Importer), physical address, and trade details for review. Platform administrators
            verify and approve suppliers before granting the Verified badge.
          </p>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 flex flex-col gap-3">
          <h2 className="text-lg font-bold text-[#0b2149] m-0">Approximate Pricing Transparency</h2>
          <p className="text-sm text-[#475569] leading-relaxed m-0">
            Raw material prices in Bangladesh fluctuate with seasonal harvests, import duties, and lot
            sizes. Every listing displays an approximate unit rate and last-updated date so buyers can
            benchmark costs and negotiate final terms directly with the supplier.
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-[#0b2149] text-white rounded-2xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-white m-0">Ready to start sourcing or selling?</h2>
          <p className="text-sm text-slate-300 m-0 mt-1">
            Explore the marketplace or register an account in under two minutes.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#f56600] hover:bg-[#d95600] text-white text-sm font-semibold whitespace-nowrap"
          >
            Browse Marketplace <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <Link
            to="/register"
            className="px-5 py-2.5 rounded-lg border border-white/25 text-white hover:bg-white/10 text-sm font-semibold whitespace-nowrap"
          >
            Create Account
          </Link>
        </div>
      </section>
    </div>
  );
}
