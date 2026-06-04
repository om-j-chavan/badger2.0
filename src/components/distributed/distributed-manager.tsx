"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addMonths, format } from "date-fns";
import { CalendarRange, Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { useAction } from "@/hooks/use-action";
import { formatCurrency } from "@/lib/currency";
import { createDistributed, deleteDistributed } from "@/app/actions/distributed";

interface Item {
  id: string;
  name: string;
  totalAmount: number;
  amountPaid: number;
  coverageMonths: number;
  monthlyImpact: number;
  startDate: string;
  monthsElapsed: number;
  categoryName: string;
}

export function DistributedManager({
  items,
  categories,
  currency,
}: {
  items: Item[];
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
  const [total, setTotal] = React.useState("");
  const [paid, setPaid] = React.useState("");
  const [months, setMonths] = React.useState("6");
  const [categoryId, setCategoryId] = React.useState(categories[0]?.id ?? "");
  const [startDate, setStartDate] = React.useState(format(new Date(), "yyyy-MM-dd"));

  const previewMonthly =
    Number(total) > 0 && Number(months) > 0 ? Number(total) / Number(months) : 0;
  const previewRemaining = Math.max(0, (Number(total) || 0) - (Number(paid) || 0));

  function close(v: boolean) {
    setOpen(v);
    if (!v && searchParams.get("new") === "1") router.replace("/distributed");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await run(
      () =>
        createDistributed({
          name,
          totalAmount: Number(total),
          amountPaid: Number(paid) || 0,
          coverageMonths: Number(months),
          categoryId,
          startDate: new Date(startDate),
        }),
      {
        successMessage: "Distributed expense added",
        onSuccess: () => {
          close(false);
          setName("");
          setTotal("");
          setPaid("");
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New distributed expense
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="No distributed expenses"
          description="Paid for something that covers several months — like a 6-month internet bill? Add it here and Badger spreads the cost across your reports."
          action={<Button onClick={() => setOpen(true)}>Add one</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((d) => {
            const progress = Math.min(100, (d.monthsElapsed / d.coverageMonths) * 100);
            const remaining = Math.max(0, d.totalAmount - d.amountPaid);
            return (
              <Card key={d.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.categoryName}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => run(() => deleteDistributed(d.id), { successMessage: "Deleted" })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(d.monthlyImpact, currency)}</p>
                      <p className="text-xs text-muted-foreground">per month effective</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{formatCurrency(d.totalAmount, currency)} total</p>
                      <p>over {d.coverageMonths} months</p>
                    </div>
                  </div>
                  <Progress value={progress} className="mt-3" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {Math.min(d.monthsElapsed, d.coverageMonths)} of {d.coverageMonths} months elapsed
                  </p>
                  <div className="mt-2 flex justify-between border-t pt-2 text-xs">
                    <span className="text-muted-foreground">Paid {formatCurrency(d.amountPaid, currency)}</span>
                    <span className={remaining > 0 ? "font-medium text-warning" : "font-medium text-success"}>
                      {remaining > 0 ? `${formatCurrency(remaining, currency)} left to pay` : "Fully paid"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={close}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New distributed expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="d-name">Name</Label>
              <Input id="d-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Internet (6 months)" required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="d-total">Total amount</Label>
                <Input id="d-total" type="number" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} required />
                {fieldErrors.totalAmount && <p className="mt-1 text-xs text-destructive">{fieldErrors.totalAmount[0]}</p>}
              </div>
              <div>
                <Label htmlFor="d-paid">Already paid</Label>
                <Input id="d-paid" type="number" step="0.01" placeholder="0" value={paid} onChange={(e) => setPaid(e.target.value)} />
                {fieldErrors.amountPaid && <p className="mt-1 text-xs text-destructive">{fieldErrors.amountPaid[0]}</p>}
              </div>
              <div>
                <Label htmlFor="d-months">Coverage</Label>
                <Input id="d-months" type="number" min="1" value={months} onChange={(e) => setMonths(e.target.value)} required />
              </div>
            </div>
            {previewMonthly > 0 && (
              <div className="rounded-xl bg-primary/10 p-3 text-sm text-primary">
                Effective monthly cost: <span className="font-bold">{formatCurrency(previewMonthly, currency)}</span>/month
                {Number(paid) > 0 && (
                  <span className="ml-1 text-primary/80">· {formatCurrency(previewRemaining, currency)} still to pay</span>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <Label htmlFor="d-start">Start date</Label>
                <Input id="d-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => close(false)}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
