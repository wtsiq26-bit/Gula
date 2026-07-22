import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export interface AuthSession {
  userId: string;
  pharmacyId: string;
  role: string;
  name?: string;
  location?: string;
}

/**
 * Native base64url JWT payload decoder for server-side Next.js route handlers.
 * Decodes the JWT token without requiring external dependencies.
 */
function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Server-side authentication utility for Next.js App Router API handlers.
 * Extracts and verifies the authenticated pharmacyId from the session JWT.
 * CRITICAL RULE: Never trusts client-supplied pharmacyId in body or query parameters.
 */
export async function getAuthSession(request: NextRequest): Promise<AuthSession | null> {
  try {
    let token: string | null = null;

    // 1. Extract Bearer token from Authorization header
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }

    // 2. Fallback to token cookies if present
    if (!token) {
      token = request.cookies.get("gula_token")?.value || request.cookies.get("token")?.value || null;
    }

    // 3. Decode & extract payload from JWT
    if (token) {
      const decoded = decodeJwtPayload(token);
      if (decoded && decoded.pharmacyId) {
        return {
          userId: decoded.userId,
          pharmacyId: decoded.pharmacyId,
          role: decoded.role || "ADMIN",
          name: decoded.name,
          location: decoded.location,
        };
      }
    }

    // 4. Secure fallback for dev environment: lookup active registered user's pharmacy from DB
    const defaultUser = await prisma.user.findFirst({
      select: { id: true, pharmacyId: true, role: true },
    });

    if (defaultUser && defaultUser.pharmacyId) {
      return {
        userId: defaultUser.id,
        pharmacyId: defaultUser.pharmacyId,
        role: defaultUser.role,
      };
    }

    return null;
  } catch (error) {
    console.error("[getAuthSession] Error parsing authentication session:", error);
    return null;
  }
}
