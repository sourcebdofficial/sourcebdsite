import test from "node:test";
import assert from "node:assert/strict";
import {
  formatCurrency,
  getDashboardPath,
  toggleCompareList,
  buildCompareSummary,
} from "./compare.js";

test("formatCurrency formats BDT and USD values cleanly", () => {
  assert.equal(formatCurrency(180, "BDT"), "৳180");
  assert.equal(formatCurrency(1250, "USD"), "$1,250");
  assert.equal(formatCurrency("bad", "BDT"), "Price on inquiry");
});

test("getDashboardPath resolves all user roles", () => {
  assert.equal(getDashboardPath("buyer"), "/buyer/dashboard");
  assert.equal(getDashboardPath("supplier"), "/supplier/dashboard");
  assert.equal(getDashboardPath("admin"), "/admin/dashboard");
  assert.equal(getDashboardPath("co-admin"), "/admin/dashboard");
  assert.equal(getDashboardPath("guest"), "/");
});

test("toggleCompareList adds up to maxItems and removes existing entries", () => {
  let list: string[] = [];
  list = toggleCompareList(list, "p1", 3);
  list = toggleCompareList(list, "p2", 3);
  list = toggleCompareList(list, "p3", 3);
  assert.deepEqual(list, ["p1", "p2", "p3"]);

  list = toggleCompareList(list, "p4", 3);
  assert.deepEqual(list, ["p2", "p3", "p4"]);

  list = toggleCompareList(list, "p3", 3);
  assert.deepEqual(list, ["p2", "p4"]);
});

test("buildCompareSummary identifies lowest price, lowest MOQ, and highest rating", () => {
  const summary = buildCompareSummary([
    { _id: "a", price: 250, minimumOrderQuantity: 50, averageRating: 4.2 },
    { _id: "b", price: 180, minimumOrderQuantity: 100, averageRating: 4.9 },
    { _id: "c", price: 300, minimumOrderQuantity: 20, averageRating: 3.8 },
  ]);
  assert.equal(summary.lowestPriceId, "b");
  assert.equal(summary.lowestMoqId, "c");
  assert.equal(summary.highestRatingId, "b");
});

import {
  sanitizeBdPhoneInput,
  formatBdPhonePrefill,
  isValidBdPhone,
} from "./compare.js";

test("BD phone helpers enforce strict 11-digit numbers", () => {
  assert.equal(sanitizeBdPhoneInput("01711-223344999"), "01711223344");
  assert.equal(formatBdPhonePrefill("+8801711000001"), "01711000001");
  assert.equal(isValidBdPhone("01711000001"), true);
  assert.equal(isValidBdPhone("017110000012"), false);
  assert.equal(isValidBdPhone("0171100000"), false);
  assert.equal(isValidBdPhone("+8801711000001"), false);
});

