import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { env, hasEmail, hasPush } from "@/lib/env";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsView } from "@/components/settings/settings-view";

export default async function SettingsPage() {
  const user = await requireUser();
  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Make Badger yours." />
      <SettingsView
        profile={{
          name: user.name,
          currency: user.currency,
          timezone: user.timezone,
          monthlyIncome: user.monthlyIncome ? toNumber(user.monthlyIncome) : null,
        }}
        categories={categories.map((c) => ({ id: c.id, name: c.name, color: c.color, isDefault: c.isDefault }))}
        notifications={{
          vapidPublicKey: env.push.publicKey,
          emailReminders: user.emailReminders,
          emailConfigured: hasEmail(),
          pushConfigured: hasPush(),
        }}
      />
    </div>
  );
}
