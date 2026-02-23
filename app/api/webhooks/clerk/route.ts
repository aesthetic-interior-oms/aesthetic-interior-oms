import { NextResponse } from "next/server";
import { Webhook } from "svix";
import prisma from "@/lib/prisma";

type ClerkEmailAddress = {
  id: string;
  email_address: string;
};

type ClerkPhoneNumber = {
  phone_number: string;z
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
  const logPrefix = "[clerk-webhook]";
  console.log(`${logPrefix} phase=request_received method=${req.method}`);

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error(`${logPrefix} phase=config_error missing=CLERK_WEBHOOK_SECRET`);
    return NextResponse.json({ error: "Webhook secret is not configured" }, { status: 500 });
  }

  const payload = await req.text();
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  console.log(
    `${logPrefix} phase=request_parsed payload_bytes=${payload.length} svix_id_present=${Boolean(
      svixId,
    )} svix_timestamp_present=${Boolean(svixTimestamp)} svix_signature_present=${Boolean(svixSignature)}`,
  );

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error(`${logPrefix} phase=header_validation status=failed reason=missing_svix_headers`);
    return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 });
  }

  const wh = new Webhook(webhookSecret);
  console.log(`${logPrefix} phase=verify_started svix_id=${svixId} svix_timestamp=${svixTimestamp}`);

  let event: ClerkWebhookEvent;

  try {
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
    console.log(`${logPrefix} phase=verify_success type=${event.type}`);
  } catch (err) {
    console.error(`${logPrefix} phase=verify_failed`, err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    console.log(`${logPrefix} phase=handle_user_upsert type=${event.type}`);
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

    if (!id) {
      console.error(
        `${logPrefix} phase=user_payload_validation status=failed has_id=${Boolean(id)}`,
      );
      return NextResponse.json({ error: "Missing required user data in webhook payload" }, { status: 400 });
    }

    const fullName = [first_name, last_name].filter(Boolean).join(" ").trim() || "Unknown User";
    const phone = phone_numbers?.[0]?.phone_number ?? "";
    const resolvedEmail = primaryEmail ?? `${id}@clerk.local`;

    if (!primaryEmail) {
      console.warn(
        `${logPrefix} phase=user_payload_warning reason=missing_email fallback_email=${resolvedEmail}`,
      );
    }
    console.log(
      `${logPrefix} phase=user_payload_normalized clerk_user_id=${id} email=${resolvedEmail} full_name="${fullName}" phone_present=${Boolean(
        phone,
      )}`,
    );

    await prisma.user.upsert({
      where: { clerkUserId: id },
      update: {
        fullName,
        email: resolvedEmail,
        phone,
      },
      create: {
        clerkUserId: id,
        fullName,
        email: resolvedEmail,
        phone,
      },
    });
    console.log(`${logPrefix} phase=user_upsert_success clerk_user_id=${id}`);
  }

  if (event.type === "user.deleted") {
    console.log(`${logPrefix} phase=handle_user_deleted`);
    const clerkUserId = event.data?.id as string | undefined;
    if (clerkUserId) {
      const result = await prisma.user.updateMany({
        where: { clerkUserId },
        data: { clerkUserId: null },
      });
      console.log(
        `${logPrefix} phase=user_deleted_db_update clerk_user_id=${clerkUserId} rows_updated=${result.count}`,
      );
    } else {
      console.error(`${logPrefix} phase=user_deleted_validation status=failed reason=missing_id`);
    }
  }

  if (
    event.type !== "user.created" &&
    event.type !== "user.updated" &&
    event.type !== "user.deleted"
  ) {
    console.log(`${logPrefix} phase=event_ignored type=${event.type}`);
  }

  console.log(`${logPrefix} phase=complete status=success type=${event.type}`);
  return NextResponse.json({ success: true });
}
