import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import express from "express";

const require = createRequire(import.meta.url);
const { setMemoryMode } = require("./db.js");
const { seedMemoryData } = require("./seed-data.js");
const { createApiRouter } = require("./app.js");
const User = require("./user.model.js");
const Product = require("./product.model.js");
const Order = require("./order.model.js");
const Review = require("./review.model.js");

test("in-memory store seeds users, products, orders and supports populate + aggregate", async () => {
  setMemoryMode(true);
  await seedMemoryData();

  const defaultBuyer = await User.findOne({ email: "buyer@sourcebd.demo" });
  assert.equal(defaultBuyer.password, undefined, "Password should be hidden by default");

  const buyer = await User.findOne({ email: "buyer@sourcebd.demo" }).select("+password");
  assert.ok(buyer, "Demo buyer should exist");
  assert.ok(buyer.password, "Password should be included when selected with +password");
  assert.equal(buyer.isActive, true, "isActive must remain present when selecting +password");
  assert.equal(buyer.role, "buyer", "role must remain present when selecting +password");

  const products = await Product.find({ status: "published" })
    .populate("supplier", "name isVerified businessName city")
    .sort({ createdAt: -1 })
    .lean();
  assert.equal(products.length >= 8, true);
  assert.ok(products[0].supplier?.businessName, "Supplier should be populated");

  const cotton = await Product.find({
    status: "published",
    $or: [{ name: { $regex: "cotton", $options: "i" } }],
  }).lean();
  assert.equal(cotton.length >= 1, true);

  const stats = await Review.aggregate([
    { $match: { status: "approved", product: cotton[0]._id } },
    { $group: { _id: "$product", averageRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } },
  ]);
  assert.equal(stats.length, 1);
  assert.equal(stats[0].averageRating, 5);
  assert.equal(stats[0].reviewCount, 1);

  const orders = await Order.find({ buyer: buyer._id }).populate("supplier", "name").lean();
  assert.equal(orders.length >= 1, true);
});

