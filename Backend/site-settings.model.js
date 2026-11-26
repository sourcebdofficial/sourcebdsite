const mongoose = require("mongoose");
const { createModel } = require("./db");

const siteSettingsSchema = new mongoose.Schema({
  _id: { type: String, default: "sourcebd-site" },
  logoData: { type: String, default: "" },
}, { versionKey: false });

module.exports = createModel("SiteSettings", siteSettingsSchema);
