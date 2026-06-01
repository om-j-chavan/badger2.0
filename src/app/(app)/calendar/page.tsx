import { format } from "date-fns";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { monthRange } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarView } from "@/components/calendar/calendar-view";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const user = await requireUser();
  const { y, m } = await searchParams;
  const now = new Date();
  const year = Number(y) || now.getFullYear();
  const month = Number(m) || now.getMonth() + 1;
  const { start, end } = monthRange(year, month);

  const [expenses, categories, accounts] = await Promise.all([
    prisma.expense.findMany({
      where: { userId: user.id, date: { gte: start, lte: end } },
      include: { category: true },
      orderBy: { date: "asc" },
    }),
    prisma.category.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.account.findMany({ where: { userId: user.id, isArchived: false }, orderBy: { name: "asc" } }),
  ]);

  const expensesByDay: Record<string, ReturnType<typeof mapExpense>[]> = {};
  for (const e of expenses) {
    const key = format(e.date, "yyyy-MM-dd");
    (expensesByDay[key] ??= []).push(mapExpense(e));
  }

  function mapExpense(e: (typeof expenses)[number]) {
    return {
      id: e.id,
      amount: toNumber(e.amount),
      note: e.note,
      categoryName: e.category.name,
      categoryColor: e.category.color,
      importance: e.importance,
    };
  }

  const monthTotal = expenses.reduce((s, e) => s + toNumber(e.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Tap any day to see details or add an expense. Drag the coloured dots to move expenses between days."
      />
      <Card>
        <CardContent className="pt-5">
          <CalendarView
            year={year}
            month={month}
            expensesByDay={expensesByDay}
            categories={categories.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
            accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
            currency={user.currency}
          />
        </CardContent>
      </Card>
      <p className="text-center text-sm text-muted-foreground">
        {expenses.length} expenses this month · total {monthTotal.toLocaleString()}
      </p>
    </div>
  );
}
