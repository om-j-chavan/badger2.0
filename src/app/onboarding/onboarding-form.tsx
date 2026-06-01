"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAction } from "@/hooks/use-action";
import { CURRENCIES } from "@/lib/constants";
import { completeOnboarding } from "@/app/actions/profile";

export function OnboardingForm({ defaultName, defaultCurrency }: { defaultName: string; defaultCurrency: string }) {
  const { run, pending } = useAction();
  const router = useRouter();
  const [name, setName] = React.useState(defaultName);
  const [currency, setCurrency] = React.useState(defaultCurrency);
  const [income, setIncome] = React.useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await run(
      () => completeOnboarding({ name, currency, monthlyIncome: income ? Number(income) : null }),
      { successMessage: "All set!" },
    );
    if (res.ok) router.push("/dashboard");
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-6">
        <div className="mb-6 text-center">
          <span className="text-5xl">🦡</span>
          <h1 className="mt-3 text-2xl font-bold">Welcome to Badger!</h1>
          <p className="mt-1 text-sm text-muted-foreground">A couple of quick things and you're in.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="o-name">What should we call you?</Label>
            <Input id="o-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <Label>Your currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.symbol} {c.label} ({c.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="o-income">Monthly income (optional)</Label>
            <Input id="o-income" type="number" step="0.01" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="Helps with budgets & health score" />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Setting up…" : "Start using Badger"}
          </Button>
          <button type="button" onClick={() => router.push("/dashboard")} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
            Skip for now
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
