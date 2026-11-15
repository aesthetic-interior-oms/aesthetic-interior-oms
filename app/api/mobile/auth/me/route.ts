import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireMobileAuth } from "@/lib/mobile-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireMobileAuth(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  // Record mobile activity timestamp
  const platformHeader = request.headers.get("x-platform");
  const appVersionHeader = request.headers.get("x-app-version");
  const deviceModelHeader = request.headers.get("x-device-model");

  prisma.user.update({
    where: { id: authResult.user.id },
    data: {
      lastMobileActiveAt: new Date(),
      ...(platformHeader ? { mobilePlatform: platformHeader.trim().toLowerCase() } : {}),
      ...(appVersionHeader ? { mobileAppVersion: appVersionHeader.trim() } : {}),
      ...(deviceModelHeader ? { mobileDeviceModel: deviceModelHeader.trim() } : {}),
    },
  }).catch((err) => {
    console.warn("[GET /api/mobile/auth/me] Could not update lastMobileActiveAt:", err);
  });

  return NextResponse.json({
    ok: true,
    user: authResult.user,
  });
}
