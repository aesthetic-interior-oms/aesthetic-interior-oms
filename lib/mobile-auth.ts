import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";

const JWT_SECRET =
  process.env.MOBILE_JWT_SECRET ||
  process.env.CLERK_SECRET_KEY ||
  "aesthetic-crm-mobile-jwt-secret-key-2026";

export interface MobileJwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedMobileUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  clerkUserId: string | null;
  isActive: boolean;
  roles: string[];
  departments: string[];
}

export type MobileAuthResult =
  | {
      ok: true;
      user: AuthenticatedMobileUser;
    }
  | {
      ok: false;
      response: NextResponse;
    };

/**
 * Hash a plain text password with bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compare plain text password against a bcrypt hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/**
 * Verify a user's password using Clerk Backend API.
 */
export async function verifyWithClerk(
  clerkUserId: string,
  password: string,
): Promise<boolean> {
  try {
    const client = await clerkClient();
    const result = await client.users.verifyPassword({
      userId: clerkUserId,
      password,
    });
    return Boolean(result && (result as { verified?: boolean }).verified);
  } catch (error) {
    console.error("[mobile-auth] Clerk password verification error:", error);
    return false;
  }
}

/**
 * Find a Clerk user ID by email if missing locally.
 */
export async function findClerkUserIdByEmail(email: string): Promise<string | null> {
  try {
    const client = await clerkClient();
    const list = await client.users.getUserList({ emailAddress: [email] });
    const users = Array.isArray(list) ? list : (list as { data?: unknown[] }).data ?? [];
    const first = users[0] as { id?: string } | undefined;
    return first?.id ?? null;
  } catch (error) {
    console.error("[mobile-auth] Failed to lookup Clerk user by email:", error);
    return null;
  }
}

/**
 * Sign a mobile JWT token with a 30-day default expiration.
 */
export function signMobileToken(
  payload: { userId: string; email: string },
  expiresIn: jwt.SignOptions["expiresIn"] = "30d",
): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Verify and decode a mobile JWT token.
 */
export function verifyMobileToken(token: string): MobileJwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as MobileJwtPayload;
  } catch {
    return null;
  }
}

/**
 * Extract bearer token from Request Authorization header.
 */
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader) return null;
  const parts = authHeader.trim().split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
    return parts[1];
  }
  return null;
}

/**
 * Authenticate incoming mobile API requests using Bearer JWT.
 * Can also enforce role checks if allowedRoles is provided.
 */
export async function requireMobileAuth(
  request: Request,
  allowedRoles: string[] = [],
): Promise<MobileAuthResult> {
  const token = extractBearerToken(request);
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized: Missing Bearer token" },
        { status: 401 },
      ),
    };
  }

  const payload = verifyMobileToken(token);
  if (!payload || !payload.userId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized: Invalid or expired token" },
        { status: 401 },
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      clerkUserId: true,
      isActive: true,
      userRoles: {
        select: {
          role: {
            select: { name: true },
          },
        },
      },
      userDepartments: {
        select: {
          department: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized: User no longer exists" },
        { status: 401 },
      ),
    };
  }

  if (!user.isActive) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden: Account is deactivated" },
        { status: 403 },
      ),
    };
  }

  const roles = user.userRoles.map((r) => r.role.name);
  const departments = user.userDepartments.map((d) => d.department.name);

  if (allowedRoles.length > 0) {
    const normalizedAllowed = allowedRoles.map((r) => r.trim().toLowerCase());
    const normalizedUserRoles = roles.map((r) => r.trim().toLowerCase());
    const isDeptAdmin = departments.map((d) => d.trim().toLowerCase()).includes("admin");

    const hasRole =
      normalizedAllowed.some((r) => normalizedUserRoles.includes(r)) ||
      (normalizedAllowed.includes("admin") && isDeptAdmin);

    if (!hasRole) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 }),
      };
    }
  }

  return {
    ok: true,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      clerkUserId: user.clerkUserId,
      isActive: user.isActive,
      roles,
      departments,
    },
  };
}
