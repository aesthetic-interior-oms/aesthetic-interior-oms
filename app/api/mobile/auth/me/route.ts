import { NextResponse } from "next/server";
import { requireMobileAuth } from "@/lib/mobile-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireMobileAuth(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  return NextResponse.json({
    ok: true,
    user: authResult.user,
  });
}
