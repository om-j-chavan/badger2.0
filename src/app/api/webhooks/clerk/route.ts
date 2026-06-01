import { Webhook } from "svix";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

type ClerkEvent = {
  type: string;
  data: {
    id: string;
    email_addresses?: { email_address: string; id: string }[];
    primary_email_address_id?: string;
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;
  };
};

/**
 * Clerk -> Badger user sync. Verifies the Svix signature, then upserts the
 * local User record. User provisioning also happens lazily on first request,
 * so this webhook is an optimisation / keep-in-sync mechanism, not a hard
 * dependency.
 */
export async function POST(req: Request) {
  if (!env.clerk.webhookSecret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const payload = await req.text();
  const h = await headers();
  const svixId = h.get("svix-id");
  const svixTimestamp = h.get("svix-timestamp");
  const svixSignature = h.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  let event: ClerkEvent;
  try {
    const wh = new Webhook(env.clerk.webhookSecret);
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;
  } catch (err) {
    console.error("[clerk webhook] verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const { type, data } = event;

  if (type === "user.created" || type === "user.updated") {
    const primaryEmail =
      data.email_addresses?.find((e) => e.id === data.primary_email_address_id)?.email_address ??
      data.email_addresses?.[0]?.email_address ??
      `${data.id}@placeholder.badger`;
    const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;

    await prisma.user.upsert({
      where: { clerkId: data.id },
      update: { email: primaryEmail, name, avatar: data.image_url ?? null },
      create: {
        clerkId: data.id,
        email: primaryEmail,
        name,
        avatar: data.image_url ?? null,
        currency: env.app.defaultCurrency,
        categories: { create: DEFAULT_CATEGORIES.map((c) => ({ ...c, isDefault: true })) },
        gamification: { create: {} },
      },
    });
  }

  if (type === "user.deleted") {
    await prisma.user.deleteMany({ where: { clerkId: data.id } });
  }

  return new Response("ok", { status: 200 });
}
