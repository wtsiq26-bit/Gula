// ──────────────────────────────────────────────────────────────
// Gula PMS — JWT Authentication Middleware
// Extracts the Bearer token from the Authorization header,
// verifies it, and attaches the decoded payload to `req.user`.
// ──────────────────────────────────────────────────────────────

const jwt = require("jsonwebtoken");

/**
 * Middleware: Protect routes by requiring a valid JWT.
 * Attaches { userId, pharmacyId, role } to req.user.
 */
const protect = (req, res, next) => {
  try {
    // 1. Extract token from "Bearer <token>" header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Attach user payload to request
    req.user = {
      userId: decoded.userId,
      pharmacyId: decoded.pharmacyId,
      role: decoded.role,
      name: decoded.name,
      location: decoded.location,
    };

    next();
  } catch (error) {
    // Differentiate between expired and invalid tokens
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired. Please log in again.",
      });
    }
    return res.status(401).json({
      success: false,
      message: "Invalid token. Authentication failed.",
    });
  }
};

/**
 * Middleware: Restrict access to specific roles.
 * Must be used AFTER the `protect` middleware.
 * @param  {...string} roles — Allowed roles (e.g., "ADMIN", "PHARMACIST")
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. You do not have permission to perform this action.",
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