test("public API routes filter products, enrich categories with counts, and serve suppliers directory & profile", async () => {
  process.env.JWT_SECRET ||= "sourcebd-test-secret";
  setMemoryMode(true);
  await seedMemoryData();

  const app = express();
  app.use(express.json());
  app.use("/api", createApiRouter());
  const server = app.listen(0);
  const address = server.address();
  assert.ok(address && typeof address === "object", "Server should bind to an ephemeral port");
  const base = `http://127.0.0.1:${address.port}/api`;

  try {
    // 1. Products filtering (price, MOQ, verifiedOnly, sort)
    const prodRes = await fetch(`${base}/products?verifiedOnly=true&maxPrice=300&maxMoq=100&sort=price_asc`);
    assert.equal(prodRes.status, 200);
    const prodJson = (await prodRes.json()) as {
      products: Array<{
        price: number;
        minimumOrderQuantity: number;
        supplier?: { isVerified?: boolean };
      }>;
    };
    assert.ok(prodJson.products.length >= 3, "Should return verified products <= 300 BDT and MOQ <= 100");
    assert.ok(prodJson.products.every((p) => p.supplier?.isVerified === true));
    assert.ok(prodJson.products.every((p) => p.price <= 300 && p.minimumOrderQuantity <= 100));
    for (let i = 1; i < prodJson.products.length; i += 1) {
      assert.ok(prodJson.products[i - 1].price <= prodJson.products[i].price);
    }

    // 2. Categories with counts
    const catRes = await fetch(`${base}/sourcing/categories`);
    assert.equal(catRes.status, 200);
    const catJson = (await catRes.json()) as {
      categories: Array<{ name: string; productCount: number }>;
    };
    const textileCat = catJson.categories.find((c) => c.name === "Garments & Textile");
    assert.ok(textileCat && textileCat.productCount >= 2, "Textile category should report productCount >= 2");

    // 3. Suppliers Directory
    const supRes = await fetch(`${base}/sourcing/suppliers?location=Chattogram`);
    assert.equal(supRes.status, 200);
    const supJson = await supRes.json();
    assert.equal(supJson.suppliers.length, 1);
    assert.equal(supJson.suppliers[0].businessName, "Chattogram Agro & Spices");
    assert.ok(supJson.suppliers[0].productCount >= 2);

    // 4. Single Supplier Profile
    const profileRes = await fetch(`${base}/sourcing/suppliers/${supJson.suppliers[0]._id}`);
    assert.equal(profileRes.status, 200);
    const profileJson = await profileRes.json();
    assert.equal(profileJson.supplier.businessName, "Chattogram Agro & Spices");
    assert.ok(profileJson.products.length >= 2);
    assert.ok(profileJson.reviews.length >= 1);

    // 5. Buyer places order with strict 11-digit phone, address, note and supplier reads buyer details
    const buyerLoginRes = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "buyer@sourcebd.demo", password: "SourceBD@123" }),
    });
    assert.equal(buyerLoginRes.status, 200);
    const buyerLoginJson = (await buyerLoginRes.json()) as { token: string };

    const cottonListRes = await fetch(`${base}/products?search=Cotton`);
    const cottonListJson = (await cottonListRes.json()) as { products: Array<{ _id: string; minimumOrderQuantity: number }> };
    const targetProduct = cottonListJson.products[0];

    const badPhoneOrderRes = await fetch(`${base}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerLoginJson.token}`,
      },
      body: JSON.stringify({
        productId: targetProduct._id,
        quantity: Math.max(targetProduct.minimumOrderQuantity, 50),
        contactPhone: "017112233445",
        shippingAddress: "Mirpur-10, Dhaka",
      }),
    });
    assert.equal(badPhoneOrderRes.status, 400, "12-digit phone number must be rejected");

    const createOrderRes = await fetch(`${base}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerLoginJson.token}`,
      },
      body: JSON.stringify({
        productId: targetProduct._id,
        quantity: Math.max(targetProduct.minimumOrderQuantity, 50),
        contactPhone: "01711223344",
        shippingAddress: "House 14, Road 6, Mirpur-10, Dhaka",
        note: "Call before dispatch and pack in waterproof rolls.",
      }),
    });
    assert.equal(createOrderRes.status, 201);

    const supplierLoginRes = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "supplier@sourcebd.demo", password: "SourceBD@123" }),
    });
    assert.equal(supplierLoginRes.status, 200);
    const supplierLoginJson = (await supplierLoginRes.json()) as { token: string };

    const supOrdersRes = await fetch(`${base}/orders/supplier`, {
      headers: { Authorization: `Bearer ${supplierLoginJson.token}` },
    });
    assert.equal(supOrdersRes.status, 200);
    const supOrdersJson = (await supOrdersRes.json()) as {
      orders: Array<{
        contactPhone?: string;
        shippingAddress?: string;
        note?: string;
        buyer?: { name?: string; email?: string; phone?: string };
      }>;
    };
    const matchedOrder = supOrdersJson.orders.find(
      (o) => o.contactPhone === "01711223344" && o.shippingAddress === "House 14, Road 6, Mirpur-10, Dhaka"
    );
    assert.ok(matchedOrder, "Supplier orders should include the newly placed order with 11-digit contactPhone and address");
    assert.equal(matchedOrder.note, "Call before dispatch and pack in waterproof rolls.");
    assert.equal(matchedOrder.buyer?.name, "Rahim Uddin");
    assert.equal(matchedOrder.buyer?.email, "buyer@sourcebd.demo");

    // 6. Direct registration without OTP creates supplier and rejects >11-digit phones
    const regBadPhoneRes = await fetch(`${base}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bad Phone Supplier",
        email: "badphone@example.com",
        phone: "017112233445",
        password: "Password123",
        role: "supplier",
      }),
    });
    assert.equal(regBadPhoneRes.status, 400, "Direct registration must reject >11-digit phone");

    const regSupplierRes = await fetch(`${base}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Rafiqul Islam",
        email: "rafiq.textiles@example.com",
        phone: "01811223344",
        password: "Password123",
        role: "supplier",
      }),
    });
    assert.equal(regSupplierRes.status, 201, "Direct registration should succeed without OTP");
    const regSupplierJson = (await regSupplierRes.json()) as {
      token: string;
      user: { id: string; role: string; phone: string };
    };
    assert.ok(regSupplierJson.token, "Direct registration should issue a JWT token");
    assert.equal(regSupplierJson.user.role, "supplier");
    assert.equal(regSupplierJson.user.phone, "01811223344");

    // 7. New supplier submits full Bangladesh KYC form with TIN PDF, admin inspects & verifies
    const samplePdfDataUrl = `data:application/pdf;base64,${Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF").toString("base64")}`;
    const submitKycRes = await fetch(`${base}/sourcing/supplier/verification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${regSupplierJson.token}`,
      },
      body: JSON.stringify({
        businessName: "Narayanganj Knitwear & Yarn Ltd.",
        businessType: "Manufacturer",
        ownershipType: "Private Limited (Pvt. Ltd.)",
        yearEstablished: "2018",
        businessDescription: "Bulk 100% cotton combed yarn and circular knit fabrics for local & export buyers.",
        tradeLicenseNumber: "TRAD/NCC/022914/2025",
        tradeLicenseAuthority: "Narayanganj City Corporation",
        tinNumber: "619283746510",
        binNumber: "004512987-0301",
        nidNumber: "1990456712398",
        contactPersonName: "Rafiqul Islam",
        contactPersonRole: "Managing Director",
        address: "Plot 12, BSCIC Industrial Area",
        city: "Narayanganj",
        monthlyCapacity: "45,000 kg / month",
        bankName: "BRAC Bank PLC",
        bankAccountNumber: "1501204981001",
        verificationDocuments: {
          tinCertificate: {
            fileName: "e-tin-certificate.pdf",
            mimeType: "application/pdf",
            dataUrl: samplePdfDataUrl,
          },
        },
      }),
    });
    assert.equal(submitKycRes.status, 200);

    const adminLoginRes = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "admin@sourcebd.demo", password: "SourceBD@123" }),
    });
    assert.equal(adminLoginRes.status, 200);
    const adminLoginJson = (await adminLoginRes.json()) as { token: string };

    const adminQueueRes = await fetch(`${base}/sourcing/admin/verification`, {
      headers: { Authorization: `Bearer ${adminLoginJson.token}` },
    });
    assert.equal(adminQueueRes.status, 200);
    const adminQueueJson = (await adminQueueRes.json()) as {
      suppliers: Array<{
        _id: string;
        tinNumber?: string;
        tradeLicenseNumber?: string;
        verificationDocuments?: { tinCertificate?: { fileName?: string } };
      }>;
    };
    const pendingMatch = adminQueueJson.suppliers.find(
      (s) => s.tinNumber === "619283746510" && s.tradeLicenseNumber === "TRAD/NCC/022914/2025"
    );
    assert.ok(pendingMatch, "Admin queue should include submitted KYC fields");
    assert.equal(pendingMatch.verificationDocuments?.tinCertificate?.fileName, "e-tin-certificate.pdf");

    const verifyRes = await fetch(`${base}/sourcing/admin/verification/${pendingMatch._id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminLoginJson.token}`,
      },
      body: JSON.stringify({ decision: "verified" }),
    });
    assert.equal(verifyRes.status, 200);

    // 8. Supplier product creation requires at least one image and accepts uploaded base64 PNG
    const missingImgRes = await fetch(`${base}/supplier/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supplierLoginJson.token}`,
      },
      body: JSON.stringify({
        name: "Unpictured Cotton Bale",
        description: "Wholesale raw cotton bale without photo.",
        category: "Garments & Textile",
        price: 1200,
        currency: "BDT",
        quantity: 100,
        unit: "piece",
        minimumOrderQuantity: 10,
        images: [],
      }),
    });
    assert.equal(missingImgRes.status, 400, "Product without images must be rejected");

    const samplePngDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    const createWithImgRes = await fetch(`${base}/supplier/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supplierLoginJson.token}`,
      },
      body: JSON.stringify({
        name: "Export Combed Knit Roll",
        description: "180 GSM combed cotton knit fabric roll for apparel factories.",
        category: "Garments & Textile",
        price: 420,
        currency: "BDT",
        quantity: 350,
        unit: "kg",
        minimumOrderQuantity: 25,
        images: [samplePngDataUrl],
      }),
    });
    assert.equal(createWithImgRes.status, 201, "Product with uploaded image should be created");
    const createdProductJson = (await createWithImgRes.json()) as {
      product: { _id: string; images: string[] };
    };
    assert.equal(createdProductJson.product.images[0], samplePngDataUrl);

    const clearImgRes = await fetch(`${base}/supplier/products/${createdProductJson.product._id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supplierLoginJson.token}`,
      },
      body: JSON.stringify({ images: [] }),
    });
    assert.equal(clearImgRes.status, 400, "Updating a product to empty images must be rejected");
  } finally {
    server.close();
  }
});
