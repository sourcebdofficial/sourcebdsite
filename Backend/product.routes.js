const express = require("express");
const router = express.Router();

const Product = require("./product.model");
const Review = require("./review.model");
const User = require("./user.model");

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ========================================
// GET ALL PUBLISHED PRODUCTS
// GET /api/products
// ========================================
router.get("/", async (req, res) => {
  try {
    const {
      search,
      category,
      location,
      minPrice,
      maxPrice,
      maxMoq,
      verifiedOnly,
      minRating,
      supplier,
      sort = "newest",
      page = "1",
      limit = "20",
    } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      !Number.isInteger(limitNumber) ||
      limitNumber < 1 ||
      limitNumber > 100
    ) {
      return res.status(400).json({
        message: "Page must be positive and limit must be between 1 and 100.",
      });
    }

    const filter = {
      status: "published",
    };

    if (category !== undefined && category !== "") {
      if (typeof category !== "string" || !category.trim()) {
        return res.status(400).json({
          message: "Category must be a non-empty string.",
        });
      }

      filter.category = {
        $regex: `^${escapeRegex(category.trim())}$`,
        $options: "i",
      };
    }

    if (search !== undefined && search !== "") {
      if (typeof search !== "string" || !search.trim()) {
        return res.status(400).json({
          message: "Search must be a non-empty string.",
        });
      }

      const escapedSearch = escapeRegex(search.trim());
      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { description: { $regex: escapedSearch, $options: "i" } },
        { category: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    // Price range filter
    if (minPrice !== undefined && minPrice !== "") {
      const minP = Number(minPrice);
      if (!Number.isFinite(minP) || minP < 0) {
        return res.status(400).json({ message: "minPrice must be a non-negative number." });
      }
      filter.price = { ...(filter.price || {}), $gte: minP };
    }

    if (maxPrice !== undefined && maxPrice !== "") {
      const maxP = Number(maxPrice);
      if (!Number.isFinite(maxP) || maxP < 0) {
        return res.status(400).json({ message: "maxPrice must be a non-negative number." });
      }
      filter.price = { ...(filter.price || {}), $lte: maxP };
    }

    // Max MOQ filter
    if (maxMoq !== undefined && maxMoq !== "") {
      const moqNum = Number(maxMoq);
      if (!Number.isFinite(moqNum) || moqNum < 1) {
        return res.status(400).json({ message: "maxMoq must be at least 1." });
      }
      filter.minimumOrderQuantity = { $lte: moqNum };
    }

    // Supplier ID, location, and verifiedOnly composition
    const supplierQuery = { role: "supplier", isActive: true };
    let needsSupplierFilter = false;

    if (supplier !== undefined && supplier !== "") {
      if (!/^[a-fA-F0-9]{24}$/.test(String(supplier))) {
        return res.status(400).json({ message: "Invalid supplier ID." });
      }
      supplierQuery._id = String(supplier);
      needsSupplierFilter = true;
    }

    if (location !== undefined && location !== "" && location !== "All Bangladesh") {
      if (typeof location !== "string" || !location.trim()) {
        return res.status(400).json({ message: "Location must be a non-empty string." });
      }
      const escapedLocation = escapeRegex(location.trim());
      supplierQuery.$or = [
        { city: { $regex: escapedLocation, $options: "i" } },
        { address: { $regex: escapedLocation, $options: "i" } },
      ];
      needsSupplierFilter = true;
    }

    if (verifiedOnly === "true" || verifiedOnly === true) {
      supplierQuery.isVerified = true;
      needsSupplierFilter = true;
    }

    if (needsSupplierFilter) {
      const supplierIds = await User.find(supplierQuery).distinct("_id");
      filter.supplier = { $in: supplierIds };
    }

    // Sort mapping
    const sortMap = {
      newest: { createdAt: -1 },
      price_asc: { price: 1, createdAt: -1 },
      price_desc: { price: -1, createdAt: -1 },
      moq_asc: { minimumOrderQuantity: 1, createdAt: -1 },
    };
    const sortSpec = sortMap[sort] || sortMap.newest;

    const minRatingNum = minRating !== undefined && minRating !== "" ? Number(minRating) : 0;
    if (Number.isNaN(minRatingNum) || minRatingNum < 0 || minRatingNum > 5) {
      return res.status(400).json({ message: "minRating must be between 0 and 5." });
    }

    // If minRating > 0, compute matching product IDs first so pagination counts are accurate
    if (minRatingNum > 0) {
      const ratingAgg = await Review.aggregate([
        { $match: { status: "approved" } },
        { $group: { _id: "$product", averageRating: { $avg: "$rating" } } },
      ]);
      const passingIds = ratingAgg
        .filter((r) => Number(r.averageRating) >= minRatingNum)
        .map((r) => r._id);
      filter._id = { $in: passingIds };
    }

    const skip = (pageNumber - 1) * limitNumber;

    const [products, totalProducts] = await Promise.all([
      Product.find(filter)
        .select(
          "name description category price currency quantity unit minimumOrderQuantity supplier images createdAt updatedAt"
        )
        .populate(
          "supplier",
          "name isVerified businessName businessType city address verificationStatus"
        )
        .sort(sortSpec)
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Product.countDocuments(filter),
    ]);

    const reviewStats = await Review.aggregate([
      { $match: { status: "approved", product: { $in: products.map((product) => product._id) } } },
      { $group: { _id: "$product", averageRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } },
    ]);
    const statsByProduct = new Map(reviewStats.map((item) => [String(item._id), item]));
    const productsWithReviews = products.map((product) => {
      const stats = statsByProduct.get(String(product._id));
      return {
        ...product,
        averageRating: stats ? Number(stats.averageRating.toFixed(1)) : 0,
        reviewCount: stats?.reviewCount || 0,
      };
    });

    return res.status(200).json({
      message: "Published products fetched successfully.",
      pagination: {
        currentPage: pageNumber,
        pageSize: limitNumber,
        totalProducts,
        totalPages: Math.max(1, Math.ceil(totalProducts / limitNumber)),
      },
      products: productsWithReviews,
    });
  } catch (error) {
    console.error("Get public products error:", error);

    return res.status(500).json({
      message: "Failed to fetch products.",
    });
  }
});

// ========================================
// GET SINGLE PUBLISHED PRODUCT
// GET /api/products/:id
// ========================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    const product = await Product.findOne({
      _id: id,
      status: "published",
    })
      .select(
        "name description category price currency quantity unit minimumOrderQuantity supplier images createdAt updatedAt"
      )
      .populate(
        "supplier",
        "name isVerified businessName businessType businessDescription city address phone email verificationStatus"
      )
      .lean();

    if (!product) {
      return res.status(404).json({
        message: "Published product not found.",
      });
    }

    const [stats] = await Review.aggregate([
      { $match: { product: product._id, status: "approved" } },
      { $group: { _id: "$product", averageRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } },
    ]);

    return res.status(200).json({
      message: "Product fetched successfully.",
      product: {
        ...product,
        averageRating: stats ? Number(stats.averageRating.toFixed(1)) : 0,
        reviewCount: stats?.reviewCount || 0,
      },
    });
  } catch (error) {
    console.error("Get public product error:", error);

    return res.status(500).json({
      message: "Failed to fetch product.",
    });
  }
});

module.exports = router;
