import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  comparePassword,
  hashPassword,
  verifyWithClerk,
  findClerkUserIdByEmail,
  signMobileToken,
} from "@/lib/mobile-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 },
      );
    }

    const { email, password, platform, appVersion, deviceModel } = body as {
      email?: string;
      password?: string;
      platform?: string;
      appVersion?: string;
      deviceModel?: string;
    };

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 },
      );
    }

    const inputIdentifier = email.trim();
    const normalizedEmail = inputIdentifier.toLowerCase();

    // 1. Find user in PostgreSQL database by email, phone, or fullName
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: normalizedEmail, mode: "insensitive" } },
          { phone: { equals: inputIdentifier } },
          { fullName: { equals: inputIdentifier, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        clerkUserId: true,
        passwordHash: true,
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
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Your account is deactivated. Please contact an administrator." },
        { status: 403 },
      );
    }

    let isAuthenticated = false;

    // 2. First check: PostgreSQL passwordHash (Local DB auth)
    if (user.passwordHash) {
      isAuthenticated = await comparePassword(password, user.passwordHash);
    }

    // 3. Second check (Lazy Migration / Fallback): If local check failed or passwordHash is null,
    // verify with Clerk and migrate the hash into PostgreSQL
    if (!isAuthenticated) {
      let clerkId = user.clerkUserId;
      if (!clerkId) {
        clerkId = await findClerkUserIdByEmail(normalizedEmail);
      }

      if (clerkId) {
        const clerkVerified = await verifyWithClerk(clerkId, password);
        if (clerkVerified) {
          isAuthenticated = true;
          // Hash with bcrypt and save to PostgreSQL so next logins are 100% local!
          const newHash = await hashPassword(password);
          await prisma.user.update({
            where: { id: user.id },
            data: {
              passwordHash: newHash,
              ...(!user.clerkUserId ? { clerkUserId: clerkId } : {}),
            },
          });
        }
      }
    }

    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Update mobile session activity
    const now = new Date();
    const userAgent = request.headers.get("user-agent") || "";
    const effectivePlatform =
      platform && typeof platform === "string" && platform.trim()
        ? platform.trim().toLowerCase()
        : userAgent.toLowerCase().includes("android") || userAgent.toLowerCase().includes("okhttp")
        ? "android"
        : userAgent.toLowerCase().includes("iphone") || userAgent.toLowerCase().includes("ios")
        ? "ios"
        : "mobile";

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastMobileLoginAt: now,
        lastMobileActiveAt: now,
        mobilePlatform: effectivePlatform,
        ...(appVersion && typeof appVersion === "string" ? { mobileAppVersion: appVersion.trim() } : {}),
        ...(deviceModel && typeof deviceModel === "string" ? { mobileDeviceModel: deviceModel.trim() } : {}),
      },
    }).catch((err) => {
      console.warn("[POST /api/mobile/auth/login] Could not update mobile activity tracking:", err);
    });

    // 4. Generate mobile JWT
    const token = signMobileToken({
      userId: user.id,
      email: user.email,
    });

    const roles = user.userRoles.map((r) => r.role.name);
    const departments = user.userDepartments.map((d) => d.department.name);

    return NextResponse.json({
      ok: true,
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        roles,
        departments,
      },
    });
  } catch (error) {
    console.error("[POST /api/mobile/auth/login] Error:", error);
    return NextResponse.json(
      { error: "Internal server error during login" },
      { status: 500 },
    );
  }
}
