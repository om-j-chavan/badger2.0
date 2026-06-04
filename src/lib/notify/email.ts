import { env, hasEmail } from "../env";

export interface EmailMessage {
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send a transactional email via Brevo's REST API (no SDK, no domain needed —
 * just a verified single sender). Returns true on success; never throws so a
 * failed email can't break a cron run.
 */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  if (!hasEmail()) return false;
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": env.email.brevoKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: env.email.from, name: env.email.fromName },
        to: [{ email: msg.to, name: msg.toName ?? undefined }],
        subject: msg.subject,
        htmlContent: msg.html,
        textContent: msg.text ?? stripHtml(msg.html),
      }),
    });
    if (!res.ok) {
      console.error("[email] brevo error", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send failed", err);
    return false;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Minimal, friendly Badger email shell. */
export function emailLayout(title: string, bodyHtml: string, ctaUrl?: string): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#faf9f6;padding:24px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eee">
      <div style="background:#10b981;padding:20px 24px;color:#fff;font-size:20px;font-weight:700">🦡 Badger</div>
      <div style="padding:24px;color:#1f2937;font-size:15px;line-height:1.6">
        <h1 style="font-size:18px;margin:0 0 12px">${title}</h1>
        ${bodyHtml}
        ${ctaUrl ? `<div style="margin-top:20px"><a href="${ctaUrl}" style="background:#10b981;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600;display:inline-block">Open Badger</a></div>` : ""}
      </div>
      <div style="padding:16px 24px;color:#9ca3af;font-size:12px;border-top:1px solid #f1f1f1">
        You're getting this because email reminders are on in Badger. Manage them in Settings.
      </div>
    </div>
  </div>`;
}
