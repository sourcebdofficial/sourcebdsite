const express = require("express");
const SiteSettings = require("./site-settings.model");
const authMiddleware = require("./auth.middleware");
const adminMiddleware = require("./admin.middleware");

const router = express.Router();
const SETTINGS_ID = "sourcebd-site";
const MAX_LOGO_BYTES = 1.5 * 1024 * 1024;
const LOGO_DATA_URL = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

router.get("/", async (req, res) => {
  try {
    const settings = await SiteSettings.findById(SETTINGS_ID).select("logoData");
    return res.status(200).json({ logoData: settings?.logoData || "" });
  } catch (error) {
    console.error("Site settings read error:", error.message);
    return res.status(500).json({ message: "Could not load site settings." });
  }
});

router.put("/logo", authMiddleware, adminMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Only the Super Admin can change the site logo." });
  }

  const { logoData } = req.body || {};
  const match = typeof logoData === "string" ? logoData.match(LOGO_DATA_URL) : null;
  if (!match) {
    return res.status(400).json({ message: "Upload a PNG, JPG, or WebP logo image." });
  }

  const imageBytes = Buffer.from(match[2], "base64");
  if (imageBytes.length === 0 || imageBytes.length > MAX_LOGO_BYTES) {
    return res.status(400).json({ message: "Logo image must be smaller than 1.5 MB." });
  }

  try {
    const settings = await SiteSettings.findByIdAndUpdate(
      SETTINGS_ID,
      { $set: { logoData } },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    ).select("logoData");
    return res.status(200).json({ message: "Site logo updated successfully.", logoData: settings.logoData });
  } catch (error) {
    console.error("Site logo update error:", error.message);
    return res.status(500).json({ message: "Could not update the site logo." });
  }
});

router.delete("/logo", authMiddleware, adminMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Only the Super Admin can change the site logo." });
  }

  try {
    await SiteSettings.findByIdAndUpdate(
      SETTINGS_ID,
      { $set: { logoData: "" } },
      { upsert: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json({ message: "Default site logo restored.", logoData: "" });
  } catch (error) {
    console.error("Site logo reset error:", error.message);
    return res.status(500).json({ message: "Could not restore the default logo." });
  }
});

module.exports = router;
