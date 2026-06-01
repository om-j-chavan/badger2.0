"use client";

import * as React from "react";
import { format } from "date-fns";
import { Plus, Shield, BadgeCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAction } from "@/hooks/use-action";
import { INSURANCE_TYPE_META, SUBSCRIPTION_FREQUENCY_META } from "@/lib/constants";
import { createInsurance, createMembership } from "@/app/actions/commitment-sources";

type Freq = keyof typeof SUBSCRIPTION_FREQUENCY_META;

export function CommitmentExtras() {
  const [insOpen, setInsOpen] = React.useState(false);
  const [memOpen, setMemOpen] = React.useState(false);

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => setInsOpen(true)}>
        <Shield className="h-4 w-4" /> Add insurance
      </Button>
      <Button variant="outline" size="sm" onClick={() => setMemOpen(true)}>
        <BadgeCheck className="h-4 w-4" /> Add membership
      </Button>
      <InsuranceDialog open={insOpen} onOpenChange={setInsOpen} />
      <MembershipDialog open={memOpen} onOpenChange={setMemOpen} />
    </div>
  );
}

function InsuranceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { run, pending } = useAction();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<keyof typeof INSURANCE_TYPE_META>("HEALTH");
  const [premium, setPremium] = React.useState("");
  const [frequency, setFrequency] = React.useState<Freq>("YEARLY");
  const [renewalDate, setRenewalDate] = React.useState(format(new Date(), "yyyy-MM-dd"));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await run(
      () => createInsurance({ name, type, premium: Number(premium), frequency, renewalDate: new Date(renewalDate) }),
      { successMessage: "Insurance added", onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add insurance</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="i-name">Name</Label>
            <Input id="i-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Health cover" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as keyof typeof INSURANCE_TYPE_META)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(INSURANCE_TYPE_META) as (keyof typeof INSURANCE_TYPE_META)[]).map((t) => (
                    <SelectItem key={t} value={t}>{INSURANCE_TYPE_META[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as Freq)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(SUBSCRIPTION_FREQUENCY_META) as Freq[]).map((f) => (
                    <SelectItem key={f} value={f}>{SUBSCRIPTION_FREQUENCY_META[f].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="i-premium">Premium</Label>
              <Input id="i-premium" type="number" step="0.01" value={premium} onChange={(e) => setPremium(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="i-renew">Renewal</Label>
              <Input id="i-renew" type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} required />
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

function MembershipDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { run, pending } = useAction();
  const [name, setName] = React.useState("");
  const [cost, setCost] = React.useState("");
  const [frequency, setFrequency] = React.useState<Freq>("YEARLY");
  const [renewalDate, setRenewalDate] = React.useState(format(new Date(), "yyyy-MM-dd"));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await run(
      () => createMembership({ name, cost: Number(cost), frequency, renewalDate: new Date(renewalDate) }),
      { successMessage: "Membership added", onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add membership</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="m-name">Name</Label>
            <Input id="m-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Costco" required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="m-cost">Cost</Label>
              <Input id="m-cost" type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} required />
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as Freq)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(SUBSCRIPTION_FREQUENCY_META) as Freq[]).map((f) => (
                    <SelectItem key={f} value={f}>{SUBSCRIPTION_FREQUENCY_META[f].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="m-renew">Renewal</Label>
              <Input id="m-renew" type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} required />
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
