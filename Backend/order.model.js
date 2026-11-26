
const mongoose = require("mongoose");
const { createModel } = require("./db");

const orderSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    // Product information saved when the order is placed
    productName: {
      type: String,
      required: true,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Order quantity must be a whole number.",
      },
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      enum: ["BDT", "USD"],
      required: true,
      default: "BDT",
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    note: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
      required: true,
      index: true,
    },

    shippingAddress: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    contactPhone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "",
    },

    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Helpful indexes for buyer and supplier dashboards
orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ supplier: 1, status: 1, createdAt: -1 });

module.exports = createModel("Order", orderSchema);
