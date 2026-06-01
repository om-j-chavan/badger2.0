"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAction } from "@/hooks/use-action";
import { IMPORTANCE_META, MOOD_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { createExpense, updateExpense } from "@/app/actions/expense";

export interface ExpenseFormCategory {
  id: string;
  name: string;
  color: string;
}
export interface ExpenseFormAccount {
  id: string;
  name: string;
}

export interface ExpenseInitial {
  id?: string;
  amount?: number;
  categoryId?: string;
  importance?: keyof typeof IMPORTANCE_META;
  date?: string;
  accountId?: string | null;
  note?: string | null;
  mood?: keyof typeof MOOD_META | null;
  paymentMethod?: string | null;
}

export function ExpenseForm({
  categories,
  accounts,
  initial,
  open,
  onOpenChange,
  defaultDate,
}: {
  categories: ExpenseFormCategory[];
  accounts: ExpenseFormAccount[];
  initial?: ExpenseInitial;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate?: string;
}) {
  const { run, pending, fieldErrors } = useAction();
  const isEdit = Boolean(initial?.id);

  const [amount, setAmount] = React.useState(initial?.amount?.toString() ?? "");
  const [categoryId, setCategoryId] = React.useState(initial?.categoryId ?? categories[0]?.id ?? "");
  const [importance, setImportance] = React.useState<keyof typeof IMPORTANCE_META>(
    initial?.importance ?? "USEFUL",
  );
  const [date, setDate] = React.useState(
    initial?.date?.slice(0, 10) ?? defaultDate ?? format(new Date(), "yyyy-MM-dd"),
  );
  const [accountId, setAccountId] = React.useState(initial?.accountId ?? "none");
  const [note, setNote] = React.useState(initial?.note ?? "");
  const [mood, setMood] = React.useState<string>(initial?.mood ?? "none");
  const [paymentMethod, setPaymentMethod] = React.useState(initial?.paymentMethod ?? "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      amount: Number(amount),
      categoryId,
      importance,
      date: new Date(date),
      accountId: accountId === "none" ? null : accountId,
      note: note || null,
      mood: mood === "none" ? null : (mood as keyof typeof MOOD_META),
      paymentMethod: paymentMethod || null,
    };
    const res = await run(
      () => (isEdit ? updateExpense({ id: initial!.id, ...payload }) : createExpense(payload)),
      { successMessage: isEdit ? "Expense updated" : "Expense added", onSuccess: () => onOpenChange(false) },
    );
    if (res.ok && !isEdit) {
      setAmount("");
      setNote("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit expense" : "Add expense"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                required
              />
              {fieldErrors.amount && <p className="mt-1 text-xs text-destructive">{fieldErrors.amount[0]}</p>}
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          <div>
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>How important was this?</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(IMPORTANCE_META) as (keyof typeof IMPORTANCE_META)[]).map((k) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setImportance(k)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-xs font-medium transition-colors",
                    importance === k ? "border-transparent text-white" : "hover:bg-accent",
                  )}
                  style={importance === k ? { backgroundColor: IMPORTANCE_META[k].color } : undefined}
                >
                  {IMPORTANCE_META[k].label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No account</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mood</Label>
              <Select value={mood} onValueChange={setMood}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {(Object.keys(MOOD_META) as (keyof typeof MOOD_META)[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {MOOD_META[m].emoji} {MOOD_META[m].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              placeholder="What was it for?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Add expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Floating "add" button + dialog wired to the ?new=1 deep link. */
export function AddExpenseButton({
  categories,
  accounts,
  label = "Add expense",
}: {
  categories: ExpenseFormCategory[];
  accounts: ExpenseFormAccount[];
  label?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (searchParams.get("new") === "1") setOpen(true);
  }, [searchParams]);

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v && searchParams.get("new") === "1") router.replace("/expenses");
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>{label}</Button>
      <ExpenseForm
        categories={categories}
        accounts={accounts}
        open={open}
        onOpenChange={handleOpenChange}
      />
    </>
  );
}
