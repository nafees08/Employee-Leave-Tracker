// src/routes/leaves.js
// Full CRUD for leave requests.
// All routes require a valid JWT (via `authenticate` middleware).

const express      = require("express");
const db           = require("../db/database");
const { authenticate, requireAdmin } = require("../middleware/auth");
const {
  LEAVE_TYPES,
  compareDates,
  isValidDate,
  normalizeText,
} = require("../utils/validation");

const router = express.Router();

// All routes below are protected
router.use(authenticate);

// ── GET /api/leaves ──────────────────────────────────────────────────────────
// Admin  → sees ALL leave requests with employee names.
// Employee → sees only THEIR OWN leave requests.
router.get("/", (req, res) => {
  let rows;

  if (req.user.role === "admin") {
    rows = db.prepare(`
      SELECT l.*, u.name AS employee_name, u.email AS employee_email
      FROM leaves l
      JOIN users u ON u.id = l.user_id
      ORDER BY l.created_at DESC
    `).all();
  } else {
    rows = db.prepare(`
      SELECT l.*, u.name AS employee_name, u.email AS employee_email
      FROM leaves l
      JOIN users u ON u.id = l.user_id
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
    `).all(req.user.id);
  }

  return res.json(rows);
});

// ── GET /api/leaves/:id ──────────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  const leave = db.prepare(`
    SELECT l.*, u.name AS employee_name
    FROM leaves l JOIN users u ON u.id = l.user_id
    WHERE l.id = ?
  `).get(req.params.id);

  if (!leave) return res.status(404).json({ error: "Leave request not found." });

  // Employees can only see their own
  if (req.user.role !== "admin" && leave.user_id !== req.user.id) {
    return res.status(403).json({ error: "Access denied." });
  }

  return res.json(leave);
});

// ── POST /api/leaves ─────────────────────────────────────────────────────────
// Any authenticated user can create a leave request for themselves.
router.post("/", (req, res) => {
  const { type, start_date, end_date } = req.body;
  const reason = normalizeText(req.body.reason);

  if (!type || !start_date || !end_date) {
    return res.status(400).json({ error: "type, start_date, and end_date are required." });
  }

  if (!LEAVE_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${LEAVE_TYPES.join(", ")}` });
  }

  if (!isValidDate(start_date) || !isValidDate(end_date)) {
    return res.status(400).json({ error: "start_date and end_date must use YYYY-MM-DD format." });
  }

  if (!compareDates(start_date, end_date)) {
    return res.status(400).json({ error: "end_date cannot be before start_date." });
  }

  if (reason.length > 500) {
    return res.status(400).json({ error: "reason must be 500 characters or fewer." });
  }

  const result = db.prepare(`
    INSERT INTO leaves (user_id, type, start_date, end_date, reason)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.user.id, type, start_date, end_date, reason || null);

  const created = db.prepare("SELECT * FROM leaves WHERE id = ?").get(result.lastInsertRowid);
  return res.status(201).json(created);
});

// ── PATCH /api/leaves/:id/status ────────────────────────────────────────────
// Admin-only: approve or reject a pending leave request.
router.patch("/:id/status", requireAdmin, (req, res) => {
  const { status } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: `status must be 'approved' or 'rejected'.` });
  }

  const leave = db.prepare("SELECT * FROM leaves WHERE id = ?").get(req.params.id);
  if (!leave) return res.status(404).json({ error: "Leave request not found." });
  if (leave.status !== "pending") {
    return res.status(409).json({ error: "Only pending requests can be updated." });
  }

  db.prepare(`
    UPDATE leaves SET status = ?, updated_at = datetime('now') WHERE id = ?
  `).run(status, req.params.id);

  const updated = db.prepare("SELECT * FROM leaves WHERE id = ?").get(req.params.id);
  return res.json(updated);
});

// ── DELETE /api/leaves/:id ───────────────────────────────────────────────────
// An employee can delete their own PENDING request; admin can delete any.
router.delete("/:id", (req, res) => {
  const leave = db.prepare("SELECT * FROM leaves WHERE id = ?").get(req.params.id);
  if (!leave) return res.status(404).json({ error: "Leave request not found." });

  const isOwner = leave.user_id === req.user.id;
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) return res.status(403).json({ error: "Access denied." });
  if (isOwner && leave.status !== "pending") {
    return res.status(409).json({ error: "Only pending requests can be withdrawn." });
  }

  db.prepare("DELETE FROM leaves WHERE id = ?").run(req.params.id);
  return res.json({ message: "Leave request deleted." });
});

// ── GET /api/leaves/users/all ────────────────────────────────────────────────
// Admin-only: list all employees (useful for admin dashboard filters)
router.get("/users/all", requireAdmin, (req, res) => {
  const users = db.prepare(
    "SELECT id, name, email, role FROM users WHERE role != ? ORDER BY name"
  ).all("admin");
  return res.json(users);
});

module.exports = router;
