import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireMobileAuth,
  comparePassword,
  hashPassword,
} from "@/lib/mobile-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResult = await requireMobileAuth(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { user } = authResult;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { currentPassword, newPassword } = body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long" },
        { status: 400 },
      );
    }

    // Check if user already has a passwordHash in DB
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, passwordHash: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 },
      );
    }

    // If a passwordHash is set, verify the current password before changing
    if (dbUser.passwordHash) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required" },
          { status: 400 },
        );
      }
      const isCurrentValid = await comparePassword(currentPassword, dbUser.passwordHash);
      if (!isCurrentValid) {
        return NextResponse.json(
          { error: "Incorrect current password" },
          { status: 400 },
        );
      }
    }

    const newHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({
      ok: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("[POST /api/mobile/auth/change-password] Error:", error);
    return NextResponse.json(
      { error: "Internal server error updating password" },
      { status: 500 },
    );
  }
}
