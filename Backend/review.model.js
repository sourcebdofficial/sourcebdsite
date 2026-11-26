const mongoose = require("mongoose");
const { createModel } = require("./db");

const reviewSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, default: "", maxlength: 1000 },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
}, { timestamps: true });

reviewSchema.index({ buyer: 1, product: 1 }, { unique: true });
module.exports = createModel("Review", reviewSchema, [["buyer", "product"]]);
