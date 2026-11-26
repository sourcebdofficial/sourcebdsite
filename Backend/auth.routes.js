
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");

const router = express.Router();
const User = require("./user.model");
const authMiddleware = require("./auth.middleware");
const adminMiddleware = require("./admin.middleware");
const requirePermission = adminMiddleware.requirePermission;
const VerificationCode = require("./verification-code.model");
const sendVerificationCode = require("./verification-delivery");

const normalizePhone = (value) => {
  const digits = String(value || "").trim();
  return /^01[3-9]\d{8}$/.test(digits) ? digits : null;
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const hashVerificationCode = (channel, destination, code) => crypto
  .createHmac("sha256", process.env.OTP_SECRET || process.env.JWT_SECRET || "")
  .update(`${channel}:${destination}:${code}`)
  .digest("hex");
const maskDestination = (channel, destination) => channel === "email"
  ? `${destination.split("@")[0].slice(0, 1)}***@${destination.split("@").slice(1).join("@")}`
  : `${destination.slice(0, -4).replace(/\d/g, "*")}${destination.slice(-4)}`;

const verificationRequestsByIp = new Map();
function limitVerificationRequests(req, res, next) {
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const windowMs = 15 * 60_000;
  const current = verificationRequestsByIp.get(ip);
  if (!current || now - current.startedAt >= windowMs) {
    verificationRequestsByIp.set(ip, { startedAt: now, count: 1 });
    return next();
  }
  if (current.count >= 10) {
    return res.status(429).json({ message: "Too many verification requests. Try again in a few minutes." });
  }
  current.count += 1;
  return next();
}

const ALLOWED_PERMISSIONS = [
  "view_users",
  "manage_users",
  "view_suppliers",
  "manage_suppliers",
  "view_listings",
  "manage_listings",
  "view_orders",
  "manage_orders",
  "view_reports",
];

// Send a one-time verification code before creating a public account.
router.post("/register/send-code", limitVerificationRequests, async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    const verificationMethod = req.body.verificationMethod || "email";
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if (!name?.trim() || !isValidEmail(normalizedEmail) || typeof password !== "string" || !password) {
      return res.status(400).json({
        message: "Name, valid email, 11-digit phone number and password are required.",
      });
    }

    if (!normalizedPhone) {
      return res.status(400).json({
        message: "Enter a valid 11-digit Bangladeshi phone number (e.g. 01711000001).",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long.",
      });
    }

    if (role && !["buyer", "supplier"].includes(role)) {
      return res.status(403).json({
        message: "Public registration cannot create admin accounts.",
      });
    }

    if (verificationMethod !== "email") {
      return res.status(400).json({ message: "Registration verification is only available via email OTP." });
    }

    const existingUser = await User.findOne({ $or: [{ email: normalizedEmail }, { phone: normalizedPhone }] }).select("email phone");

    if (existingUser) {
      return res.status(409).json({
        message: existingUser.email === normalizedEmail ? "Email already registered." : "Phone number already registered.",
      });
    }

    if (!process.env.JWT_SECRET && !process.env.OTP_SECRET) {
      return res.status(500).json({ message: "Server verification secret is not configured." });
    }

    const destination = verificationMethod === "email" ? normalizedEmail : normalizedPhone;
    const existingCode = await VerificationCode.findOne({ channel: verificationMethod, destination });
    const now = new Date();
    if (existingCode && now.getTime() - existingCode.sentAt.getTime() < 60_000) {
      const retryAfterSeconds = Math.ceil((60_000 - (now.getTime() - existingCode.sentAt.getTime())) / 1000);
      return res.status(429).json({ message: `Wait ${retryAfterSeconds} seconds before requesting another code.`, retryAfterSeconds });
    }

    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    const codeHash = hashVerificationCode(verificationMethod, destination, code);
    const challenge = await VerificationCode.findOneAndUpdate(
      { channel: verificationMethod, destination },
      { $set: { codeHash, attempts: 0, sentAt: now, expiresAt: new Date(now.getTime() + 10 * 60_000) } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    try {
      await sendVerificationCode(verificationMethod, destination, code);
    } catch (deliveryError) {
      await VerificationCode.deleteOne({ _id: challenge._id, codeHash });
      return res.status(deliveryError.status || 502).json({ message: deliveryError.message || "Could not send verification code." });
    }

    return res.status(200).json({
      message: `Verification code sent to ${maskDestination(verificationMethod, destination)}.`,
      verificationMethod,
      maskedDestination: maskDestination(verificationMethod, destination),
    });
  } catch (error) {
    console.error("Verification code request error:", error.message);
    return res.status(500).json({ message: "Could not send verification code." });
  }
});

// Direct public registration (no OTP step required)
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if (!name?.trim() || !isValidEmail(normalizedEmail) || typeof password !== "string" || !password) {
      return res.status(400).json({ message: "Name, valid email, 11-digit phone number and password are required." });
    }
    if (!normalizedPhone) {
      return res.status(400).json({ message: "Enter a valid 11-digit Bangladeshi phone number (e.g. 01711000001)." });
    }
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters long." });
    if (role && !["buyer", "supplier"].includes(role)) return res.status(403).json({ message: "Public registration cannot create admin accounts." });

    const existingUser = await User.findOne({ $or: [{ email: normalizedEmail }, { phone: normalizedPhone }] }).select("email phone");
    if (existingUser) return res.status(409).json({ message: existingUser.email === normalizedEmail ? "Email already registered." : "Phone number already registered." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      role: role || "buyer",
      isEmailVerified: true,
      isPhoneVerified: true,
    });

    const token = process.env.JWT_SECRET
      ? jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: "1h" })
      : null;

    return res.status(201).json({
      message: "Account created successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        permissions: user.permissions || [],
      },
    });
  } catch (error) {
    console.error("Registration error:", error.message);
    if (error.code === 11000) return res.status(409).json({ message: "Email or phone number already registered." });
    return res.status(500).json({ message: "Registration failed." });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { identifier, email, phone, password } = req.body;
    const loginIdentifier = String(identifier || email || phone || "").trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        message: "Email or phone number and password are required.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing.");
      return res.status(500).json({
        message: "Server configuration error.",
      });
    }

    const isEmailLogin = loginIdentifier.includes("@");
    const normalizedIdentifier = isEmailLogin ? normalizeEmail(loginIdentifier) : normalizePhone(loginIdentifier);
    if (!normalizedIdentifier) {
      return res.status(400).json({
        message: isEmailLogin
          ? "Enter a valid email address."
          : "Enter a valid 11-digit Bangladeshi phone number (e.g. 01711000001).",
      });
    }

    const user = await User.findOne(isEmailLogin
      ? { email: normalizedIdentifier }
      : { phone: { $in: [normalizedIdentifier, `+88${normalizedIdentifier}`] } }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Your account has been deactivated.",
      });
    }

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        permissions: user.permissions || [],
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Login failed.",
    });
  }
});

