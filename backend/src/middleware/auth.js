// src/middleware/auth.js
// Verifies the JWT attached to incoming requests.
// Any protected route should use this middleware.

const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "super_secret_dev_key";

/**
 * authenticate  – validates the Bearer token in Authorization header.
 * On success it attaches `req.user = { id, email, role }` and calls next().
 * On failure it sends 401.
 */
function authenticate(req, res, next) {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided." });
  }

  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

/**
 * requireAdmin  – must be used AFTER `authenticate`.
 * Rejects the request with 403 if the authenticated user is not an admin.
 */
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}

module.exports = { authenticate, requireAdmin };
