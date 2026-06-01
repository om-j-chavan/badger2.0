"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Repeat, Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { useAction } from "@/hooks/use-action";
import { formatCurrency } from "@/lib/currency";
import { RECURRENCE_META, IMPORTANCE_META } from "@/lib/constants";
import { createRecurring, toggleRecurring, deleteRecurring } from "@/app/actions/recurring";

interface Rule {
  id: string;
  name: string;
  amount: number;
  frequency: keyof typeof RECURRENCE_META;
  importance: keyof typeof IMPORTANCE_META;
  nextRunDate: string;
  isActive: boolean;
  categoryName: string;
}

export function RecurringManager({
  rules,
  categories,
  currency,
}: {
  rules: Rule[];
  categories: { id: string; name: string }[];
  currency: string;
}) {
  const { run, pending, fieldErrors } = useAction();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (searchParams.get("new") === "1") setOpen(true);
  }, [searchParams]);

  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [categoryId, setCategoryId] = React.useState(categories[0]?.id ?? "");
  const [frequency, setFrequency] = React.useState<keyof typeof RECURRENCE_META>("MONTHLY");
  const [intervalCount, setIntervalCount] = React.useState("1");
  const [startDate, setStartDate] = React.useState(format(new Date(), "yyyy-MM-dd"));

  function close(v: boolean) {
    setOpen(v);
    if (!v && searchParams.get("new") === "1") router.replace("/recurring");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await run(
      () =>
        createRecurring({
          name,
          amount: Number(amount),
          categoryId,
          frequency,
          intervalCount: Number(intervalCount),
          startDate: new Date(startDate),
        }),
      {
        successMessage: "Recurring expense created",
        onSuccess: () => {
          close(false);
          setName("");
          setAmount("");
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New recurring
        </Button>
      </div>

      {rules.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No recurring expenses"
          description="Set up expenses that repeat — rent, salary deductions, gym fees — and Badger logs them automatically."
          action={<Button onClick={() => setOpen(true)}>Create one</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rules.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.categoryName} · {RECURRENCE_META[r.frequency].label} · next{" "}
                    {format(new Date(r.nextRunDate), "d MMM")}
                  </p>
                  <Badge variant="outline" className="mt-1 text-[10px]" style={{ color: IMPORTANCE_META[r.importance].color }}>
                    {IMPORTANCE_META[r.importance].label}
                  </Badge>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-semibold">{formatCurrency(r.amount, currency)}</span>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={r.isActive}
                      onCheckedChange={(v) => run(() => toggleRecurring(r.id, v))}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => run(() => deleteRecurring(r.id), { successMessage: "Deleted" })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={close}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New recurring expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="r-name">Name</Label>
              <Input id="r-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Gym membership" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="r-amount">Amount</Label>
                <Input id="r-amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                {fieldErrors.amount && <p className="mt-1 text-xs text-destructive">{fieldErrors.amount[0]}</p>}
              </div>
              <div>
                <Label htmlFor="r-start">Starts</Label>
                <Input id="r-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as keyof typeof RECURRENCE_META)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(RECURRENCE_META) as (keyof typeof RECURRENCE_META)[]).map((f) => (
                      <SelectItem key={f} value={f}>{RECURRENCE_META[f].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {frequency === "CUSTOM" && (
                <div>
                  <Label htmlFor="r-interval">Every N days</Label>
                  <Input id="r-interval" type="number" min="1" value={intervalCount} onChange={(e) => setIntervalCount(e.target.value)} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => close(false)}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
