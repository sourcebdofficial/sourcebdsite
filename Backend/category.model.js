const mongoose = require("mongoose");
const { createModel } = require("./db");

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true, maxlength: 100 },
  description: { type: String, trim: true, default: "", maxlength: 300 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = createModel("Category", categorySchema, [["name"]]);
