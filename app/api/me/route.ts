import prisma from "@/lib/prisma";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

type UpdateMeBody = {
  departmentId?: unknown;
};

const USE_CLERK_DEPARTMENT_METADATA = process.env.USE_CLERK_DEPARTMENT_METADATA === "true";

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

type ClerkDepartment = {
  id: string | null;
  name: string | null;
};

function readMetadataString(
  record: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  if (!record) return null;
  return toOptionalString(record[key]);
}

async function getClerkDepartment(userId: string): Promise<ClerkDepartment> {
  const clerkUser = await clerkClient.users.getUser(userId);
  const departmentId =
    readMetadataString(clerkUser.publicMetadata, "departmentId") ??
    readMetadataString(clerkUser.unsafeMetadata, "departmentId");
  const departmentName =
    readMetadataString(clerkUser.publicMetadata, "departmentName") ??
    readMetadataString(clerkUser.unsafeMetadata, "departmentName");

  return { id: departmentId, name: departmentName };
}

async function parseJsonBody(request: Request): Promise<UpdateMeBody | null> {
  try {
    return (await request.json()) as UpdateMeBody;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    console.log(`[me] phase=start timestamp=${new Date().toISOString()}`);

    const { userId } = await auth();
    console.log(`[me] phase=auth_complete userId=${userId || "null"}`);

    // If the user is not logged in, return an unauthorized response
    if (!userId) {
      console.log(`[me] phase=auth_failed reason=no_user_id`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[me] phase=db_query_start userId=${userId}`);

    // Find user in DB
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: {
        userRoles: { include: { role: true } },
        userDepartments: { include: { department: true } },
      },
    });

    console.log(`[me] phase=db_query_complete userId=${userId} userFound=${Boolean(user)} userObject=${user ? JSON.stringify({ id: user.id, email: user.email }) : "null"}`);

    // If we can't find the user in the database, return a not found response
    if (!user) {
      console.log(`[me] phase=user_not_found userId=${userId} clerkUserId=${userId}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const clerkDepartment = USE_CLERK_DEPARTMENT_METADATA ? await getClerkDepartment(userId) : null;
    const needsOnboarding = USE_CLERK_DEPARTMENT_METADATA
      ? !clerkDepartment?.id && !clerkDepartment?.name
      : user.userDepartments.length === 0;
    console.log(
      `[me] phase=success userId=${userId} userName=${user.fullName} userEmail=${user.email} needsOnboarding=${needsOnboarding}`,
    );
    return NextResponse.json({
      ...user,
      needsOnboarding,
      ...(clerkDepartment ? { clerkDepartment } : {}),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(`[me] phase=error error_message=${errorMessage} error_type=${error?.constructor?.name || "unknown"}`);
    console.error(`[me] phase=error_detail stack=${errorStack}`);
    return NextResponse.json({ error: "Internal Server Error", details: errorMessage }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    console.log(`[me][PATCH] phase=start timestamp=${new Date().toISOString()}`);
    const { userId } = await auth();
    console.log(`[me][PATCH] phase=auth_complete userId=${userId || "null"}`);
    if (!userId) {
      console.log(`[me][PATCH] phase=auth_failed reason=no_user_id`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await parseJsonBody(req);
    if (!body) {
      console.log(`[me][PATCH] phase=invalid_body reason=parse_failed`);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const departmentId = toOptionalString(body.departmentId);
    if (!departmentId) {
      console.log(`[me][PATCH] phase=invalid_body reason=missing_department_id`);
      return NextResponse.json({ error: "departmentId is required" }, { status: 400 });
    }

    console.log(`[me][PATCH] phase=transaction_start departmentId=${departmentId}`);
    let resolvedDepartmentName: string | null = null;
    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { clerkUserId: userId },
        select: { id: true },
      });

      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      const department = await tx.department.findUnique({
        where: { id: departmentId },
        select: { id: true, name: true },
      });

      if (!department) {
        throw new Error("DEPARTMENT_NOT_FOUND");
      }

      resolvedDepartmentName = department.name;

      if (!USE_CLERK_DEPARTMENT_METADATA) {
        await tx.userDepartment.deleteMany({ where: { userId: user.id } });
        await tx.userDepartment.create({
          data: { userId: user.id, departmentId: department.id },
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          userRoles: { include: { role: true } },
          userDepartments: { include: { department: true } },
        },
      });
    });
    console.log(`[me][PATCH] phase=transaction_complete userId=${updated.id}`);

    const departmentName =
      resolvedDepartmentName ?? updated.userDepartments[0]?.department?.name ?? null;

    try {
      await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: {
          departmentId,
          departmentName,
        },
      });
      console.log(`[me][PATCH] phase=clerk_metadata_updated departmentId=${departmentId} departmentName=${departmentName ?? "null"}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[me][PATCH] phase=clerk_metadata_error message=${message}`);
      if (USE_CLERK_DEPARTMENT_METADATA) {
        throw error;
      }
    }

    const needsOnboarding = USE_CLERK_DEPARTMENT_METADATA
      ? false
      : updated.userDepartments.length === 0;
    return NextResponse.json({
      ...updated,
      needsOnboarding,
      clerkDepartment: {
        id: departmentId,
        name: departmentName,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[me][PATCH] phase=error message=${message}`);
    if (message.includes("USER_NOT_FOUND")) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (message.includes("DEPARTMENT_NOT_FOUND")) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update user department", details: message }, { status: 500 });
  }
}
