// ──────────────────────────────────────────────────────────────
// Gula PMS — Prisma Client Singleton
// Prevents multiple Prisma Client instances during hot-reload
// in development. In production, a single instance is used.
// ──────────────────────────────────────────────────────────────

const { PrismaClient } = require("@prisma/client");

/** @type {PrismaClient} */
let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  // In development, attach to globalThis to survive hot-reloads
  if (!globalThis.__prisma) {
    globalThis.__prisma = new PrismaClient({
      log: ["warn", "error"],
    });
  }
  prisma = globalThis.__prisma;
}

module.exports = prisma;
