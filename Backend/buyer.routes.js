
const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const User = require("./user.model");
const authMiddleware = require("./auth.middleware");

// Middleware: Only Buyers can access these routes
function buyerMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  if (req.user.role !== "buyer") {
    return res.status(403).json({
      message: "Buyer access only.",
    });
  }

  next();
}

// GET /api/buyer/profile
// Get the logged-in Buyer's profile
router.get("/profile", authMiddleware, buyerMiddleware, async (req, res) => {
  try {
    const buyer = await User.findById(req.user.userId).select("-password");

    if (!buyer) {
      return res.status(404).json({
        message: "Buyer not found.",
      });
    }

    return res.status(200).json({
      message: "Buyer profile retrieved successfully.",
      buyer: {
        id: buyer._id,
        name: buyer.name,
        email: buyer.email,
        phone: buyer.phone,
        role: buyer.role,
        isVerified: buyer.isVerified,
        createdAt: buyer.createdAt,
      },
    });
  } catch (error) {
    console.error("Buyer profile error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve Buyer profile.",
    });
  }
});

// PATCH /api/buyer/profile
// Update the logged-in Buyer's own profile
router.patch("/profile", authMiddleware, buyerMiddleware, async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (name === undefined && phone === undefined) {
      return res.status(400).json({
        message: "Provide name or phone to update.",
      });
    }

    const updates = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          message: "Name must be a non-empty string.",
        });
      }

      updates.name = name.trim();
    }

    if (phone !== undefined) {
      if (typeof phone !== "string") {
        return res.status(400).json({
          message: "Phone must be a string.",
        });
      }

      const trimmedPhone = phone.trim();
      if (trimmedPhone && !/^01[3-9]\d{8}$/.test(trimmedPhone)) {
        return res.status(400).json({
          message: "Phone number must be an 11-digit Bangladeshi number (e.g. 01711000001).",
        });
      }

      updates.phone = trimmedPhone;
    }

    const buyer = await User.findOneAndUpdate(
      { _id: req.user.userId, role: "buyer", isActive: true },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!buyer) {
      return res.status(404).json({
        message: "Active Buyer account not found.",
      });
    }

    return res.status(200).json({
      message: "Buyer profile updated successfully.",
      buyer: {
        id: buyer._id,
        name: buyer.name,
        email: buyer.email,
        phone: buyer.phone,
        role: buyer.role,
        isVerified: buyer.isVerified,
        createdAt: buyer.createdAt,
      },
    });
  } catch (error) {
    console.error("Buyer profile update error:", error.message);

    return res.status(500).json({
      message: "Failed to update Buyer profile.",
    });
  }
});

module.exports = router;
