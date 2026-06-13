import Link from "next/link";
import { Receipt } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { AddExpenseButton } from "@/components/expenses/expense-form";
import { ExpensesHeader } from "@/components/expenses/expenses-header";
import { ExpenseList, type ExpenseRow } from "@/components/expenses/expense-list";

const PAGE_SIZE = 50;

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireUser();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [categories, accounts, expenses, total] = await Promise.all([
    prisma.category.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.account.findMany({ where: { userId: user.id, isArchived: false }, orderBy: { name: "asc" } }),
    prisma.expense.findMany({
      where: { userId: user.id },
      include: { category: true, account: true },
      orderBy: { date: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.expense.count({ where: { userId: user.id } }),
  ]);

  const categoryProps = categories.map((c) => ({ id: c.id, name: c.name, color: c.color }));
  const accountProps = accounts.map((a) => ({ id: a.id, name: a.name }));
  const balanceAccounts = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    currentBalance: toNumber(a.currentBalance),
    color: a.color,
  }));
  const totalSpent = expenses.reduce((s, e) => s + toNumber(e.amount), 0);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const rows: ExpenseRow[] = expenses.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    amount: toNumber(e.amount),
    importance: e.importance,
    note: e.note,
    mood: e.mood,
    paymentMethod: e.paymentMethod,
    categoryId: e.categoryId,
    categoryName: e.category.name,
    categoryColor: e.category.color,
    accountId: e.accountId,
    accountName: e.account?.name ?? null,
  }));

  return (
    <div className="space-y-6">
      <ExpensesHeader
        count={total}
        totalSpent={totalSpent}
        currency={user.currency}
        categories={categoryProps}
        accounts={balanceAccounts}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses yet"
          description="Log your first expense to start seeing where your money goes."
          action={<AddExpenseButton categories={categoryProps} accounts={accountProps} label="Add your first expense" />}
        />
      ) : (
        <>
          <ExpenseList
            expenses={rows}
            categories={categoryProps}
            accounts={accountProps}
            currency={user.currency}
          />
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
                {page > 1 ? <Link href={`/expenses?page=${page - 1}`}>Previous</Link> : <span>Previous</span>}
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} asChild={page < totalPages}>
                {page < totalPages ? <Link href={`/expenses?page=${page + 1}`}>Next</Link> : <span>Next</span>}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
