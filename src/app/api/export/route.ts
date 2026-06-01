import * as XLSX from "xlsx";
import { requireUserId } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { gatherUserData, expensesToRows } from "@/lib/services/data-transfer";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const limit = rateLimit(`export:${userId}`, { limit: 10, windowMs: 60_000 });
  if (!limit.success) return new Response("Too many requests", { status: 429 });

  const format = new URL(req.url).searchParams.get("format") ?? "json";
  const data = await gatherUserData(userId);
  await audit(userId, "data.export", "User", userId, { format });

  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="badger-export-${stamp}.json"`,
      },
    });
  }

  const rows = expensesToRows(data.expenses as any[]);

  if (format === "csv") {
    const sheet = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(sheet);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="badger-expenses-${stamp}.csv"`,
      },
    });
  }

  if (format === "xlsx") {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Expenses");
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet((data.subscriptions as any[]).map((s) => ({
        Name: s.name,
        Cost: Number(s.cost),
        Frequency: s.frequency,
        Renewal: new Date(s.renewalDate).toISOString().slice(0, 10),
      }))),
      "Subscriptions",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet((data.loans as any[]).map((l) => ({
        Name: l.name,
        Principal: Number(l.principalAmount),
        Rate: Number(l.interestRate),
        EMI: Number(l.emiAmount),
        Remaining: Number(l.remainingPrincipal),
      }))),
      "Loans",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet((data.goals as any[]).map((g) => ({
        Name: g.name,
        Target: Number(g.targetAmount),
        Current: Number(g.currentAmount),
      }))),
      "Goals",
    );
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="badger-export-${stamp}.xlsx"`,
      },
    });
  }

  return new Response("Unsupported format", { status: 400 });
}
