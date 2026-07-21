import { PrismaClient } from "@prisma/client";
import path from "path";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Connect directly to the SQLite dev.db file in the backend directory
const dbPath = path.resolve(process.cwd(), "../backend/prisma/dev.db").replace(/\\/g, "/");

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: `file:${dbPath}`,
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
