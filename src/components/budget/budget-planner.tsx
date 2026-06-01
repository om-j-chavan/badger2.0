"use client";

import * as React from "react";
import { Plus, Trash2, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAction } from "@/hooks/use-action";
import { formatCurrency } from "@/lib/currency";
import { BUDGET_PRIORITY_META } from "@/lib/constants";
import { generateBudgetPlans, type PlannedItem } from "@/lib/finance/budget-plan";
import { saveBudget } from "@/app/actions/budget";
import { MONTH_NAMES } from "@/lib/dates";

type Priority = keyof typeof BUDGET_PRIORITY_META;

interface Item extends PlannedItem {
  key: string;
}

export function BudgetPlanner({
  currency,
  month,
  year,
  initialIncome,
  initialItems,
}: {
  currency: string;
  month: number;
  year: number;
  initialIncome: number;
  initialItems: { label: string; amount: number; priority: Priority }[];
}) {
  const { run, pending } = useAction();
  const [income, setIncome] = React.useState(initialIncome ? String(initialIncome) : "");
  const [items, setItems] = React.useState<Item[]>(
    initialItems.map((i, idx) => ({ ...i, key: `init-${idx}` })),
  );
  const [label, setLabel] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [priority, setPriority] = React.useState<Priority>("MUST_HAVE");
  const counter = React.useRef(0);

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!label || !Number(amount)) return;
    setItems((prev) => [
      ...prev,
      { key: `new-${counter.current++}`, label, amount: Number(amount), priority },
    ]);
    setLabel("");
    setAmount("");
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  const incomeNum = Number(income) || 0;
  const plans = generateBudgetPlans(incomeNum, items);
  const fmt = (n: number) => formatCurrency(n, currency);

  async function save() {
    await run(
      () =>
        saveBudget({
          name: `${MONTH_NAMES[month - 1]} ${year}`,
          month,
          year,
          monthlyIncome: incomeNum,
          items: items.map((i) => ({ label: i.label, amount: i.amount, priority: i.priority })),
        }),
      { successMessage: "Budget saved" },
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your plan for {MONTH_NAMES[month - 1]} {year}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <Label htmlFor="income">Monthly income</Label>
            <Input id="income" type="number" step="0.01" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="e.g. 80000" />
          </div>

          <form onSubmit={addItem} className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[140px]">
              <Label htmlFor="b-label">Planned expense</Label>
              <Input id="b-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Rent" />
            </div>
            <div className="w-28">
              <Label htmlFor="b-amount">Amount</Label>
              <Input id="b-amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="w-40">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(BUDGET_PRIORITY_META) as Priority[]).map((p) => (
                    <SelectItem key={p} value={p}>{BUDGET_PRIORITY_META[p].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" variant="secondary"><Plus className="h-4 w-4" /> Add</Button>
          </form>

          {items.length > 0 && (
            <div className="divide-y rounded-xl border">
              {items.map((i) => (
                <div key={i.key} className="flex items-center justify-between p-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BUDGET_PRIORITY_META[i.priority].color }} />
                    <span className="font-medium">{i.label}</span>
                    <Badge variant="outline" className="text-[10px]">{BUDGET_PRIORITY_META[i.priority].label}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{fmt(i.amount)}</span>
                    <button onClick={() => removeItem(i.key)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={save} disabled={pending || incomeNum <= 0}>
              <Save className="h-4 w-4" /> {pending ? "Saving…" : "Save budget"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {incomeNum > 0 && items.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Generated budgets</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.key} className={plan.savings < 0 ? "border-destructive/40" : ""}>
                <CardHeader>
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Projected savings</p>
                    <p className={`text-xl font-bold ${plan.savings < 0 ? "text-destructive" : "text-primary"}`}>
                      {fmt(plan.savings)}
                    </p>
                    <p className="text-xs text-muted-foreground">{plan.savingsRate}% of income</p>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Allocated</span>
                      <span>{fmt(plan.allocated)}</span>
                    </div>
                    {plan.trimmedItems.length > 0 && (
                      <p className="text-muted-foreground">
                        Trims: {plan.trimmedItems.map((t) => t.label).join(", ")}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
