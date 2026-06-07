import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAiProvider } from "@/lib/env";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { AssistantChat } from "@/components/assistant/chat";

export default async function AssistantPage() {
  const user = await requireUser();
  const recent = await prisma.aiMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const initial = recent
    .reverse()
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  return (
    <div className="space-y-3">
      <PageHeader
        title="Badger AI"
        description="Your money companion — ask, add, search and navigate."
        action={
          <Badge variant={hasAiProvider() ? "success" : "secondary"}>
            {hasAiProvider() ? "AI connected" : "Smart fallback mode"}
          </Badge>
        }
      />
      <AssistantChat initial={initial} aiAvailable={hasAiProvider()} />
    </div>
  );
}
