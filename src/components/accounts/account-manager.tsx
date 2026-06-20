"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  Wallet,
  Plus,
  Archive,
  ArchiveRestore,
  ArrowDownToLine,
  ArrowLeftRight,
  CreditCard,
  Trash2,
} from "lucide-react";
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
import { createAccount, archiveAccount, unarchiveAccount } from "@/app/actions/account";
import { createIncome, deleteIncome } from "@/app/actions/income";
import { createTransfer, deleteTransfer } from "@/app/actions/transfer";

type AcctType = keyof typeof ACCOUNT_TYPE_META;

interface Acct {
  id: string;
  name: string;
  type: AcctType;
  currentBalance: number;
  color: string;
}

export interface Activity {
  id: string;
  kind: "income" | "transfer";
  title: string;
  sub: string;
  amount: number;
  signed: "in" | "out" | "move";
  date: string;
}

const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#8b5cf6"];
const INCOME_SOURCES = ["Salary", "Freelance", "Refund", "Interest", "Gift", "Bonus", "Other"];
const today = () => format(new Date(), "yyyy-MM-dd");

export function AccountManager({
  accounts,
  archived = [],
  recent,
  currency,
}: {
  accounts: Acct[];
  archived?: Acct[];
  recent: Activity[];
  currency: string;
}) {
  const { run } = useAction();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [addOpen, setAddOpen] = React.useState(false);
  const [incomeOpen, setIncomeOpen] = React.useState(false);
  const [transferPreset, setTransferPreset] = React.useState<{ toAccountId?: string; card?: boolean } | null>(null);

  React.useEffect(() => {
    if (searchParams.get("new") === "1") setAddOpen(true);
  }, [searchParams]);

  function closeAdd(v: boolean) {
    setAddOpen(v);
    if (!v && searchParams.get("new") === "1") router.replace("/accounts");
  }

  const total = accounts.reduce((s, a) => s + a.currentBalance, 0);
  const fmt = (n: number) => formatCurrency(n, currency);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Net balance: <span className="font-semibold text-foreground">{fmt(total)}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIncomeOpen(true)} disabled={accounts.length === 0}>
            <ArrowDownToLine className="h-4 w-4" /> Add deposit
          </Button>
          <Button variant="outline" onClick={() => setTransferPreset({})} disabled={accounts.length < 2}>
            <ArrowLeftRight className="h-4 w-4" /> Transfer
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add account
          </Button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No accounts yet"
          description="Add your cash, bank, UPI or credit accounts so expenses, deposits and transfers update real balances."
          action={<Button onClick={() => setAddOpen(true)}>Add an account</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => {
            const isCard = a.type === "CREDIT_CARD";
            return (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${a.color}22`, color: a.color }}>
                        {isCard ? <CreditCard className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
                      </span>
                      <div>
                        <p className="font-medium">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_META[a.type].label}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => run(() => archiveAccount(a.id), { successMessage: "Archived" })}>
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className={`mt-3 text-xl font-bold ${a.currentBalance < 0 ? "text-destructive" : ""}`}>{fmt(a.currentBalance)}</p>
                  {isCard && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => setTransferPreset({ toAccountId: a.id, card: true })}
                    >
                      <CreditCard className="h-4 w-4" /> Pay bill
                    </Button>
                  )}
                  {isCard && a.currentBalance < 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">Outstanding: {fmt(-a.currentBalance)}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Recent deposits & transfers */}
      {recent.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-2 text-sm font-semibold">Recent deposits & transfers</p>
            <div className="divide-y">
              {recent.map((r) => (
                <div key={`${r.kind}-${r.id}`} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${r.kind === "income" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                      {r.kind === "income" ? <ArrowDownToLine className="h-3.5 w-3.5" /> : <ArrowLeftRight className="h-3.5 w-3.5" />}
                    </span>
                    <div>
                      <p className="font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.sub} · {format(new Date(r.date), "d MMM")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${r.signed === "in" ? "text-success" : r.signed === "out" ? "text-destructive" : ""}`}>
                      {r.signed === "in" ? "+" : r.signed === "out" ? "−" : ""}{fmt(r.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() =>
                        run(
                          () => (r.kind === "income" ? deleteIncome(r.id) : deleteTransfer(r.id)),
                          { successMessage: "Removed" },
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Archived accounts */}
      {archived.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-2 text-sm font-semibold text-muted-foreground">Archived accounts</p>
            <div className="divide-y">
              {archived.map((a) => {
                const isCard = a.type === "CREDIT_CARD";
                return (
                  <div key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${a.color}22`, color: a.color }}>
                        {isCard ? <CreditCard className="h-3.5 w-3.5" /> : <Wallet className="h-3.5 w-3.5" />}
                      </span>
                      <div>
                        <p className="font-medium">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_META[a.type].label} · {fmt(a.currentBalance)}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => run(() => unarchiveAccount(a.id), { successMessage: "Unarchived" })}
                    >
                      <ArchiveRestore className="h-4 w-4" /> Unarchive
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <AddAccountDialog open={addOpen} onOpenChange={closeAdd} />
      <IncomeDialog open={incomeOpen} onOpenChange={setIncomeOpen} accounts={accounts} />
      <TransferDialog
        open={Boolean(transferPreset)}
        onOpenChange={(v) => !v && setTransferPreset(null)}
        accounts={accounts}
        presetToAccountId={transferPreset?.toAccountId}
        presetCard={transferPreset?.card}
      />
    </div>
  );
}

function AddAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { run, pending } = useAction();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<AcctType>("BANK");
  const [balance, setBalance] = React.useState("0");
  const [color, setColor] = React.useState(COLORS[0]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await run(() => createAccount({ name, type, currentBalance: Number(balance) || 0, color }), {
      successMessage: "Account added",
      onSuccess: () => {
        onOpenChange(false);
        setName("");
        setBalance("0");
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Add"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function IncomeDialog({
  open,
  onOpenChange,
  accounts,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: Acct[];
}) {
  const { run, pending, fieldErrors } = useAction();
  const [amount, setAmount] = React.useState("");
  const [source, setSource] = React.useState("Salary");
  const [accountId, setAccountId] = React.useState(accounts[0]?.id ?? "none");
  const [date, setDate] = React.useState(today());
  const [note, setNote] = React.useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await run(
      () =>
        createIncome({
          amount: Number(amount),
          source,
          accountId: accountId === "none" ? null : accountId,
          date: new Date(date),
          note: note || null,
        }),
      {
        successMessage: "Deposit added",
        onSuccess: () => {
          onOpenChange(false);
          setAmount("");
          setNote("");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add deposit / income</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="i-amount">Amount</Label>
              <Input id="i-amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required />
              {fieldErrors.amount && <p className="mt-1 text-xs text-destructive">{fieldErrors.amount[0]}</p>}
            </div>
            <div>
              <Label htmlFor="i-date">Date</Label>
              <Input id="i-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INCOME_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Into account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No account</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="i-note">Note</Label>
            <Input id="i-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Add deposit"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({
  open,
  onOpenChange,
  accounts,
  presetToAccountId,
  presetCard,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: Acct[];
  presetToAccountId?: string;
  presetCard?: boolean;
}) {
  const { run, pending, fieldErrors } = useAction();
  const nonCard = accounts.filter((a) => a.id !== presetToAccountId);
  const [fromAccountId, setFromAccountId] = React.useState(nonCard[0]?.id ?? "");
  const [toAccountId, setToAccountId] = React.useState(presetToAccountId ?? accounts[1]?.id ?? "");
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(today());
  const [note, setNote] = React.useState("");

  // Re-sync defaults whenever the dialog (re)opens with a preset.
  React.useEffect(() => {
    if (open) {
      setToAccountId(presetToAccountId ?? accounts[1]?.id ?? "");
      setFromAccountId(accounts.find((a) => a.id !== (presetToAccountId ?? accounts[1]?.id))?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetToAccountId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await run(
      () =>
        createTransfer({
          fromAccountId,
          toAccountId,
          amount: Number(amount),
          date: new Date(date),
          note: note || (presetCard ? "Credit card bill payment" : null),
          isCardPayment: Boolean(presetCard),
        }),
      {
        successMessage: presetCard ? "Bill payment recorded" : "Transfer done",
        onSuccess: () => {
          onOpenChange(false);
          setAmount("");
          setNote("");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{presetCard ? "Pay credit card bill" : "Transfer between accounts"}</DialogTitle>
        </DialogHeader>
        {presetCard && (
          <p className="rounded-lg bg-primary/10 p-2 text-xs text-primary">
            This moves money to your card and pays down its balance. It isn't counted as new spending — the purchases were already logged.
          </p>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>From</Label>
              <Select value={fromAccountId} onValueChange={setFromAccountId}>
                <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>To</Label>
              <Select value={toAccountId} onValueChange={setToAccountId} disabled={presetCard}>
                <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.toAccountId && <p className="mt-1 text-xs text-destructive">{fieldErrors.toAccountId[0]}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="t-amount">Amount</Label>
              <Input id="t-amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required />
              {fieldErrors.amount && <p className="mt-1 text-xs text-destructive">{fieldErrors.amount[0]}</p>}
            </div>
            <div>
              <Label htmlFor="t-date">Date</Label>
              <Input id="t-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>
          <div>
            <Label htmlFor="t-note">Note</Label>
            <Input id="t-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : presetCard ? "Pay bill" : "Transfer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
