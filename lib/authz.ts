import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";

type RoleCheckSuccess = {
  ok: true;
  actorUserId: string;
  clerkUserId: string;
  actorRoles: string[];
  actor: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    clerkUserId: string | null;
    userDepartments: string[];
  };
};

type RoleCheckFailure = {
  ok: false;
  response: NextResponse;
};

export type RoleCheckResult = RoleCheckSuccess | RoleCheckFailure;

export async function requireDatabaseRoles(
  allowedRoles: string[] = [],
  request?: Request,
): Promise<RoleCheckResult> {
  // ── 1. Check for Mobile App JWT Bearer Token ──────────────────────────────
  let token: string | null = null;
  if (request) {
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      token = authHeader.trim().split(" ")[1];
    }
  } else {
    try {
      const headerList = await headers();
      const authHeader =
        headerList.get("authorization") ||
        headerList.get("Authorization");
      if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
        token = authHeader.trim().split(" ")[1];
      }
    } catch {
      // In case headers() is called in a non-request context
    }
  }

  if (token) {
    const payload = verifyMobileToken(token);
    if (payload?.userId) {
      const actor = await prisma.user.findUnique({
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

      if (!actor) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: "Forbidden: no linked local user account" },
            { status: 403 },
          ),
        };
      }

      if (!actor.isActive) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: "Forbidden: Account is deactivated" },
            { status: 403 },
          ),
        };
      }

      const actorRoles = actor.userRoles.map((item) => item.role.name);
      const normalizedActorRoles = actorRoles.map((role) =>
        role.trim().toLowerCase(),
      );
      const actorDepartments = (actor.userDepartments ?? []).map((item) =>
        item.department.name.trim().toLowerCase(),
      );
      const isDepartmentAdmin = actorDepartments.includes("admin");

      if (allowedRoles.length > 0) {
        const normalizedAllowedRoles = allowedRoles.map((role) =>
          role.trim().toLowerCase(),
        );
        const hasAllowedRole =
          normalizedAllowedRoles.some((role) =>
            normalizedActorRoles.includes(role),
          ) || (normalizedAllowedRoles.includes("admin") && isDepartmentAdmin);

        if (!hasAllowedRole) {
          return {
            ok: false,
            response: NextResponse.json(
              { error: "Forbidden" },
              { status: 403 },
            ),
          };
        }
      }

      return {
        ok: true,
        actorUserId: actor.id,
        clerkUserId: actor.clerkUserId ?? "",
        actorRoles,
        actor: {
          id: actor.id,
          fullName: actor.fullName,
          email: actor.email,
          phone: actor.phone,
          clerkUserId: actor.clerkUserId,
          userDepartments: (actor.userDepartments ?? []).map(
            (item) => item.department.name,
          ),
        },
      };
    }
  }

  // ── 2. Fall back to Clerk Session (Web CRM) ───────────────────────────────
  let userId: string | null = null;
  try {
    const clerkAuth = await auth();
    userId = clerkAuth.userId;
  } catch {}

  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const actor = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      clerkUserId: true,
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

  if (!actor) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden: no linked local user account" },
        { status: 403 },
      ),
    };
  }

  const actorRoles = actor.userRoles.map((item) => item.role.name);
  const normalizedActorRoles = actorRoles.map((role) => role.trim().toLowerCase());
  const actorDepartments = (actor.userDepartments ?? []).map((item) =>
    item.department.name.trim().toLowerCase(),
  );
  const isDepartmentAdmin = actorDepartments.includes("admin");

  // If allowedRoles is specified (not empty), check if user has one of those roles
  if (allowedRoles.length > 0) {
    const normalizedAllowedRoles = allowedRoles.map((role) => role.trim().toLowerCase());
    const hasAllowedRole =
      normalizedAllowedRoles.some((role) => normalizedActorRoles.includes(role)) ||
      (normalizedAllowedRoles.includes("admin") && isDepartmentAdmin);

    if (!hasAllowedRole) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }
  }

  return {
    ok: true,
    actorUserId: actor.id,
    clerkUserId: userId,
    actorRoles,
    actor: {
      id: actor.id,
      fullName: actor.fullName,
      email: actor.email,
      phone: actor.phone,
      clerkUserId: actor.clerkUserId,
      userDepartments: (actor.userDepartments ?? []).map((item) => item.department.name),
    },
  };
}
