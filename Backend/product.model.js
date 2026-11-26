
const mongoose = require("mongoose");
const { createModel } = require("./db");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      enum: ["BDT", "USD"],
      default: "BDT",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be a whole number.",
      },
    },

    unit: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
      default: "piece",
    },

    minimumOrderQuantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
      validate: {
        validator: Number.isInteger,
        message: "Minimum order quantity must be a whole number.",
      },
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["draft", "published", "inactive"],
      default: "draft",
      required: true,
      index: true,
    },

    images: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      required: true,
      validate: {
        validator: (images) =>
          Array.isArray(images) &&
          images.length >= 1 &&
          images.length <= 10 &&
          images.every((img) => typeof img === "string" && img.trim().length > 0),
        message: "At least one product image is required (maximum 10).",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index to help product searches by status and category
productSchema.index({ status: 1, category: 1, createdAt: -1 });

module.exports = createModel("Product", productSchema);