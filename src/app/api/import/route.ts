import { requireUserId } from "@/lib/auth";
import { applyImport, type BadgerExport } from "@/lib/services/data-transfer";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const limit = rateLimit(`import:${userId}`, { limit: 5, windowMs: 60_000 });
  if (!limit.success) {
    return new Response(JSON.stringify({ error: "Too many imports. Try again shortly." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  let data: BadgerExport;
  try {
    data = (await req.json()) as BadgerExport;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON file." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const summary = await applyImport(userId, data);
    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed.";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
