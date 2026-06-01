"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Landmark, Plus, Calculator, Wallet, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { useAction } from "@/hooks/use-action";
import { formatCurrency } from "@/lib/currency";
import { LOAN_TYPE_META } from "@/lib/constants";
import { calculateEmi } from "@/lib/finance/emi";
import type { PrepaymentResult } from "@/lib/finance/prepayment";
import {
  createLoan,
  deleteLoan,
  recordLoanPayment,
  simulateLoanPrepayment,
} from "@/app/actions/loan";

export interface LoanView {
  id: string;
  name: string;
  type: keyof typeof LOAN_TYPE_META;
  lender: string | null;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  emiAmount: number;
  remainingPrincipal: number;
  nextDueDate: string;
  status: string;
  percentComplete: number;
  remainingMonths: number;
  remainingInterest: number;
}

export function LoanManager({ loans, currency }: { loans: LoanView[]; currency: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);

  React.useEffect(() => {
    if (searchParams.get("new") === "1") setAddOpen(true);
  }, [searchParams]);

  function closeAdd(v: boolean) {
    setAddOpen(v);
    if (!v && searchParams.get("new") === "1") router.replace("/loans");
  }

  const fmt = (n: number) => formatCurrency(n, currency);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add loan
        </Button>
      </div>

      {loans.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No loans tracked"
          description="Add a loan to watch your payoff progress and simulate paying it off faster."
          action={<Button onClick={() => setAddOpen(true)}>Add a loan</Button>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {loans.map((loan) => (
            <LoanCard key={loan.id} loan={loan} fmt={fmt} />
          ))}
        </div>
      )}

      <AddLoanDialog open={addOpen} onOpenChange={closeAdd} currency={currency} />
    </div>
  );
}

