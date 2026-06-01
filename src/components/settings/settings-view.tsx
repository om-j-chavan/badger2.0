"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Download, Upload, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useAction } from "@/hooks/use-action";
import { CURRENCIES } from "@/lib/constants";
import { IS_LOCAL_AUTH } from "@/lib/dev-auth";
import { updateProfile } from "@/app/actions/profile";
import { createCategory, deleteCategory } from "@/app/actions/category";
import { changePasswordLocal } from "@/app/actions/auth-local";

interface Category {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
}

export function SettingsView({
  profile,
  categories,
}: {
  profile: { name: string | null; currency: string; timezone: string; monthlyIncome: number | null };
  categories: Category[];
}) {
  return (
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="data">Data</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <div className="space-y-4">
          <ProfileSection profile={profile} />
          {IS_LOCAL_AUTH && <ChangePasswordSection />}
        </div>
      </TabsContent>
      <TabsContent value="categories"><CategorySection categories={categories} /></TabsContent>
      <TabsContent value="data"><DataSection /></TabsContent>
    </Tabs>
  );
}

function ProfileSection({ profile }: { profile: { name: string | null; currency: string; timezone: string; monthlyIncome: number | null } }) {
  const { run, pending } = useAction();
  const [name, setName] = React.useState(profile.name ?? "");
  const [currency, setCurrency] = React.useState(profile.currency);
  const [income, setIncome] = React.useState(profile.monthlyIncome ? String(profile.monthlyIncome) : "");
  const [timezone, setTimezone] = React.useState(profile.timezone);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await run(
      () => updateProfile({ name, currency, timezone, monthlyIncome: income ? Number(income) : null }),
      { successMessage: "Profile saved" },
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>Your profile</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Currency</Label>
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
              <Label htmlFor="income">Monthly income</Label>
              <Input id="income" type="number" step="0.01" value={income} onChange={(e) => setIncome(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="tz">Timezone</Label>
              <Input id="tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Asia/Kolkata" />
            </div>
          </div>
          <Button type="submit" disabled={pending}><Save className="h-4 w-4" /> {pending ? "Saving…" : "Save changes"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ChangePasswordSection() {
  const { run, pending, fieldErrors } = useAction();
  const { toast } = useToast();
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      toast({ title: "New passwords don't match", variant: "error" });
      return;
    }
    const res = await run(() => changePasswordLocal({ currentPassword: current, newPassword: next }), {
      successMessage: "Password updated",
    });
    if (res.ok) {
      setCurrent("");
      setNext("");
      setConfirm("");
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          <div className="max-w-sm">
            <Label htmlFor="cur-pw">Current password</Label>
            <Input id="cur-pw" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
            {fieldErrors.currentPassword && <p className="mt-1 text-xs text-destructive">{fieldErrors.currentPassword[0]}</p>}
          </div>
          <div className="grid max-w-md gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="new-pw">New password</Label>
              <Input id="new-pw" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
              {fieldErrors.newPassword && <p className="mt-1 text-xs text-destructive">{fieldErrors.newPassword[0]}</p>}
            </div>
            <div>
              <Label htmlFor="confirm-pw">Confirm new password</Label>
              <Input id="confirm-pw" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Changing your password signs out any other devices. This one stays signed in.
          </p>
          <Button type="submit" disabled={pending}>
            <Save className="h-4 w-4" /> {pending ? "Updating…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CategorySection({ categories }: { categories: Category[] }) {
  const { run, pending } = useAction();
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState("#10b981");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const res = await run(() => createCategory({ name, color }), { successMessage: "Category added" });
    if (res.ok) setName("");
  }

  return (
    <Card>
      <CardHeader><CardTitle>Categories</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={add} className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="cat-name">New category</Label>
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Pets" required />
          </div>
          <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 p-1" />
          <Button type="submit" disabled={pending}><Plus className="h-4 w-4" /> Add</Button>
        </form>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span key={c.id} className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
              {c.name}
              {!c.isDefault && (
                <button onClick={() => run(() => deleteCategory(c.id), { successMessage: "Deleted" })} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DataSection() {
  const { toast } = useToast();
  const router = useRouter();
  const [importing, setImporting] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const res = await fetch("/api/import", { method: "POST", body: text, headers: { "Content-Type": "application/json" } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      const s = data.summary;
      toast({
        title: "Import complete",
        description: `${s.expenses} expenses, ${s.subscriptions} subs, ${s.loans} loans, ${s.goals} goals restored.`,
        variant: "success",
      });
      router.refresh();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Import failed", variant: "error" });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Export your data</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Download everything — your data is always yours.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild><a href="/api/export?format=json" download><Download className="h-4 w-4" /> JSON (full backup)</a></Button>
            <Button variant="outline" asChild><a href="/api/export?format=csv" download><Download className="h-4 w-4" /> CSV (expenses)</a></Button>
            <Button variant="outline" asChild><a href="/api/export?format=xlsx" download><Download className="h-4 w-4" /> Excel (all sheets)</a></Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Import data</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Restore from a Badger JSON backup. Existing data is kept; imported records are added.</p>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
            <Upload className="h-4 w-4" /> {importing ? "Importing…" : "Choose JSON file"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
