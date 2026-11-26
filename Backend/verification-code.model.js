const mongoose = require("mongoose");
const { createModel } = require("./db");

const verificationCodeSchema = new mongoose.Schema({
  channel: { type: String, enum: ["email", "phone"], required: true },
  destination: { type: String, required: true, trim: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  sentAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

verificationCodeSchema.index({ channel: 1, destination: 1 }, { unique: true });
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = createModel("VerificationCode", verificationCodeSchema, [["channel", "destination"]]);
