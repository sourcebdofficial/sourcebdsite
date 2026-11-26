
// Allow Super Admin and Co-Admin to access admin routes
function adminMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  const { role } = req.user;

  if (role !== "admin" && role !== "co-admin") {
    return res.status(403).json({
      message: "Access denied. Admin access required.",
    });
  }

  next();
}

// Check specific permission for an admin action
function requirePermission(permission) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    // Super Admin has full access
    if (req.user.role === "admin") {
      return next();
    }

    if (req.user.role !== "co-admin") {
      return res.status(403).json({
        message: "Access denied.",
      });
    }

    const permissions = req.user.permissions || [];

    if (!permissions.includes(permission)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action.",
        requiredPermission: permission,
      });
    }

    next();
  };
}

module.exports = adminMiddleware;
module.exports.requirePermission = requirePermission;