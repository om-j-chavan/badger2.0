"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { BadgerLogo } from "@/components/shared/badger-logo";
import { useAction } from "@/hooks/use-action";
import { signInLocal, signUpLocal } from "@/app/actions/auth-local";

export function LocalAuthForm({ mode }: { mode: "signin" | "signup" }) {
  const { run, pending, fieldErrors } = useAction();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSignUp = mode === "signup";

  const [identifier, setIdentifier] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isSignUp) {
      const res = await run(() => signUpLocal({ username, email, name, password }), {
        successMessage: "Welcome to Badger!",
      });
      if (res.ok) router.push("/onboarding");
    } else {
      const res = await run(() => signInLocal({ identifier, password }), {
        successMessage: "Welcome back!",
      });
      if (res.ok) router.push(searchParams.get("redirect_url") || "/dashboard");
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-6">
        <div className="mb-6 flex flex-col items-center text-center">
          <BadgerLogo className="h-14 w-14" />
          <h1 className="mt-3 text-2xl font-bold">
            {isSignUp ? "Create your Badger account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignUp ? "Takes a few seconds — no email needed to verify." : "Sign in to your money companion."}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {isSignUp ? (
            <>
              <Field label="Username" error={fieldErrors.username?.[0]}>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="moneybadger" autoComplete="username" required />
              </Field>
              <Field label="Email" error={fieldErrors.email?.[0]}>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
              </Field>
              <Field label="Name (optional)">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
              </Field>
              <Field label="Password" error={fieldErrors.password?.[0]}>
                <PasswordInput value={password} onChange={setPassword} placeholder="Your password" autoComplete="new-password" />
              </Field>
            </>
          ) : (
            <>
              <Field label="Username or email">
                <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="moneybadger" autoComplete="username" required />
              </Field>
              <Field label="Password">
                <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
              </Field>
            </>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isSignUp ? (
            <>Already have an account? <Link href="/sign-in" className="font-medium text-primary hover:underline">Sign in</Link></>
          ) : (
            <>New here? <Link href="/sign-up" className="font-medium text-primary hover:underline">Create an account</Link></>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={cn("pr-10")}
        required
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        aria-label={show ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