function LoanCard({ loan, fmt }: { loan: LoanView; fmt: (n: number) => string }) {
  const { run } = useAction();
  const [payOpen, setPayOpen] = React.useState(false);
  const [simOpen, setSimOpen] = React.useState(false);
  const closed = loan.status === "CLOSED";

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold">{loan.name}</p>
              {closed && <Badge variant="success">Paid off 🎉</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              {LOAN_TYPE_META[loan.type].label}
              {loan.lender ? ` · ${loan.lender}` : ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={() => run(() => deleteLoan(loan.id), { successMessage: "Loan deleted" })}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-2xl font-bold">{fmt(loan.remainingPrincipal)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">EMI</p>
            <p className="font-semibold">{fmt(loan.emiAmount)}</p>
          </div>
        </div>

        <Progress value={loan.percentComplete} className="mt-3" />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>{loan.percentComplete}% paid</span>
          <span>{loan.remainingMonths} months left</span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <Stat label="Rate" value={`${loan.interestRate}%`} />
          <Stat label="Next due" value={closed ? "—" : format(new Date(loan.nextDueDate), "d MMM")} />
          <Stat label="Interest left" value={fmt(loan.remainingInterest)} />
        </div>

        {!closed && (
          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setPayOpen(true)}>
              <Wallet className="h-4 w-4" /> Record payment
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setSimOpen(true)}>
              <Calculator className="h-4 w-4" /> Simulate
            </Button>
          </div>
        )}

        <RecordPaymentDialog loan={loan} open={payOpen} onOpenChange={setPayOpen} fmt={fmt} />
        <PrepaymentDialog loan={loan} open={simOpen} onOpenChange={setSimOpen} fmt={fmt} />
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function RecordPaymentDialog({
  loan,
  open,
  onOpenChange,
  fmt,
}: {
  loan: LoanView;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fmt: (n: number) => string;
}) {
  const { run, pending } = useAction();
  const [amount, setAmount] = React.useState(loan.emiAmount.toString());
  const [date, setDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [isPrepayment, setIsPrepayment] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await run(
      () => recordLoanPayment({ loanId: loan.id, amount: Number(amount), date: new Date(date), isPrepayment }),
      { successMessage: "Payment recorded", onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment — {loan.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="p-amount">Amount</Label>
              <Input id="p-amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="p-date">Date</Label>
              <Input id="p-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPrepayment} onChange={(e) => setIsPrepayment(e.target.checked)} />
            This is an extra prepayment (all goes to principal)
          </label>
          <p className="text-xs text-muted-foreground">Outstanding after this: roughly {fmt(Math.max(0, loan.remainingPrincipal - Number(amount)))}</p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Record"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PrepaymentDialog({
  loan,
  open,
  onOpenChange,
  fmt,
}: {
  loan: LoanView;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fmt: (n: number) => string;
}) {
  const { run, pending } = useAction();
  const [extraMonthly, setExtraMonthly] = React.useState("");
  const [lumpSum, setLumpSum] = React.useState("");
  const [result, setResult] = React.useState<PrepaymentResult | null>(null);

  async function simulate(e: React.FormEvent) {
    e.preventDefault();
    const res = await run(() =>
      simulateLoanPrepayment({
        loanId: loan.id,
        extraMonthly: Number(extraMonthly) || 0,
        lumpSum: Number(lumpSum) || 0,
      }),
    );
    if (res.ok) setResult(res.data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Prepayment simulator — {loan.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={simulate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="extra">Extra per month</Label>
              <Input id="extra" type="number" step="0.01" placeholder="0" value={extraMonthly} onChange={(e) => setExtraMonthly(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="lump">One-time lump sum</Label>
              <Input id="lump" type="number" step="0.01" placeholder="0" value={lumpSum} onChange={(e) => setLumpSum(e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Calculating…" : "Simulate"}
          </Button>
        </form>

        {result && (
          <div className="mt-2 space-y-3 rounded-xl bg-muted/40 p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Result label="Interest saved" value={fmt(result.interestSaved)} highlight />
              <Result label="Months saved" value={`${result.monthsSaved}`} highlight />
              <Result label="New payoff" value={format(new Date(result.withPrepayment.payoffDate), "MMM yyyy")} />
            </div>
            <div className="text-xs text-muted-foreground">
              <p>Without changes: {result.baseline.months} months, {fmt(result.baseline.totalInterest)} interest.</p>
              <p>With your plan: {result.withPrepayment.months} months, {fmt(result.withPrepayment.totalInterest)} interest.</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Result({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={highlight ? "font-bold text-primary" : "font-semibold"}>{value}</p>
    </div>
  );
}

function AddLoanDialog({
  open,
  onOpenChange,
  currency,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currency: string;
}) {
  const { run, pending, fieldErrors } = useAction();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<keyof typeof LOAN_TYPE_META>("PERSONAL");
  const [principal, setPrincipal] = React.useState("");
  const [rate, setRate] = React.useState("10");
  const [tenure, setTenure] = React.useState("36");
  const [startDate, setStartDate] = React.useState(format(new Date(), "yyyy-MM-dd"));

  const emiPreview =
    Number(principal) > 0 ? calculateEmi(Number(principal), Number(rate), Number(tenure)) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await run(
      () =>
        createLoan({
          name,
          type,
          principalAmount: Number(principal),
          interestRate: Number(rate),
          tenureMonths: Number(tenure),
          startDate: new Date(startDate),
        }),
      {
        successMessage: "Loan added",
        onSuccess: () => {
          onOpenChange(false);
          setName("");
          setPrincipal("");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a loan</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="l-name">Name</Label>
              <Input id="l-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Car loan" required />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as keyof typeof LOAN_TYPE_META)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(LOAN_TYPE_META) as (keyof typeof LOAN_TYPE_META)[]).map((t) => (
                    <SelectItem key={t} value={t}>{LOAN_TYPE_META[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="l-principal">Principal</Label>
              <Input id="l-principal" type="number" step="0.01" value={principal} onChange={(e) => setPrincipal(e.target.value)} required />
              {fieldErrors.principalAmount && <p className="mt-1 text-xs text-destructive">{fieldErrors.principalAmount[0]}</p>}
            </div>
            <div>
              <Label htmlFor="l-rate">Interest rate (% p.a.)</Label>
              <Input id="l-rate" type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="l-tenure">Tenure (months)</Label>
              <Input id="l-tenure" type="number" value={tenure} onChange={(e) => setTenure(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="l-start">Start date</Label>
              <Input id="l-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
          </div>
          {emiPreview > 0 && (
            <div className="rounded-xl bg-primary/10 p-3 text-sm text-primary">
              Estimated EMI: <span className="font-bold">{formatCurrency(emiPreview, currency)}</span>/month
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Add loan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
