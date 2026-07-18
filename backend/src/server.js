// ──────────────────────────────────────────────────────────────
// Gula PMS — Express Server Entry Point
// Configures middleware, mounts routes, and starts the server.
// ──────────────────────────────────────────────────────────────

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const medicineRoutes = require("./routes/medicineRoutes");
const saleRoutes = require("./routes/saleRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

// ─── Initialize Express ──────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ─────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow image loading from frontend
  })
);

// ─── CORS Configuration ─────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── Body Parsing ────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Request Logging ─────────────────────────────────────────
app.use(morgan("dev"));

// ─── Static Files (uploaded images) ──────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// ─── API Routes ──────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ─── Health Check ────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Gula PMS API is running.",
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found.`,
  });
});

// ─── Global Error Handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[Server Error]", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error.",
  });
});

// ─── Start Server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║   🏥  Gula PMS API Server               ║`);
  console.log(`  ║   📡  http://localhost:${PORT}              ║`);
  console.log(`  ║   🔧  Environment: ${process.env.NODE_ENV || "development"}        ║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);
});

module.exports = app;
