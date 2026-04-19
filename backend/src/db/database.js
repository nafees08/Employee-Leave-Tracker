// src/db/database.js
// Initializes the SQLite database, creates all tables, and seeds demo users.

const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../../data/leave_tracker.db");

// Ensure the data directory exists at runtime (Docker volume or local)
const fs = require("fs");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");

// ── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL,
    email     TEXT    NOT NULL UNIQUE,
    password  TEXT    NOT NULL,
    role      TEXT    NOT NULL DEFAULT 'employee'   -- 'employee' | 'admin'
  );

  CREATE TABLE IF NOT EXISTS leaves (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    type        TEXT    NOT NULL,                   -- 'annual' | 'sick' | 'unpaid'
    start_date  TEXT    NOT NULL,
    end_date    TEXT    NOT NULL,
    reason      TEXT,
    status      TEXT    NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Seed demo data (idempotent) ──────────────────────────────────────────────

function seedUsers() {
  const existing = db.prepare("SELECT COUNT(*) as c FROM users").get();
  if (existing.c > 0) return; // already seeded

  const insert = db.prepare(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)"
  );

  const users = [
    { name: "Admin User",   email: "admin@company.com",   role: "admin" },
    { name: "Alice Rahman", email: "alice@company.com",   role: "employee" },
    { name: "Bob Hossain",  email: "bob@company.com",     role: "employee" },
  ];

  for (const u of users) {
    const hash = bcrypt.hashSync("password123", 10);
    insert.run(u.name, u.email, hash, u.role);
  }

  // Seed a couple of sample leave requests
  const now = new Date().toISOString().split("T")[0];
  db.prepare(`
    INSERT INTO leaves (user_id, type, start_date, end_date, reason, status)
    VALUES
      (2, 'annual', '2025-08-01', '2025-08-05', 'Family vacation', 'pending'),
      (3, 'sick',   '2025-07-20', '2025-07-21', 'Flu',            'approved')
  `).run();

  console.log("✅ Database seeded with demo users and leaves.");
}

seedUsers();

module.exports = db;
