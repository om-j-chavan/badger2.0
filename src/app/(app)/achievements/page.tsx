import * as Icons from "lucide-react";
import { Flame } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { levelForXp } from "@/lib/services/gamification";
import { BADGES, LEVELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const STREAK_LABELS: Record<string, string> = {
  daily_logging: "Daily logging",
  budget_adherence: "Budget adherence",
  savings: "Savings consistency",
};

export default async function AchievementsPage() {
  const user = await requireUser();
  const [gamification, earned, streaks] = await Promise.all([
    prisma.gamification.findUnique({ where: { userId: user.id } }),
    prisma.userBadge.findMany({ where: { userId: user.id }, include: { badge: true } }),
    prisma.streak.findMany({ where: { userId: user.id } }),
  ]);

  const level = levelForXp(gamification?.xp ?? 0);
  const earnedKeys = new Set(earned.map((e) => e.badge.key));

  return (
    <div className="space-y-6">
      <PageHeader title="Achievements" description="Little wins for staying on top of your money." />

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary/15 to-accent p-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Level {level.level}</p>
              <h2 className="text-3xl font-bold">{level.name}</h2>
            </div>
            <p className="text-lg font-semibold">{level.xp} XP</p>
          </div>
          {level.nextLevelXp != null && (
            <div className="mt-4">
              <Progress value={level.progressToNext} indicatorClassName="bg-primary" />
              <p className="mt-1 text-xs text-muted-foreground">
                {level.nextLevelXp - level.xp} XP to {level.nextLevelName}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Level ladder */}
      <div className="flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <Badge key={l.level} variant={l.level <= level.level ? "default" : "outline"} className="gap-1">
            {l.level <= level.level && "✓ "}{l.name}
          </Badge>
        ))}
      </div>

      {/* Streaks */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Flame className="h-4 w-4 text-warning" /> Streaks</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {["daily_logging", "budget_adherence", "savings"].map((kind) => {
            const s = streaks.find((x) => x.kind === kind);
            return (
              <div key={kind} className="rounded-xl bg-muted/40 p-4 text-center">
                <p className="text-3xl font-bold">{s?.current ?? 0}</p>
                <p className="text-xs text-muted-foreground">{STREAK_LABELS[kind]}</p>
                <p className="mt-1 text-xs text-muted-foreground">Best: {s?.longest ?? 0}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Badges */}
      <div>
        <h2 className="mb-3 font-semibold">Badges</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BADGES.map((b) => {
            const unlocked = earnedKeys.has(b.key);
            const Icon = (Icons[toPascal(b.icon) as keyof typeof Icons] as Icons.LucideIcon) ?? Icons.Award;
            return (
              <Card key={b.key} className={cn(!unlocked && "opacity-50")}>
                <CardContent className="flex items-center gap-3 p-4">
                  <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{unlocked ? b.description : "Locked"}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function toPascal(kebab: string): string {
  return kebab.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
}
