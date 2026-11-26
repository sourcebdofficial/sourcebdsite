
const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Order = require("./order.model");
const Product = require("./product.model");
const User = require("./user.model");
const authMiddleware = require("./auth.middleware");

// Check user role
const requireRole = (role) => (req, res, next) => {
  if (req.user.role !== role) {
    return res.status(403).json({
      success: false,
      message: `Access denied. ${role} role required.`,
    });
  }

  next();
};

// All order routes require authentication
router.use(authMiddleware);

// ========================================
// 1. BUYER: CREATE A NEW ORDER
// POST /api/orders
// ========================================
router.post("/", requireRole("buyer"), async (req, res) => {
  let reservedProduct = null;
  let reservedQuantity = 0;

  try {
    const { productId, quantity, note, shippingAddress, contactPhone } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive whole number.",
      });
    }

    if (
      note !== undefined &&
      (typeof note !== "string" || note.length > 1000)
    ) {
      return res.status(400).json({
        success: false,
        message: "Note must be text with a maximum of 1000 characters.",
      });
    }

    if (
      shippingAddress !== undefined &&
      (typeof shippingAddress !== "string" ||
        shippingAddress.length > 500)
    ) {
      return res.status(400).json({
        success: false,
        message: "Shipping address must be text with a maximum of 500 characters.",
      });
    }

    if (
      contactPhone !== undefined &&
      (typeof contactPhone !== "string" ||
        (contactPhone.trim() && !/^01[3-9]\d{8}$/.test(contactPhone.trim())))
    ) {
      return res.status(400).json({
        success: false,
        message: "Contact phone must be an 11-digit Bangladeshi number (e.g. 01711000001).",
      });
    }

    const product = await Product.findOne({
      _id: productId,
      status: "published",
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Published product not found.",
      });
    }

    if (String(product.supplier) === String(req.user.userId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot order your own product.",
      });
    }

    if (quantity < product.minimumOrderQuantity) {
      return res.status(400).json({
        success: false,
        message: `Minimum order quantity is ${product.minimumOrderQuantity}.`,
      });
    }

    // Atomically reserve stock to prevent ordering more than available.
    reservedProduct = await Product.findOneAndUpdate(
      {
        _id: product._id,
        status: "published",
        quantity: { $gte: quantity },
      },
      {
        $inc: { quantity: -quantity },
      },
      {
        new: true,
      }
    );

    if (!reservedProduct) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock or product is no longer available.",
      });
    }

    reservedQuantity = quantity;

    const totalPrice = Number(
      (product.price * quantity).toFixed(2)
    );

    let resolvedPhone = typeof contactPhone === "string" ? contactPhone.trim() : "";
    if (!resolvedPhone) {
      const buyerUser = await User.findById(req.user.userId).select("phone").lean();
      resolvedPhone = buyerUser?.phone || "";
    }
    if (resolvedPhone && !/^01[3-9]\d{8}$/.test(resolvedPhone)) {
      return res.status(400).json({
        success: false,
        message: "Contact phone must be an 11-digit Bangladeshi number (e.g. 01711000001).",
      });
    }

    const order = await Order.create({
      buyer: req.user.userId,
      supplier: product.supplier,
      product: product._id,
      productName: product.name,
      quantity,
      unitPrice: product.price,
      currency: product.currency,
      totalPrice,
      note: note || "",
      shippingAddress: shippingAddress || "",
      contactPhone: resolvedPhone,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully.",
      order,
    });
  } catch (error) {
    // Restore reserved stock if order creation fails.
    if (reservedProduct && reservedQuantity > 0) {
      try {
        await Product.updateOne(
          { _id: reservedProduct._id },
          { $inc: { quantity: reservedQuantity } }
        );
      } catch (restoreError) {
        console.error("Stock restoration failed:", restoreError);
      }
    }

    console.error("Create order error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to place order.",
    });
  }
});