// Current user's profile
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      message: "Profile retrieved successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
        phone: user.phone,
        isVerified: user.isVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Profile error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve profile.",
    });
  }
});

// Admin dashboard
router.get(
  "/admin/dashboard",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    return res.status(200).json({
      message: "Welcome to SourceBD Admin Dashboard.",
      admin: {
        userId: req.user.userId,
        role: req.user.role,
        permissions: req.user.permissions,
      },
    });
  }
);

// Create Co-Admin: Super Admin only
router.post(
  "/admin/co-admins",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only the Super Admin can create Co-Admins.",
      });
    }

    try {
      const { name, email, password, permissions = [] } = req.body;

      if (!name?.trim() || !email?.trim() || !password) {
        return res.status(400).json({
          message: "Name, email and password are required.",
        });
      }

      if (!isValidEmail(email.trim())) {
        return res.status(400).json({
          message: "Enter a valid email address.",
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          message: "Password must be at least 8 characters long.",
        });
      }

      if (!Array.isArray(permissions)) {
        return res.status(400).json({
          message: "Permissions must be an array.",
        });
      }

      const invalidPermissions = permissions.filter(
        (permission) => !ALLOWED_PERMISSIONS.includes(permission)
      );

      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          message: "One or more permissions are invalid.",
          invalidPermissions,
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      if (await User.findOne({ email: normalizedEmail })) {
        return res.status(409).json({
          message: "Email already registered.",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const coAdmin = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "co-admin",
        permissions: [...new Set(permissions)],
        isActive: true,
      });

      return res.status(201).json({
        message: "Co-Admin created successfully.",
        coAdmin: {
          id: coAdmin._id,
          name: coAdmin.name,
          email: coAdmin.email,
          role: coAdmin.role,
          permissions: coAdmin.permissions,
        },
      });
    } catch (error) {
      console.error("Co-Admin creation error:", error.message);

      if (error.code === 11000) {
        return res.status(409).json({
          message: "Email already registered.",
        });
      }

      return res.status(500).json({
        message: "Failed to create Co-Admin.",
      });
    }
  }
);

