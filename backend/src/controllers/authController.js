// ──────────────────────────────────────────────────────────────
// Gula PMS — Authentication Controller
// Handles pharmacy registration and user login.
// Registration creates both a Pharmacy and its Admin User
// atomically using a Prisma transaction.
// ──────────────────────────────────────────────────────────────

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

// ─── Helper: Generate JWT ────────────────────────────────────
const generateToken = (user, pharmacy) => {
  return jwt.sign(
    {
      userId: user.id,
      pharmacyId: user.pharmacyId || user.pharmacy?.id,
      role: user.role,
      name: pharmacy?.name || user.pharmacy?.name,
      location: pharmacy?.location || user.pharmacy?.location,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

// ─── POST /api/auth/register ─────────────────────────────────
// Creates a new Pharmacy + Admin User in a single transaction.
// Request body: { pharmacyName, location, username, email, password }
// ──────────────────────────────────────────────────────────────
const registerPharmacy = async (req, res) => {
  try {
    const { pharmacyName, location, username, email, password } = req.body;

    // ── Validation ────────────────────────────────────────────
    if (!pharmacyName || !location || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: pharmacyName, location, username, email, password.",
      });
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // Password strength check
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
    }

    // ── Check for existing user ───────────────────────────────
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // ── Hash password ─────────────────────────────────────────
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ── Atomic transaction: Create Pharmacy + Admin User ──────
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the pharmacy
      const pharmacy = await tx.pharmacy.create({
        data: {
          name: pharmacyName,
          location: location,
        },
      });

      // 2. Create the admin user linked to the pharmacy
      const user = await tx.user.create({
        data: {
          username: username,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: "ADMIN",
          pharmacyId: pharmacy.id,
        },
      });

      return { pharmacy, user };
    });

    // ── Generate JWT ──────────────────────────────────────────
    const token = generateToken(result.user, result.pharmacy);

    // ── Response ──────────────────────────────────────────────
    return res.status(201).json({
      success: true,
      message: "Pharmacy registered successfully.",
      data: {
        token,
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          role: result.user.role,
          pharmacyId: result.pharmacy.id,
          name: result.pharmacy.name,
          location: result.pharmacy.location,
        },
        pharmacy: {
          id: result.pharmacy.id,
          name: result.pharmacy.name,
          location: result.pharmacy.location,
        },
      },
    });
  } catch (error) {
    console.error("[Auth] Registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during registration.",
    });
  }
};

// ─── POST /api/auth/login ────────────────────────────────────
// Authenticates a user with email and password.
// Request body: { email, password }
// ──────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ── Validation ────────────────────────────────────────────
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // ── Find user by email (include pharmacy data) ────────────
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        pharmacy: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // ── Compare password ──────────────────────────────────────
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // ── Generate JWT ──────────────────────────────────────────
    const token = generateToken(user, user.pharmacy);

    // ── Response ──────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          pharmacyId: user.pharmacyId,
          name: user.pharmacy?.name,
          location: user.pharmacy?.location,
        },
        pharmacy: user.pharmacy ? {
          id: user.pharmacy.id,
          name: user.pharmacy.name,
          location: user.pharmacy.location,
        } : null,
      },
    });
  } catch (error) {
    console.error("[Auth] Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during login.",
    });
  }
};

// ─── GET /api/auth/me ────────────────────────────────────────
// Returns the current authenticated user's profile.
// Requires the `protect` middleware.
// ──────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        pharmacyId: true,
        pharmacy: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        pharmacyId: user.pharmacyId,
        name: user.pharmacy?.name,
        location: user.pharmacy?.location,
        pharmacy: user.pharmacy,
      },
    });
  } catch (error) {
    console.error("[Auth] GetMe error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = { registerPharmacy, login, getMe };
