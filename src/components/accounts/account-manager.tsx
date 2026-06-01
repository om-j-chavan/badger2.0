"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wallet, Plus, Archive } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { useAction } from "@/hooks/use-action";
import { formatCurrency } from "@/lib/currency";
import { ACCOUNT_TYPE_META } from "@/lib/constants";
import { createAccount, archiveAccount } from "@/app/actions/account";

type AcctType = keyof typeof ACCOUNT_TYPE_META;

interface Acct {
  id: string;
  name: string;
  type: AcctType;
  currentBalance: number;
  color: string;
}

const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#8b5cf6"];

export function AccountManager({ accounts, currency }: { accounts: Acct[]; currency: string }) {
  const { run, pending } = useAction();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (searchParams.get("new") === "1") setOpen(true);
  }, [searchParams]);

  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<AcctType>("BANK");
  const [balance, setBalance] = React.useState("0");
  const [color, setColor] = React.useState(COLORS[0]);

  function close(v: boolean) {
    setOpen(v);
    if (!v && searchParams.get("new") === "1") router.replace("/accounts");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await run(
      () => createAccount({ name, type, currentBalance: Number(balance) || 0, color }),
      {
        successMessage: "Account added",
        onSuccess: () => {
          close(false);
          setName("");
          setBalance("0");
        },
      },
    );
  }

  const total = accounts.reduce((s, a) => s + a.currentBalance, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Net balance: <span className="font-semibold text-foreground">{formatCurrency(total, currency)}</span>
        </p>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No accounts yet"
          description="Add your cash, bank, UPI or credit accounts so expenses can update real balances."
          action={<Button onClick={() => setOpen(true)}>Add an account</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${a.color}22`, color: a.color }}>
                    <Wallet className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_META[a.type].label}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-semibold">{formatCurrency(a.currentBalance, currency)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => run(() => archiveAccount(a.id), { successMessage: "Archived" })}>
                    <Archive className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={close}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add account</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="a-name">Name</Label>
              <Input id="a-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Main bank" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as AcctType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ACCOUNT_TYPE_META) as AcctType[]).map((t) => (
                      <SelectItem key={t} value={t}>{ACCOUNT_TYPE_META[t].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="a-balance">Current balance</Label>
                <Input id="a-balance" type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Colour</Label>
              <div className="mt-1.5 flex gap-2">
                {COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    className="h-7 w-7 rounded-full ring-offset-2 transition-all"
                    style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
                    aria-label={`Pick ${c}`}
                  />
                ))}
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
