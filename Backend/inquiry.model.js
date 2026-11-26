const mongoose = require("mongoose");
const { createModel } = require("./db");

const inquirySchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
  productName: { type: String, required: true, trim: true, maxlength: 150 },
  details: { type: String, required: true, trim: true, maxlength: 2000 },
  quantity: { type: Number, min: 1, default: null },
  targetPrice: { type: Number, min: 0, default: null },
  status: { type: String, enum: ["new", "responded", "closed"], default: "new", index: true },
  supplierResponse: { type: String, trim: true, default: "", maxlength: 2000 },
}, { timestamps: true });

module.exports = createModel("Inquiry", inquirySchema);
