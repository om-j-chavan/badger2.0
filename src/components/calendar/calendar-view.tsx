"use client";

import * as React from "react";
import Link from "next/link";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAction } from "@/hooks/use-action";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { IMPORTANCE_META } from "@/lib/constants";
import { moveExpense } from "@/app/actions/expense";
import {
  ExpenseForm,
  type ExpenseFormCategory,
  type ExpenseFormAccount,
} from "@/components/expenses/expense-form";

interface DayExpense {
  id: string;
  amount: number;
  note: string | null;
  categoryName: string;
  categoryColor: string;
  importance: keyof typeof IMPORTANCE_META;
}

export function CalendarView({
  year,
  month,
  expensesByDay,
  categories,
  accounts,
  currency,
}: {
  year: number;
  month: number; // 1-12
  expensesByDay: Record<string, DayExpense[]>; // key: yyyy-MM-dd
  categories: ExpenseFormCategory[];
  accounts: ExpenseFormAccount[];
  currency: string;
}) {
  const { run } = useAction();
  const cursor = new Date(year, month - 1, 1);
  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const [selectedDay, setSelectedDay] = React.useState<string | null>(null);
  const [addDate, setAddDate] = React.useState<string | null>(null);
  const [dragId, setDragId] = React.useState<string | null>(null);

  const prevHref = `/calendar?y=${subMonths(cursor, 1).getFullYear()}&m=${subMonths(cursor, 1).getMonth() + 1}`;
  const nextHref = `/calendar?y=${addMonths(cursor, 1).getFullYear()}&m=${addMonths(cursor, 1).getMonth() + 1}`;

  function dayKey(d: Date) {
    return format(d, "yyyy-MM-dd");
  }

  async function handleDrop(targetKey: string) {
    if (!dragId) return;
    setDragId(null);
    await run(() => moveExpense(dragId, new Date(targetKey + "T12:00:00")), {
      successMessage: "Expense moved",
    });
  }

  const selectedExpenses = selectedDay ? expensesByDay[selectedDay] ?? [] : [];
  const selectedTotal = selectedExpenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Button variant="outline" size="icon" asChild>
          <Link href={prevHref} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-lg font-semibold">{format(cursor, "MMMM yyyy")}</h2>
        <Button variant="outline" size="icon" asChild>
          <Link href={nextHref} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = dayKey(d);
          const dayExpenses = expensesByDay[key] ?? [];
          const total = dayExpenses.reduce((s, e) => s + e.amount, 0);
          const inMonth = isSameMonth(d, cursor);
          const today = isSameDay(d, new Date());

          return (
            <button
              key={key}
              onClick={() => setSelectedDay(key)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(key)}
              className={cn(
                "group flex min-h-[68px] flex-col rounded-xl border p-1.5 text-left transition-colors hover:border-primary/50 sm:min-h-[92px]",
                inMonth ? "bg-card" : "bg-muted/40 text-muted-foreground",
                today && "border-primary ring-1 ring-primary",
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("text-xs font-medium", today && "text-primary")}>{format(d, "d")}</span>
                {dayExpenses.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
                    {dayExpenses.length}
                  </span>
                )}
              </div>
              {total > 0 && (
                <span className="mt-auto text-[11px] font-semibold sm:text-xs">
                  {formatCurrency(total, currency, { compact: true })}
                </span>
              )}
              <div className="mt-1 hidden flex-wrap gap-0.5 sm:flex">
                {dayExpenses.slice(0, 4).map((e) => (
                  <span
                    key={e.id}
                    draggable
                    onDragStart={() => setDragId(e.id)}
                    onClick={(ev) => ev.stopPropagation()}
                    className="h-1.5 w-1.5 cursor-grab rounded-full"
                    style={{ backgroundColor: e.categoryColor }}
                    title={`${e.categoryName} · drag to move`}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Day detail dialog */}
      <Dialog open={Boolean(selectedDay)} onOpenChange={(v) => !v && setSelectedDay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDay && format(new Date(selectedDay + "T12:00:00"), "EEEE, d MMMM")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedExpenses.length} expense{selectedExpenses.length === 1 ? "" : "s"} ·{" "}
                {formatCurrency(selectedTotal, currency)}
              </span>
              <Button
                size="sm"
                onClick={() => {
                  setAddDate(selectedDay);
                  setSelectedDay(null);
                }}
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {selectedExpenses.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Nothing logged this day.</p>
              )}
              {selectedExpenses.map((e) => (
                <div key={e.id} className="flex items-center gap-2 rounded-xl border p-2.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.categoryColor }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.note || e.categoryName}</p>
                    <p className="text-xs text-muted-foreground">{e.categoryName}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]" style={{ color: IMPORTANCE_META[e.importance].color }}>
                    {IMPORTANCE_META[e.importance].label}
                  </Badge>
                  <span className="text-sm font-semibold">{formatCurrency(e.amount, currency)}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick add for a specific day */}
      {addDate && (
        <ExpenseForm
          categories={categories}
          accounts={accounts}
          open={Boolean(addDate)}
          onOpenChange={(v) => !v && setAddDate(null)}
          defaultDate={addDate}
        />
      )}
    </div>
  );
}
