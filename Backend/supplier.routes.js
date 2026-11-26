
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const User = require("./user.model");
const Product = require("./product.model");
const authMiddleware = require("./auth.middleware");

// Only suppliers can access these routes
const supplierMiddleware = (req, res, next) => {
  if (req.user.role !== "supplier") {
    return res.status(403).json({
      message: "Access denied. Supplier account required.",
    });
  }

  next();
};

// Validate MongoDB ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Whitelist editable product fields
const getProductFields = (body) => {
  const fields = {};

  const allowedFields = [
    "name",
    "description",
    "category",
    "price",
    "currency",
    "quantity",
    "unit",
    "minimumOrderQuantity",
    "images",
  ];

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      fields[field] = body[field];
    }
  }

  return fields;
};

const isSafeProductImage = (value) => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 3_500_000) return false;
  if (/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) return true;
  if (/^(\/|https?:\/\/)/i.test(trimmed)) return true;
  return false;
};

const validateProductImages = (images) => {
  if (!Array.isArray(images) || images.length === 0) {
    return { valid: false, message: "At least one product image is required." };
  }
  if (images.length > 10) {
    return { valid: false, message: "A product can have at most 10 images." };
  }
  const cleaned = images.map((item) => (typeof item === "string" ? item.trim() : ""));
  if (cleaned.some((item) => !isSafeProductImage(item))) {
    return {
      valid: false,
      message: "Each product image must be a valid PNG, JPG, or WebP upload or image URL.",
    };
  }
  return { valid: true, images: cleaned };
};

// Apply authentication and supplier authorization
router.use(authMiddleware, supplierMiddleware);

// ========================================
// GET SUPPLIER PROFILE
// GET /api/supplier/profile
// ========================================
router.get("/profile", async (req, res) => {
  try {
    const supplier = await User.findOne({
      _id: req.user.userId,
      role: "supplier",
      isActive: true,
    }).select(
      "_id name email role phone isVerified verificationStatus verificationNote businessName businessType ownershipType yearEstablished businessDescription address city tradeLicenseNumber tradeLicenseAuthority tinNumber binNumber nidNumber contactPersonName contactPersonRole monthlyCapacity bankName bankAccountNumber websiteUrl verificationDocuments createdAt"
    );

    if (!supplier) {
      return res.status(404).json({
        message: "Supplier profile not found.",
      });
    }

    return res.status(200).json({
      message: "Supplier profile fetched successfully.",
      supplier,
    });
  } catch (error) {
    console.error("Get supplier profile error:", error);

    return res.status(500).json({
      message: "Failed to fetch supplier profile.",
    });
  }
});

// ========================================
// UPDATE SUPPLIER PROFILE
// PATCH /api/supplier/profile
// ========================================
router.patch("/profile", async (req, res) => {
  try {
    const { name, phone, businessName, businessType, businessDescription, address, city } = req.body;

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

    for (const [field, value] of Object.entries({ businessName, businessType, businessDescription, address, city })) {
      if (value !== undefined) {
        if (typeof value !== "string" || value.length > 1000) {
          return res.status(400).json({ message: `${field} must be text up to 1000 characters.` });
        }
        updates[field] = value.trim();
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Provide name or phone to update.",
      });
    }

    const supplier = await User.findOneAndUpdate(
      {
        _id: req.user.userId,
        role: "supplier",
        isActive: true,
      },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    ).select(
      "_id name email role phone isVerified verificationStatus verificationNote businessName businessType ownershipType yearEstablished businessDescription address city tradeLicenseNumber tradeLicenseAuthority tinNumber binNumber nidNumber contactPersonName contactPersonRole monthlyCapacity bankName bankAccountNumber websiteUrl verificationDocuments createdAt"
    );

    if (!supplier) {
      return res.status(404).json({
        message: "Supplier profile not found.",
      });
    }

    return res.status(200).json({
      message: "Supplier profile updated successfully.",
      supplier,
    });
  } catch (error) {
    console.error("Update supplier profile error:", error);

    return res.status(500).json({
      message: "Failed to update supplier profile.",
    });
  }
});

// ========================================
// CREATE PRODUCT LISTING
// POST /api/supplier/products
// ========================================
router.post("/products", async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      price,
      currency,
      quantity,
      unit,
      minimumOrderQuantity,
      images,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof description !== "string" ||
      !description.trim() ||
      typeof category !== "string" ||
      !category.trim() ||
      price === undefined ||
      quantity === undefined
    ) {
      return res.status(400).json({
        message:
          "Name, description, category, price and quantity are required.",
      });
    }

    if (
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      return res.status(400).json({
        message: "Price must be a valid non-negative number.",
      });
    }

    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 0
    ) {
      return res.status(400).json({
        message: "Quantity must be a non-negative whole number.",
      });
    }

    if (
      minimumOrderQuantity !== undefined &&
      (!Number.isInteger(minimumOrderQuantity) ||
        minimumOrderQuantity < 1)
    ) {
      return res.status(400).json({
        message: "Minimum order quantity must be a positive whole number.",
      });
    }

    const imageCheck = validateProductImages(images);
    if (!imageCheck.valid) {
      return res.status(400).json({
        message: imageCheck.message,
      });
    }

    const supplier = await User.findOne({
      _id: req.user.userId,
      role: "supplier",
      isActive: true,
    }).select("_id");

    if (!supplier) {
      return res.status(403).json({
        message: "Supplier account is not active or does not exist.",
      });
    }

    const product = await Product.create({
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
      price,
      currency: currency || "BDT",
      quantity,
      unit: unit || "piece",
      minimumOrderQuantity:
        minimumOrderQuantity === undefined ? 1 : minimumOrderQuantity,
      images: imageCheck.images,
      supplier: supplier._id,
      status: "draft",
    });

    return res.status(201).json({
      message: "Product listing created successfully as a draft.",
      product,
    });
  } catch (error) {
    console.error("Create product error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Product validation failed.",
        error: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to create product listing.",
    });
  }
});

