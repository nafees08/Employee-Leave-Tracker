// src/index.js
// Express application entry point.
// Wires middleware, routes, and starts the HTTP server.

const express = require("express");
const cors    = require("cors");
const morgan  = require("morgan");

const authRoutes  = require("./routes/auth");
const leaveRoutes = require("./routes/leaves");

const app  = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set when NODE_ENV is production.");
}

// ── Global Middleware ────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
}));

app.use(express.json());         // parse JSON request bodies
app.use(morgan("dev"));          // log requests to stdout

// ── Routes ───────────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.use("/api/auth",   authRoutes);
app.use("/api/leaves", leaveRoutes);

// ── Global Error Handler ─────────────────────────────────────────────────────
// Catches any error thrown (or passed via next(err)) in route handlers.
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error." });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Leave Tracker API running on http://localhost:${PORT}`);
});
