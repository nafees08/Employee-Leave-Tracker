// src/routes/auth.js
// POST /api/auth/register  – create a new employee account
// POST /api/auth/login     – returns a signed JWT

const express = require("express");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const db      = require("../db/database");
const { isValidEmail, normalizeEmail, normalizeText } = require("../utils/validation");

const router = express.Router();
const SECRET = process.env.JWT_SECRET || "super_secret_dev_key";
const TOKEN_TTL = "8h"; // token expires after 8 hours

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post("/register", (req, res) => {
  const { password, role = "employee" } = req.body;
  const name = normalizeText(req.body.name);
  const email = normalizeEmail(req.body.email);

  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required." });
  }

  if (name.length < 2) {
    return res.status(400).json({ error: "name must be at least 2 characters long." });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "A valid email address is required." });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "password must be at least 6 characters long." });
  }

  // Only allow 'employee' role via public registration (admins are seeded)
  const safeRole = role === "admin" ? "employee" : role;

  const hashed = bcrypt.hashSync(password, 10);

  try {
    const stmt = db.prepare(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)"
    );
    const result = stmt.run(name, email, hashed, safeRole);

    return res.status(201).json({ message: "User created.", userId: result.lastInsertRowid });
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      return res.status(409).json({ error: "Email already registered." });
    }
    throw err;
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/login", (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required." });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "A valid email address is required." });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const match = bcrypt.compareSync(password, user.password);
  if (!match) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  // Sign a JWT – never include the password in the payload!
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    SECRET,
    { expiresIn: TOKEN_TTL }
  );

  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

module.exports = router;
