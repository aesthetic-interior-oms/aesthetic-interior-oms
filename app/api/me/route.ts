import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await auth();
    console.log(`[me] phase=request_received userId=${userId}`);

    // If the user is not logged in, return an unauthorized response
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user in DB
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: {
        userRoles: { include: { role: true } },
        userDepartments: { include: { department: true } },
      },
    });

    console.log(`[me] phase=user_fetched userId=${userId} userFound=${Boolean(user)}`);

    // If we can't find the user in the database, return a not found response
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
