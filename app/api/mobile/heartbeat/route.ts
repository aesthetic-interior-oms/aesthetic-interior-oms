import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireMobileAuth } from "@/lib/mobile-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResult = await requireMobileAuth(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { platform, appVersion, deviceModel } = (body || {}) as {
      platform?: string;
      appVersion?: string;
      deviceModel?: string;
    };

    const now = new Date();
    await prisma.user.update({
      where: { id: authResult.user.id },
      data: {
        lastMobileActiveAt: now,
        ...(platform && typeof platform === "string" ? { mobilePlatform: platform.trim().toLowerCase() } : {}),
        ...(appVersion && typeof appVersion === "string" ? { mobileAppVersion: appVersion.trim() } : {}),
        ...(deviceModel && typeof deviceModel === "string" ? { mobileDeviceModel: deviceModel.trim() } : {}),
      },
    });

    return NextResponse.json({
      ok: true,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[POST /api/mobile/heartbeat] Error:", error);
    return NextResponse.json(
      { error: "Failed to record heartbeat" },
      { status: 500 },
    );
  }
}
