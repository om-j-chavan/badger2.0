"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { CreditCard, Trash2, Plus, Receipt } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { useAction } from "@/hooks/use-action";
import { formatCurrency } from "@/lib/currency";
import { SUBSCRIPTION_FREQUENCY_META } from "@/lib/constants";
import {
  createSubscription,
  deleteSubscription,
  toggleSubscription,
  logSubscriptionAsExpense,
} from "@/app/actions/subscription";

interface Sub {
  id: string;
  name: string;
  cost: number;
  frequency: keyof typeof SUBSCRIPTION_FREQUENCY_META;
  renewalDate: string;
  monthlyImpact: number;
  isActive: boolean;
  color: string;
}

export function SubscriptionManager({
  subscriptions,
  monthlyTotal,
  yearlyTotal,
  currency,
}: {
  subscriptions: Sub[];
  monthlyTotal: number;
  yearlyTotal: number;
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
  const [cost, setCost] = React.useState("");
  const [frequency, setFrequency] = React.useState<keyof typeof SUBSCRIPTION_FREQUENCY_META>("MONTHLY");
  const [renewalDate, setRenewalDate] = React.useState(format(new Date(), "yyyy-MM-dd"));

  function close(v: boolean) {
    setOpen(v);
    if (!v && searchParams.get("new") === "1") router.replace("/subscriptions");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await run(
      () =>
        createSubscription({
          name,
          cost: Number(cost),
          frequency,
          renewalDate: new Date(renewalDate),
        }),
      {
        successMessage: "Subscription added",
        onSuccess: () => {
          close(false);
          setName("");
          setCost("");
        },
      },
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Monthly burden" value={formatCurrency(monthlyTotal, currency)} icon={CreditCard} accent="warning" />
        <StatCard label="Yearly burden" value={formatCurrency(yearlyTotal, currency)} accent="muted" />
        <StatCard label="Active subscriptions" value={subscriptions.filter((s) => s.isActive).length} accent="primary" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add subscription
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No subscriptions tracked"
          description="Add Netflix, Spotify, ChatGPT and the rest to see your true monthly burden."
          action={<Button onClick={() => setOpen(true)}>Add one</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subscriptions.map((s) => (
            <Card key={s.id} className={s.isActive ? "" : "opacity-60"}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-9 w-9 rounded-xl" style={{ backgroundColor: `${s.color}22` }} />
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {SUBSCRIPTION_FREQUENCY_META[s.frequency].label} · renews {format(new Date(s.renewalDate), "d MMM")}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => run(() => deleteSubscription(s.id), { successMessage: "Removed" })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-xl font-bold">{formatCurrency(s.cost, currency)}</p>
                    <p className="text-xs text-muted-foreground">
                      ≈ {formatCurrency(s.monthlyImpact, currency)}/mo
                    </p>
                  </div>
                  <Switch checked={s.isActive} onCheckedChange={(v) => run(() => toggleSubscription(s.id, v))} />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  disabled={pending}
                  onClick={() =>
                    run(() => logSubscriptionAsExpense(s.id), {
                      successMessage: `Logged ${formatCurrency(s.cost, currency)} for ${s.name}`,
                    })
                  }
                >
                  <Receipt className="h-4 w-4" /> Log as expense
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={close}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add subscription</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="s-name">Name</Label>
              <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Netflix" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="s-cost">Cost</Label>
                <Input id="s-cost" type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} required />
                {fieldErrors.cost && <p className="mt-1 text-xs text-destructive">{fieldErrors.cost[0]}</p>}
              </div>
              <div>
                <Label>Billing</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as keyof typeof SUBSCRIPTION_FREQUENCY_META)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SUBSCRIPTION_FREQUENCY_META) as (keyof typeof SUBSCRIPTION_FREQUENCY_META)[]).map((f) => (
                      <SelectItem key={f} value={f}>{SUBSCRIPTION_FREQUENCY_META[f].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="s-renew">Next renewal</Label>
              <Input id="s-renew" type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} required />
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