// List Co-Admins: Super Admin only
router.get(
  "/admin/co-admins",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only the Super Admin can view Co-Admins.",
      });
    }

    try {
      const coAdmins = await User.find({ role: "co-admin" })
        .select("-password")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        total: coAdmins.length,
        coAdmins,
      });
    } catch (error) {
      console.error("Co-Admin list error:", error.message);

      return res.status(500).json({
        message: "Failed to retrieve Co-Admins.",
      });
    }
  }
);

// Update Co-Admin permissions: Super Admin only
router.patch(
  "/admin/co-admins/:id/permissions",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only the Super Admin can change permissions.",
      });
    }

    try {
      const { id } = req.params;
      const { permissions } = req.body;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid Co-Admin ID.",
        });
      }

      if (!Array.isArray(permissions)) {
        return res.status(400).json({
          message: "Permissions must be an array.",
        });
      }

      const invalidPermissions = permissions.filter(
        (permission) => !ALLOWED_PERMISSIONS.includes(permission)
      );

      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          message: "One or more permissions are invalid.",
          invalidPermissions,
        });
      }

      const coAdmin = await User.findOneAndUpdate(
        { _id: id, role: "co-admin" },
        { $set: { permissions: [...new Set(permissions)] } },
        { new: true, runValidators: true }
      ).select("-password");

      if (!coAdmin) {
        return res.status(404).json({
          message: "Co-Admin not found.",
        });
      }

      return res.status(200).json({
        message: "Co-Admin permissions updated successfully.",
        coAdmin,
      });
    } catch (error) {
      console.error("Permission update error:", error.message);

      return res.status(500).json({
        message: "Failed to update permissions.",
      });
    }
  }
);

// List users
router.get(
  "/admin/users",
  authMiddleware,
  adminMiddleware,
  requirePermission("view_users"),
  async (req, res) => {
    try {
      let filter = {};

      // Co-Admin can only see buyers and suppliers
      if (req.user.role === "co-admin") {
        filter = {
          role: { $in: ["buyer", "supplier"] },
        };
      }

      const users = await User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        message: "Users fetched successfully.",
        totalUsers: users.length,
        users,
      });
    } catch (error) {
      console.error("User list error:", error.message);

      return res.status(500).json({
        message: "Failed to fetch users.",
      });
    }
  }
);

// Delete user
router.delete(
  "/admin/users/:id",
  authMiddleware,
  adminMiddleware,
  (req, res, next) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only the Super Admin can delete accounts.",
      });
    }
    next();
  },
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid user ID.",
        });
      }

      if (id === req.user.userId) {
        return res.status(400).json({
          message: "You cannot delete your own account.",
        });
      }

      const targetUser = await User.findById(id);

      if (!targetUser) {
        return res.status(404).json({
          message: "User not found.",
        });
      }

      const deletedUser = await User.findByIdAndDelete(id);

      return res.status(200).json({
        message: "User deleted successfully.",
        deletedUser: {
          id: deletedUser._id,
          name: deletedUser.name,
          email: deletedUser.email,
          role: deletedUser.role,
        },
      });
    } catch (error) {
      console.error("User deletion error:", error.message);

      return res.status(500).json({
        message: "Failed to delete user.",
      });
    }
  }
);

module.exports = router;
