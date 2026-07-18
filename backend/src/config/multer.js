// ──────────────────────────────────────────────────────────────
// Gula PMS — Multer Configuration
// Handles image uploads for medicine photos.
// Stores files in /uploads with unique filenames.
// ──────────────────────────────────────────────────────────────

const multer = require("multer");
const path = require("path");

// ─── Storage Configuration ───────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "..", "uploads"));
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random.ext
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `medicine-${uniqueSuffix}${ext}`);
  },
});

// ─── File Filter (images only) ───────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, PNG, GIF, WebP) are allowed."), false);
  }
};

// ─── Export configured Multer instance ───────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

module.exports = upload;
