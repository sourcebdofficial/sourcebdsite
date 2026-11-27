
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const authRoutes = require("./auth.routes");
const buyerRoutes = require("./buyer.routes");
const supplierRoutes = require("./supplier.routes");
const productRoutes = require("./product.routes");
const orderRoutes = require("./order.routes");
const sourcingRoutes = require("./sourcing.routes");
const settingsRoutes = require("./settings.routes");
const PORT = 5000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.get("/debug-route-check", (req, res) => {
  res.json({
    message: "Server.js route is working",
  });
});
app.use("/api/auth", authRoutes);
app.use("/api/buyer", buyerRoutes);
app.use("/api/supplier", supplierRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/sourcing", sourcingRoutes);
app.use("/api/settings", settingsRoutes);
app.get("/api/auth/test", (req, res) => {
  res.send("Auth route is working!");
});
console.log("Auth routes loaded:", typeof authRoutes);
console.log(
  "Auth routes file:",
  require.resolve("./auth.routes")
);

console.log(
  "Co-Admin route exists:",
  require("fs")
    .readFileSync(require.resolve("./auth.routes"), "utf8")
    .includes('"/admin/co-admins"')
);
app.get("/", (req, res) => {
  res.send("SourceBD Backend is running successfully!");
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    require("./db").setMemoryMode(false);
    console.log("MongoDB connected successfully!");
    try {
      const { seedDemoData } = require("./seed-data");
      const result = await seedDemoData();
      if (result?.seeded) {
        console.log("SourceBD demo catalog seeded into MongoDB.");
      }
    } catch (seedError) {
      console.warn("MongoDB demo seed skipped:", seedError.message);
    }

    app.listen(PORT, () => {
      console.log(`SourceBD server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  }
}

startServer();
