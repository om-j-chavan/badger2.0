import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { IS_LOCAL_AUTH } from "@/lib/dev-auth";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Wallet,
  PiggyBank,
  Calendar,
  Bot,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";

const FEATURES = [
  { icon: Wallet, title: "Effortless tracking", body: "Log expenses in seconds — or just tell Badger AI in plain English." },
  { icon: Calendar, title: "See your month", body: "A friendly calendar shows where your money goes, day by day." },
  { icon: PiggyBank, title: "Budgets that fit", body: "Plan by priority and get Safe, Savings and Emergency budgets instantly." },
  { icon: TrendingUp, title: "Loans, demystified", body: "Track EMIs, see payoff progress and simulate prepayments." },
  { icon: Bot, title: "Your money buddy", body: "Ask anything. Badger AI knows your data and every screen." },
  { icon: ShieldCheck, title: "Yours alone", body: "Private by design with strict per-user data isolation." },
];

export default async function LandingPage() {
  if (IS_LOCAL_AUTH) {
    const user = await getCurrentUser();
    if (user) redirect("/dashboard");
  } else {
    const { userId } = await auth();
    if (userId) redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-accent/40">
      <header className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-2 text-lg font-bold">
          <span className="text-2xl">🦡</span> Badger
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Get started</Link>
          </Button>
        </div>
      </header>

      <section className="container flex flex-col items-center pt-16 pb-24 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" /> Money management that feels friendly
        </div>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Meet <span className="text-primary">Badger</span>, your money companion
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Not accounting software. A warm, smart sidekick that helps you spend, save and plan with
          confidence — and never makes you feel bad about it.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/sign-up">Start for free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/sign-in">I already have an account</Link>
          </Button>
        </div>
      </section>

      <section className="container grid gap-5 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        Built with care. 🦡 Badger — your friendly money companion.
      </footer>
    </main>
  );
}
