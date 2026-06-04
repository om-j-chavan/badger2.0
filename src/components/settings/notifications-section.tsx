"use client";

import * as React from "react";
import { Bell, BellOff, Mail, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useAction } from "@/hooks/use-action";
import {
  savePushSubscription,
  removePushSubscription,
  sendTestPush,
  setEmailReminders,
} from "@/app/actions/push";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function NotificationsSection({
  vapidPublicKey,
  emailReminders,
  emailConfigured,
  pushConfigured,
}: {
  vapidPublicKey: string;
  emailReminders: boolean;
  emailConfigured: boolean;
  pushConfigured: boolean;
}) {
  const { run } = useAction();
  const { toast } = useToast();
  const [emailOn, setEmailOn] = React.useState(emailReminders);
  const [pushOn, setPushOn] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [supported, setSupported] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      return;
    }
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      setPushOn(Boolean(sub));
    });
  }, []);

  async function enablePush() {
    if (!supported) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast({ title: "Notifications blocked", description: "Allow notifications in your browser to enable push.", variant: "error" });
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const res = await savePushSubscription({ endpoint: json.endpoint, keys: json.keys });
      if (res.ok) {
        setPushOn(true);
        toast({ title: "Push notifications on", variant: "success" });
      } else {
        toast({ title: res.error, variant: "error" });
      }
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Couldn't enable push", variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setPushOn(false);
      toast({ title: "Push notifications off", variant: "success" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4" /> Email reminders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Upcoming payment digest</p>
              <p className="text-sm text-muted-foreground">A daily email when subscriptions, insurance or EMIs are due soon.</p>
            </div>
            <Switch
              checked={emailOn}
              onCheckedChange={(v) => {
                setEmailOn(v);
                run(() => setEmailReminders(v), { successMessage: v ? "Email reminders on" : "Email reminders off" });
              }}
            />
          </div>
          {!emailConfigured && (
            <p className="rounded-lg bg-warning/10 p-2 text-xs text-warning">
              Email isn't configured on the server yet (set BREVO_API_KEY + EMAIL_FROM). Your preference is saved and will apply once it is.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4" /> Push notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Get an instant nudge on this device when a payment is coming up — free, no SMS needed.
          </p>
          {!supported ? (
            <p className="rounded-lg bg-muted p-2 text-xs text-muted-foreground">
              This browser doesn't support push notifications.
            </p>
          ) : !pushConfigured ? (
            <p className="rounded-lg bg-warning/10 p-2 text-xs text-warning">
              Push isn't configured on the server yet (set the VAPID keys).
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {pushOn ? (
                <>
                  <Button variant="outline" onClick={disablePush} disabled={busy}>
                    <BellOff className="h-4 w-4" /> Turn off on this device
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => run(() => sendTestPush(), { successMessage: "Test sent — check your notifications!" })}
                    disabled={busy}
                  >
                    <Send className="h-4 w-4" /> Send test
                  </Button>
                </>
              ) : (
                <Button onClick={enablePush} disabled={busy}>
                  <Bell className="h-4 w-4" /> {busy ? "Enabling…" : "Enable on this device"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
