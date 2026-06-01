import { requireUser } from "@/lib/auth";
import { generateDueRecurringExpenses } from "@/lib/services/recurring";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  // Materialise any recurring expenses that have come due since last visit.
  // Best-effort: never block rendering on it.
  try {
    await generateDueRecurringExpenses(user.id);
  } catch (err) {
    console.error("[recurring] generation failed", err);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar displayName={user.name ?? user.username ?? undefined} />
        <main className="flex-1 px-4 pb-24 pt-5 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-6xl animate-fade-in">{children}</div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
