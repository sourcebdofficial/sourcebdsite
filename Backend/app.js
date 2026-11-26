const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const { setMemoryMode } = require("./db");
const { seedMemoryData } = require("./seed-data");

const authRoutes = require("./auth.routes");
const buyerRoutes = require("./buyer.routes");
const supplierRoutes = require("./supplier.routes");
const productRoutes = require("./product.routes");
const orderRoutes = require("./order.routes");
const sourcingRoutes = require("./sourcing.routes");
const settingsRoutes = require("./settings.routes");

function ensureJwtSecret() {
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = crypto.randomBytes(32).toString("hex");
  }
}

async function initDatabase() {
  ensureJwtSecret();
  if (process.env.MONGODB_URI) {
    try {
      mongoose.set("bufferCommands", false);
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 4000,
      });
      setMemoryMode(false);
      console.log("MongoDB connected successfully!");
      return { mode: "mongodb" };
    } catch (error) {
      console.warn(
        "MongoDB connection failed, falling back to in-memory preview store:",
        error.message
      );
    }
  }
  setMemoryMode(true);
  await seedMemoryData();
  console.log("SourceBD in-memory store active (seed data ready).");
  return { mode: "memory" };
}

function createApiRouter() {
  const api = express.Router();
  api.use(cors());
  api.use(express.json({ limit: "10mb" }));

  api.get("/health", (req, res) => {
    res.json({ ok: true });
  });

  api.use("/auth", authRoutes);
  api.use("/buyer", buyerRoutes);
  api.use("/supplier", supplierRoutes);
  api.use("/products", productRoutes);
  api.use("/orders", orderRoutes);
  api.use("/sourcing", sourcingRoutes);
  api.use("/settings", settingsRoutes);

  return api;
}

module.exports = {
  initDatabase,
  createApiRouter,
};
