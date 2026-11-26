const bcrypt = require("bcryptjs");
const User = require("./user.model");
const Product = require("./product.model");
const Category = require("./category.model");
const Review = require("./review.model");
const Order = require("./order.model");
const Inquiry = require("./inquiry.model");

const IMG_COTTON = "/src/assets/images/wholesale_cotton_fabric_1795544890535.jpg";
const IMG_PACKAGING = "/src/assets/images/corrugated_packaging_boxes_1795544890383.jpg";
const IMG_ELECTRONICS = "/src/assets/images/electronics_power_supply_1795544891798.jpg";
const IMG_AGRO = "/src/assets/images/wholesale_spices_grains_1795544891683.jpg";

let seeded = false;

async function seedMemoryData() {
  if (seeded) return;
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    seeded = true;
    return;
  }

  const passwordHash = await bcrypt.hash("SourceBD@123", 10);

  const admin = await User.create({
    name: "Nurul Amin (Admin)",
    email: "admin@sourcebd.demo",
    phone: "01711000000",
    password: passwordHash,
    role: "admin",
    permissions: [],
    isEmailVerified: true,
    isPhoneVerified: true,
    isVerified: true,
    isActive: true,
  });

  const buyer = await User.create({
    name: "Rahim Uddin",
    email: "buyer@sourcebd.demo",
    phone: "01711000001",
    password: passwordHash,
    role: "buyer",
    isEmailVerified: true,
    isPhoneVerified: true,
    isVerified: true,
    isActive: true,
  });

  const textileSupplier = await User.create({
    name: "Kamal Hossain",
    email: "supplier@sourcebd.demo",
    phone: "01711000002",
    password: passwordHash,
    role: "supplier",
    businessName: "Dhaka Textile House",
    businessType: "Wholesaler",
    ownershipType: "Sole Proprietorship",
    yearEstablished: "2014",
    businessDescription:
      "Wholesale combed cotton, twill chino, poplin, and export-surplus fabrics directly from Islampur market.",
    address: "42 Islampur Road, Kotwali",
    city: "Dhaka",
    tradeLicenseNumber: "TRAD/DSCC/014582/2024",
    tradeLicenseAuthority: "Dhaka South City Corporation (DSCC)",
    tinNumber: "418290345612",
    binNumber: "002418593-0102",
    nidNumber: "1988269421004",
    contactPersonName: "Kamal Hossain",
    contactPersonRole: "Proprietor",
    monthlyCapacity: "85,000 yards / month",
    verificationStatus: "verified",
    isVerified: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
  });

  const packagingSupplier = await User.create({
    name: "Farhana Yasmin",
    email: "packaging@sourcebd.demo",
    phone: "01711000003",
    password: passwordHash,
    role: "supplier",
    businessName: "Bangla Packaging Ltd.",
    businessType: "Manufacturer",
    ownershipType: "Private Limited (Pvt. Ltd.)",
    yearEstablished: "2017",
    businessDescription:
      "ISO-grade corrugated cartons, tamper-proof poly mailers, and food-grade kraft packaging.",
    address: "BSCIC Industrial Estate, Fatullah",
    city: "Narayanganj",
    tradeLicenseNumber: "TRAD/NCC/009412/2024",
    tradeLicenseAuthority: "Narayanganj City Corporation",
    tinNumber: "529104837219",
    binNumber: "003198422-0301",
    nidNumber: "1991672018493",
    contactPersonName: "Farhana Yasmin",
    contactPersonRole: "Managing Director",
    monthlyCapacity: "120,000 cartons / month",
    verificationStatus: "verified",
    isVerified: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
  });

  const electronicsSupplier = await User.create({
    name: "Tanvir Ahmed",
    email: "electronics@sourcebd.demo",
    phone: "01711000004",
    password: passwordHash,
    role: "supplier",
    businessName: "Modern Electronics BD",
    businessType: "Importer",
    ownershipType: "Partnership",
    yearEstablished: "2020",
    businessDescription:
      "Wholesale LED drivers, industrial SMPS power supplies, and smart assembly components.",
    address: "18 Sundarban Square Market, Gulistan",
    city: "Dhaka",
    tradeLicenseNumber: "TRAD/DSCC/058219/2025",
    tradeLicenseAuthority: "Dhaka South City Corporation (DSCC)",
    tinNumber: "739182645102",
    binNumber: "004819204-0201",
    nidNumber: "1994261098412",
    contactPersonName: "Tanvir Ahmed",
    contactPersonRole: "Managing Partner",
    monthlyCapacity: "15,000 units / month",
    bankName: "Dutch-Bangla Bank PLC (Motijheel Branch)",
    bankAccountNumber: "105.110.0049218",
    websiteUrl: "https://modernelectronicsbd.example",
    verificationStatus: "pending",
    isVerified: false,
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
  });

  const agroSupplier = await User.create({
    name: "Mizanur Rahman",
    email: "agro@sourcebd.demo",
    phone: "01711000005",
    password: passwordHash,
    role: "supplier",
    businessName: "Chattogram Agro & Spices",
    businessType: "Wholesaler",
    businessDescription:
      "Bulk aromatic rice, whole turmeric, cumin, and mustard seeds sourced from Khatunganj wholesale hub.",
    address: "112 Khatunganj Trade Center",
    city: "Chattogram",
    verificationStatus: "verified",
    isVerified: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
  });

  const printSupplier = await User.create({
    name: "Sadia Islam",
    email: "print@sourcebd.demo",
    phone: "01711000006",
    password: passwordHash,
    role: "supplier",
    businessName: "Gazipur Print & Stationery",
    businessType: "Manufacturer",
    businessDescription:
      "Bulk offset paper reams, hangtags, thermal barcode labels, and branded garment box printing.",
    address: "Plot 14, Tongi Industrial Area",
    city: "Gazipur",
    verificationStatus: "verified",
    isVerified: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
  });

  await Category.create({ name: "Garments & Textile", description: "Fabrics, threads, buttons & zippers" });
  await Category.create({ name: "Packaging", description: "Carton boxes, polybags & tape" });
  await Category.create({ name: "Electronics", description: "Components, LED drivers & cables" });
  await Category.create({ name: "Food & Beverage", description: "Bulk spices, grains & ingredients" });
  await Category.create({ name: "Printing Materials", description: "Labels, art cards, paper & inks" });

  const p1 = await Product.create({
    name: "100% Combed Cotton Fabric (44-inch)",
    description:
      "Soft breathable combed cotton fabric ideal for shirts, kurtis, and summer apparel. Available in white, navy, and custom dye lots.",
    category: "Garments & Textile",
    price: 180,
    currency: "BDT",
    quantity: 2500,
    unit: "yard",
    minimumOrderQuantity: 50,
    supplier: textileSupplier._id,
    images: [IMG_COTTON],
    status: "published",
  });

  const p2 = await Product.create({
    name: "Heavyweight Twill Chino Fabric (280 GSM)",
    description:
      "Durable 280 GSM cotton twill suitable for trousers, uniforms, and workwear manufacturing.",
    category: "Garments & Textile",
    price: 265,
    currency: "BDT",
    quantity: 1400,
    unit: "yard",
    minimumOrderQuantity: 40,
    supplier: textileSupplier._id,
    images: [IMG_COTTON],
    status: "published",
  });

  const p3 = await Product.create({
    name: "5-Ply Corrugated E-Commerce Carton Box",
    description:
      "Strong export-grade kraft corrugated box (12x10x6 inch) for parcel shipping and garment packing.",
    category: "Packaging",
    price: 38,
    currency: "BDT",
    quantity: 8000,
    unit: "piece",
    minimumOrderQuantity: 100,
    supplier: packagingSupplier._id,
    images: [IMG_PACKAGING],
    status: "published",
  });

  const p4 = await Product.create({
    name: "Tamper-Proof Courier Poly Mailers",
    description:
      "Waterproof 60-micron poly courier bags with self-adhesive strip for online businesses.",
    category: "Packaging",
    price: 6,
    currency: "BDT",
    quantity: 20000,
    unit: "piece",
    minimumOrderQuantity: 500,
    supplier: packagingSupplier._id,
    images: [IMG_PACKAGING],
    status: "published",
  });

  const p5 = await Product.create({
    name: "12V 5A Industrial LED Power Supply",
    description:
      "Regulated SMPS power adapter with overload protection for signage and lighting assemblies.",
    category: "Electronics",
    price: 350,
    currency: "BDT",
    quantity: 600,
    unit: "unit",
    minimumOrderQuantity: 20,
    supplier: electronicsSupplier._id,
    images: [IMG_ELECTRONICS],
    status: "published",
  });

  const p6 = await Product.create({
    name: "Premium Whole Turmeric & Cumin Lot (50kg Sack)",
    description:
      "Cleaned export-quality whole spices packed in moisture-sealed 50kg jute-lined sacks for wholesalers and food processors.",
    category: "Food & Beverage",
    price: 8900,
    currency: "BDT",
    quantity: 320,
    unit: "sack",
    minimumOrderQuantity: 5,
    supplier: agroSupplier._id,
    images: [IMG_AGRO],
    status: "published",
  });

  const p7 = await Product.create({
    name: "Aromatic Chinigura Rice Bulk Supply (25kg Bag)",
    description:
      "Fresh harvest Dinajpur Chinigura rice graded for catering houses, grocery wholesalers, and exporters.",
    category: "Food & Beverage",
    price: 3150,
    currency: "BDT",
    quantity: 500,
    unit: "bag",
    minimumOrderQuantity: 10,
    supplier: agroSupplier._id,
    images: [IMG_AGRO],
    status: "published",
  });

  const p8 = await Product.create({
    name: "350 GSM Matte Art Card Hangtags & Labels",
    description:
      "Custom die-cut apparel hangtags with matte lamination and metallic foil stamping options for garment factories.",
    category: "Printing Materials",
    price: 4,
    currency: "BDT",
    quantity: 50000,
    unit: "piece",
    minimumOrderQuantity: 1000,
    supplier: printSupplier._id,
    images: [IMG_PACKAGING],
    status: "published",
  });

  const order = await Order.create({
    buyer: buyer._id,
    supplier: textileSupplier._id,
    product: p1._id,
    productName: p1.name,
    quantity: 60,
    unitPrice: p1.price,
    currency: p1.currency,
    totalPrice: 60 * p1.price,
    note: "Please deliver in two bundles.",
    shippingAddress: "Mirpur-10, Dhaka",
    contactPhone: buyer.phone,
    status: "delivered",
  });

  await Review.create({
    buyer: buyer._id,
    product: p1._id,
    supplier: textileSupplier._id,
    rating: 5,
    comment: "Consistent GSM and fast delivery from Islampur.",
    status: "approved",
  });

  await Review.create({
    buyer: buyer._id,
    product: p3._id,
    supplier: packagingSupplier._id,
    rating: 4,
    comment: "Sturdy 5-ply board quality, cleanly cut edges for dispatch.",
    status: "approved",
  });

  await Review.create({
    buyer: buyer._id,
    product: p6._id,
    supplier: agroSupplier._id,
    rating: 5,
    comment: "Clean aroma and zero moisture issues in the Khatunganj lot.",
    status: "approved",
  });

  await Inquiry.create({
    buyer: buyer._id,
    supplier: packagingSupplier._id,
    product: p3._id,
    productName: p3.name,
    details: "Need custom single-color logo print on 500 boxes. What is the lead time?",
    quantity: 500,
    targetPrice: 35,
    status: "new",
  });

  void admin;
  void order;
  void p2;
  void p4;
  void p5;
  void p7;
  void p8;
  seeded = true;
}

module.exports = { seedMemoryData };
