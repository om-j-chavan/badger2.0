import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { AccountManager, type Activity } from "@/components/accounts/account-manager";

export default async function AccountsPage() {
  const user = await requireUser();

  const [accounts, archivedAccounts, incomes, transfers] = await Promise.all([
    prisma.account.findMany({
      where: { userId: user.id, isArchived: false },
      orderBy: { createdAt: "asc" },
    }),
    prisma.account.findMany({
      where: { userId: user.id, isArchived: true },
      orderBy: { name: "asc" },
    }),
    prisma.income.findMany({
      where: { userId: user.id },
      include: { account: true },
      orderBy: { date: "desc" },
      take: 8,
    }),
    prisma.transfer.findMany({
      where: { userId: user.id },
      include: { fromAccount: true, toAccount: true },
      orderBy: { date: "desc" },
      take: 8,
    }),
  ]);

  const recent: Activity[] = [
    ...incomes.map((i) => ({
      id: i.id,
      kind: "income" as const,
      title: i.source,
      sub: i.account ? `into ${i.account.name}` : "no account",
      amount: toNumber(i.amount),
      signed: "in" as const,
      date: i.date.toISOString(),
    })),
    ...transfers.map((t) => ({
      id: t.id,
      kind: "transfer" as const,
      title: `${t.fromAccount.name} → ${t.toAccount.name}`,
      sub: t.isCardPayment ? "Card bill payment" : "Transfer",
      amount: toNumber(t.amount),
      signed: "move" as const,
      date: t.date.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts & wallets"
        description="Where your money lives. Add deposits, move money between accounts, and pay credit-card bills — balances stay accurate, with no double-counting."
      />
      <AccountManager
        accounts={accounts.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          currentBalance: toNumber(a.currentBalance),
          color: a.color,
        }))}
        archived={archivedAccounts.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          currentBalance: toNumber(a.currentBalance),
          color: a.color,
        }))}
        recent={recent}
        currency={user.currency}
      />
    </div>
  );
}
