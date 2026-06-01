"use client";

import * as React from "react";
import { format } from "date-fns";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { formatCurrency } from "@/lib/currency";
import { IMPORTANCE_META, MOOD_META } from "@/lib/constants";
import { deleteExpense } from "@/app/actions/expense";
import {
  ExpenseForm,
  type ExpenseFormCategory,
  type ExpenseFormAccount,
} from "./expense-form";

export interface ExpenseRow {
  id: string;
  date: string;
  amount: number;
  importance: keyof typeof IMPORTANCE_META;
  note: string | null;
  mood: keyof typeof MOOD_META | null;
  paymentMethod: string | null;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  accountId: string | null;
  accountName: string | null;
}

export function ExpenseList({
  expenses,
  categories,
  accounts,
  currency,
}: {
  expenses: ExpenseRow[];
  categories: ExpenseFormCategory[];
  accounts: ExpenseFormAccount[];
  currency: string;
}) {
  const { run } = useAction();
  const [editing, setEditing] = React.useState<ExpenseRow | null>(null);

  return (
    <div className="divide-y rounded-2xl border bg-card">
      {expenses.map((e) => (
        <div key={e.id} className="flex items-center gap-3 p-3.5">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-semibold"
            style={{ backgroundColor: `${e.categoryColor}1a`, color: e.categoryColor }}
          >
            {e.categoryName.slice(0, 2)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{e.note || e.categoryName}</p>
              {e.mood && <span title={MOOD_META[e.mood].label}>{MOOD_META[e.mood].emoji}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span>{format(new Date(e.date), "d MMM yyyy")}</span>
              <span>·</span>
              <span>{e.categoryName}</span>
              {e.accountName && (
                <>
                  <span>·</span>
                  <span>{e.accountName}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="font-semibold">{formatCurrency(e.amount, currency)}</span>
            <Badge
              variant="outline"
              className="text-[10px]"
              style={{ color: IMPORTANCE_META[e.importance].color, borderColor: `${IMPORTANCE_META[e.importance].color}55` }}
            >
              {IMPORTANCE_META[e.importance].label}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditing(e)}>
                <Pencil className="h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() =>
                  run(() => deleteExpense(e.id), { successMessage: "Expense deleted" })
                }
              >
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}

      {editing && (
        <ExpenseForm
          categories={categories}
          accounts={accounts}
          open={Boolean(editing)}
          onOpenChange={(v) => !v && setEditing(null)}
          initial={{
            id: editing.id,
            amount: editing.amount,
            categoryId: editing.categoryId,
            importance: editing.importance,
            date: editing.date,
            accountId: editing.accountId,
            note: editing.note,
            mood: editing.mood,
            paymentMethod: editing.paymentMethod,
          }}
        />
      )}
    </div>
  );
}
