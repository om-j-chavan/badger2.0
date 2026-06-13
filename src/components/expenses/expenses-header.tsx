"use client";

import * as React from "react";
import { Wallet, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/currency";
import { ACCOUNT_TYPE_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { AddExpenseButton } from "./expense-form";

type AcctType = keyof typeof ACCOUNT_TYPE_META;

export interface BalanceAccount {
  id: string;
  name: string;
  type: AcctType;
  currentBalance: number;
  color: string;
}

export function ExpensesHeader({
  count,
  totalSpent,
  currency,
  categories,
  accounts,
}: {
  count: number;
  totalSpent: number;
  currency: string;
  categories: { id: string; name: string; color: string }[];
  accounts: BalanceAccount[];
}) {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    setShow(window.localStorage.getItem("badger-view-balances") === "1");
  }, []);

  function toggle(v: boolean) {
    setShow(v);
    window.localStorage.setItem("badger-view-balances", v ? "1" : "0");
  }

  const fmt = (n: number) => formatCurrency(n, currency);
  const isCard = (a: BalanceAccount) => a.type === "CREDIT_CARD";

  // Spendable money already has expenses deducted; cards show what's owed.
  const available = accounts.filter((a) => !isCard(a)).reduce((s, a) => s + a.currentBalance, 0);
  const owed = accounts.filter(isCard).reduce((s, a) => s + Math.max(0, -a.currentBalance), 0);

  const formAccounts = accounts.map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {count} logged · {fmt(totalSpent)} on this page
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="view-balances" checked={show} onCheckedChange={toggle} disabled={accounts.length === 0} />
            <Label htmlFor="view-balances" className="cursor-pointer whitespace-nowrap text-sm">
              View balances
            </Label>
          </div>
          <AddExpenseButton categories={categories} accounts={formAccounts} />
        </div>
      </div>

      {show && accounts.length > 0 && (
        <Card className="animate-fade-in">
          <CardContent className="p-4">
            <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="text-muted-foreground">
                Available:{" "}
                <span className={cn("font-semibold", available < 0 ? "text-destructive" : "text-foreground")}>
                  {fmt(available)}
                </span>
              </span>
              {owed > 0 && (
                <span className="text-muted-foreground">
                  Owed on cards: <span className="font-semibold text-warning">{fmt(owed)}</span>
                </span>
              )}
              <span className="text-muted-foreground">
                Net: <span className="font-semibold">{fmt(available - owed)}</span>
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((a) => {
                const card = isCard(a);
                const owedAmt = Math.max(0, -a.currentBalance);
                return (
                  <div key={a.id} className="flex items-center justify-between rounded-xl border p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${a.color}22`, color: a.color }}
                      >
                        {card ? <CreditCard className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{a.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {card ? (owedAmt > 0 ? "Outstanding" : "Cleared") : ACCOUNT_TYPE_META[a.type].label}
                        </p>
                      </div>
                    </div>
                    {card ? (
                      <span className={cn("font-semibold", owedAmt > 0 ? "text-warning" : "text-success")}>
                        {owedAmt > 0 ? fmt(owedAmt) : fmt(0)}
                      </span>
                    ) : (
                      <span className={cn("font-semibold", a.currentBalance < 0 && "text-destructive")}>
                        {fmt(a.currentBalance)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
