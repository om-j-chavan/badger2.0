import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { AccountManager } from "@/components/accounts/account-manager";

export default async function AccountsPage() {
  const user = await requireUser();
  const accounts = await prisma.account.findMany({
    where: { userId: user.id, isArchived: false },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Accounts & wallets" description="Where your money lives. Expenses can draw from these to keep balances live." />
      <AccountManager
        accounts={accounts.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          currentBalance: toNumber(a.currentBalance),
          color: a.color,
        }))}
        currency={user.currency}
      />
    </div>
  );
}