// ========================================
// 2. BUYER: VIEW OWN ORDERS
// GET /api/orders/my
// ========================================
router.get("/my", requireRole("buyer"), async (req, res) => {
  try {
    const orders = await Order.find({
      buyer: req.user.userId,
    })
      .populate("supplier", "name email phone businessName city")
      .populate("product", "name category unit")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get buyer orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch your orders.",
    });
  }
});

// ========================================
// 3. SUPPLIER: VIEW RECEIVED ORDERS
// GET /api/orders/supplier
// ========================================
router.get(
  "/supplier",
  requireRole("supplier"),
  async (req, res) => {
    try {
      const orders = await Order.find({
        supplier: req.user.userId,
      })
        .populate("buyer", "name email phone")
        .populate("product", "name category unit")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: orders.length,
        orders,
      });
    } catch (error) {
      console.error("Get supplier orders error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch supplier orders.",
      });
    }
  }
);

// ========================================
// 4. BUYER: CANCEL OWN PENDING ORDER
// PATCH /api/orders/:id/cancel
// ========================================
router.patch(
  "/:id/cancel",
  requireRole("buyer"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order ID.",
        });
      }

      const order = await Order.findOne({
        _id: id,
        buyer: req.user.userId,
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found.",
        });
      }

      if (order.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Only pending orders can be cancelled.",
        });
      }

      // Reserve the cancellation first to prevent duplicate stock returns.
      const cancelledOrder = await Order.findOneAndUpdate(
        {
          _id: id,
          buyer: req.user.userId,
          status: "pending",
        },
        {
          $set: {
            status: "cancelled",
            cancelledAt: new Date(),
          },
        },
        {
          new: true,
        }
      );

      if (!cancelledOrder) {
        return res.status(409).json({
          success: false,
          message: "Order status changed. Please refresh and try again.",
        });
      }

      try {
        await Product.updateOne(
          { _id: order.product },
          { $inc: { quantity: order.quantity } }
        );
      } catch (stockError) {
        // Revert cancellation if stock restoration fails.
        await Order.updateOne(
          { _id: order._id, status: "cancelled" },
          {
            $set: {
              status: "pending",
              cancelledAt: null,
            },
          }
        );

        throw stockError;
      }

      return res.status(200).json({
        success: true,
        message: "Order cancelled successfully.",
        order: cancelledOrder,
      });
    } catch (error) {
      console.error("Cancel order error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to cancel order.",
      });
    }
  }
);




// ========================================
// 5. SUPPLIER: UPDATE ORDER STATUS
// PATCH /api/orders/:id/status
// ========================================
router.patch(
  "/:id/status",
  requireRole("supplier"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order ID.",
        });
      }

      const allowedTransitions = {
        pending: ["confirmed", "cancelled"],
        confirmed: ["processing", "cancelled"],
        processing: ["shipped"],
        shipped: ["delivered"],
        delivered: [],
        cancelled: [],
      };

      const order = await Order.findOne({
        _id: id,
        supplier: req.user.userId,
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found.",
        });
      }

      if (!Object.prototype.hasOwnProperty.call(allowedTransitions, status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order status.",
        });
      }

      if (!allowedTransitions[order.status].includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot change order status from ${order.status} to ${status}.`,
        });
      }

      // Only the buyer cancellation route should cancel an order.
      // This route is for supplier fulfillment statuses.
      if (status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Supplier cannot cancel orders through this endpoint.",
        });
      }

      const updatedOrder = await Order.findOneAndUpdate(
        {
          _id: id,
          supplier: req.user.userId,
          status: order.status,
        },
        {
          $set: { status },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedOrder) {
        return res.status(409).json({
          success: false,
          message: "Order status changed. Refresh and try again.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Order status updated successfully.",
        order: updatedOrder,
      });
    } catch (error) {
      console.error("Update order status error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update order status.",
      });
    }
  }
);



module.exports = router;