"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, differenceInMonths } from "date-fns";
import { Target, Plus, Trash2, PiggyBank } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useAction } from "@/hooks/use-action";
import { formatCurrency } from "@/lib/currency";
import { createGoal, deleteGoal, contributeToGoal } from "@/app/actions/goal";

export interface GoalView {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  status: string;
  color: string;
}

export function GoalManager({ goals, currency }: { goals: GoalView[]; currency: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);

  React.useEffect(() => {
    if (searchParams.get("new") === "1") setAddOpen(true);
  }, [searchParams]);

  function closeAdd(v: boolean) {
    setAddOpen(v);
    if (!v && searchParams.get("new") === "1") router.replace("/goals");
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> New goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Saving for an emergency fund, a trip, or a new gaming PC? Set a goal and watch it grow."
          action={<Button onClick={() => setAddOpen(true)}>Create a goal</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} currency={currency} />
          ))}
        </div>
      )}

      <AddGoalDialog open={addOpen} onOpenChange={closeAdd} />
    </div>
  );
}

function GoalCard({ goal, currency }: { goal: GoalView; currency: string }) {
  const { run, pending } = useAction();
  const [contribOpen, setContribOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");

  const progress = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const achieved = goal.status === "ACHIEVED" || remaining <= 0;

  let estimate: string | null = null;
  if (!achieved && goal.targetDate) {
    const months = Math.max(1, differenceInMonths(new Date(goal.targetDate), new Date()));
    estimate = `${formatCurrency(remaining / months, currency)}/mo to reach by ${format(new Date(goal.targetDate), "MMM yyyy")}`;
  }

  async function contribute(e: React.FormEvent) {
    e.preventDefault();
    await run(() => contributeToGoal({ goalId: goal.id, amount: Number(amount) }), {
      successMessage: "Added to your goal!",
      onSuccess: () => {
        setContribOpen(false);
        setAmount("");
      },
    });
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${goal.color}22`, color: goal.color }}>
              <Target className="h-4 w-4" />
            </span>
            <div>
              <p className="font-semibold">{goal.name}</p>
              {achieved && <Badge variant="success">Achieved 🎉</Badge>}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => run(() => deleteGoal(goal.id), { successMessage: "Goal removed" })}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-sm">
            <span className="font-bold">{formatCurrency(goal.currentAmount, currency)}</span>
            <span className="text-muted-foreground">{formatCurrency(goal.targetAmount, currency)}</span>
          </div>
          <Progress value={progress} className="mt-1.5" indicatorClassName="bg-primary" />
          <p className="mt-1 text-xs text-muted-foreground">{Math.round(progress)}% · {formatCurrency(remaining, currency)} to go</p>
          {estimate && <p className="mt-1 text-xs text-primary">{estimate}</p>}
        </div>

        {!achieved && (
          <Button size="sm" variant="outline" className="mt-4 w-full" onClick={() => setContribOpen(true)}>
            <PiggyBank className="h-4 w-4" /> Add money
          </Button>
        )}

        <Dialog open={contribOpen} onOpenChange={setContribOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to {goal.name}</DialogTitle>
            </DialogHeader>
            <form onSubmit={contribute} className="space-y-4">
              <div>
                <Label htmlFor="c-amount">Amount</Label>
                <Input id="c-amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setContribOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Add"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function AddGoalDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { run, pending, fieldErrors } = useAction();
  const [name, setName] = React.useState("");
  const [target, setTarget] = React.useState("");
  const [current, setCurrent] = React.useState("0");
  const [targetDate, setTargetDate] = React.useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await run(
      () =>
        createGoal({
          name,
          targetAmount: Number(target),
          currentAmount: Number(current) || 0,
          targetDate: targetDate ? new Date(targetDate) : null,
        }),
      {
        successMessage: "Goal created",
        onSuccess: () => {
          onOpenChange(false);
          setName("");
          setTarget("");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New goal</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="g-name">What are you saving for?</Label>
            <Input id="g-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Emergency fund" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="g-target">Target amount</Label>
              <Input id="g-target" type="number" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} required />
              {fieldErrors.targetAmount && <p className="mt-1 text-xs text-destructive">{fieldErrors.targetAmount[0]}</p>}
            </div>
            <div>
              <Label htmlFor="g-current">Already saved</Label>
              <Input id="g-current" type="number" step="0.01" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="g-date">Target date (optional)</Label>
            <Input id="g-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
