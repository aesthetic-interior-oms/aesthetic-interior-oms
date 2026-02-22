import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type RoleCheckSuccess = {
  ok: true;
  actorUserId: string;
  actorRoles: string[];
};

type RoleCheckFailure = {
  ok: false;
  response: NextResponse;
};

export type RoleCheckResult = RoleCheckSuccess | RoleCheckFailure;

export async function requireDatabaseRoles(allowedRoles: string[]): Promise<RoleCheckResult> {
  const { userId } = await auth();

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
      userRoles: {
        select: {
          role: {
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
  const hasAllowedRole = allowedRoles.some((role) => actorRoles.includes(role));

  if (!hasAllowedRole) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    actorUserId: actor.id,
    actorRoles,
  };
}
