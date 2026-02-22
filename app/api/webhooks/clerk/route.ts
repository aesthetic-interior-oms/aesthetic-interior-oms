import { NextResponse } from "next/server";
import { Webhook } from "svix";
import prisma from "@/lib/prisma";

type ClerkEmailAddress = {
  id: string;
  email_address: string;
};

type ClerkPhoneNumber = {
  phone_number: string;
};

type ClerkUserData = {
  id?: string;
  email_addresses?: ClerkEmailAddress[];
  first_name?: string | null;
  last_name?: string | null;
  phone_numbers?: ClerkPhoneNumber[];
  primary_email_address_id?: string | null;
};

type ClerkWebhookEvent = {
  type: string;
  data: ClerkUserData;
};

export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Missing CLERK_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook secret is not configured" }, { status: 500 });
  }

  const payload = await req.text();
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 });
  }

  const wh = new Webhook(webhookSecret);

  let event: ClerkWebhookEvent;

  try {
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error("Failed to verify Clerk webhook:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const {
      id,
      email_addresses,
      first_name,
      last_name,
      phone_numbers,
      primary_email_address_id,
    } = event.data;

    const primaryEmail =
      email_addresses?.find((email) => email.id === primary_email_address_id)?.email_address ??
      email_addresses?.[0]?.email_address;

    if (!id || !primaryEmail) {
      return NextResponse.json({ error: "Missing required user data in webhook payload" }, { status: 400 });
    }

    const fullName = [first_name, last_name].filter(Boolean).join(" ").trim() || "Unknown User";
    const phone = phone_numbers?.[0]?.phone_number ?? "";

    await prisma.user.upsert({
      where: { clerkUserId: id },
      update: {
        fullName,
        email: primaryEmail,
        phone,
      },
      create: {
        clerkUserId: id,
        fullName,
        email: primaryEmail,
        phone,
      },
    });
  }

  if (event.type === "user.deleted") {
    const clerkUserId = event.data?.id as string | undefined;
    if (clerkUserId) {
      await prisma.user.updateMany({
        where: { clerkUserId },
        data: { clerkUserId: null },
      });
    }
  }

  return NextResponse.json({ success: true });
}