// ========================================
// GET OWN PRODUCT LISTINGS
// GET /api/supplier/products
// ========================================
router.get("/products", async (req, res) => {
  try {
    const products = await Product.find({
      supplier: req.user.userId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Your product listings fetched successfully.",
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Get supplier products error:", error);

    return res.status(500).json({
      message: "Failed to fetch product listings.",
    });
  }
});

// ========================================
// GET ONE OWN PRODUCT
// GET /api/supplier/products/:id
// ========================================
router.get("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    const product = await Product.findOne({
      _id: id,
      supplier: req.user.userId,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found in your listings.",
      });
    }

    return res.status(200).json({
      message: "Product fetched successfully.",
      product,
    });
  } catch (error) {
    console.error("Get product error:", error);

    return res.status(500).json({
      message: "Failed to fetch product.",
    });
  }
});

// ========================================
// UPDATE OWN PRODUCT
// PATCH /api/supplier/products/:id
// ========================================
router.patch("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    const updates = getProductFields(req.body);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Provide at least one valid product field to update.",
      });
    }

    if (
      updates.price !== undefined &&
      (typeof updates.price !== "number" ||
        !Number.isFinite(updates.price) ||
        updates.price < 0)
    ) {
      return res.status(400).json({
        message: "Price must be a valid non-negative number.",
      });
    }

    if (
      updates.quantity !== undefined &&
      (!Number.isInteger(updates.quantity) || updates.quantity < 0)
    ) {
      return res.status(400).json({
        message: "Quantity must be a non-negative whole number.",
      });
    }

    if (
      updates.minimumOrderQuantity !== undefined &&
      (!Number.isInteger(updates.minimumOrderQuantity) ||
        updates.minimumOrderQuantity < 1)
    ) {
      return res.status(400).json({
        message: "Minimum order quantity must be a positive whole number.",
      });
    }

    if (updates.images !== undefined) {
      const imageCheck = validateProductImages(updates.images);
      if (!imageCheck.valid) {
        return res.status(400).json({
          message: imageCheck.message,
        });
      }
      updates.images = imageCheck.images;
    }

    for (const field of ["name", "description", "category", "unit"]) {
      if (updates[field] !== undefined) {
        if (
          typeof updates[field] !== "string" ||
          !updates[field].trim()
        ) {
          return res.status(400).json({
            message: `${field} must be a non-empty string.`,
          });
        }

        updates[field] = updates[field].trim();
      }
    }

    const product = await Product.findOneAndUpdate(
      {
        _id: id,
        supplier: req.user.userId,
      },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found in your listings.",
      });
    }

    return res.status(200).json({
      message: "Product listing updated successfully.",
      product,
    });
  } catch (error) {
    console.error("Update product error:", error);

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        message: "Product validation failed.",
        error: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to update product listing.",
    });
  }
});


// ========================================
// PUBLISH OWN PRODUCT
// PATCH /api/supplier/products/:id/publish
// ========================================
router.patch("/products/:id/publish", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    const product = await Product.findOne({
      _id: id,
      supplier: req.user.userId,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found in your listings.",
      });
    }

    if (product.status === "published") {
      return res.status(400).json({
        message: "This product is already published.",
      });
    }

    if (product.status === "inactive") {
      return res.status(400).json({
        message: "Inactive products cannot be published.",
      });
    }

    if (!Array.isArray(product.images) || product.images.length === 0) {
      return res.status(400).json({
        message: "Add at least one product image before publishing.",
      });
    }

    product.status = "published";
    await product.save();

    return res.status(200).json({
      message: "Product published successfully.",
      product,
    });
  } catch (error) {
    console.error("Publish product error:", error);

    return res.status(500).json({
      message: "Failed to publish product.",
    });
  }
});


// ========================================
// DELETE OWN PRODUCT
// DELETE /api/supplier/products/:id
// ========================================
router.delete("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    const product = await Product.findOneAndDelete({
      _id: id,
      supplier: req.user.userId,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found in your listings.",
      });
    }

    return res.status(200).json({
      message: "Product listing deleted successfully.",
      productId: product._id,
    });
  } catch (error) {
    console.error("Delete product error:", error);

    return res.status(500).json({
      message: "Failed to delete product listing.",
    });
  }
});

module.exports = router;
