/**
 * Centralised, validated environment access.
 * Avoids scattering `process.env` reads and provides safe defaults.
 */

function optional(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export const env = {
  databaseUrl: optional("DATABASE_URL"),
  directUrl: optional("DIRECT_URL"),

  clerk: {
    publishableKey: optional("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
    secretKey: optional("CLERK_SECRET_KEY"),
    webhookSecret: optional("CLERK_WEBHOOK_SECRET"),
  },

  ai: {
    provider: optional("AI_PROVIDER", "openai"),
    openaiKey: optional("OPENAI_API_KEY"),
    openaiModel: optional("OPENAI_MODEL", "gpt-4o-mini"),
    openaiBaseUrl: optional("OPENAI_BASE_URL"),
  },

  app: {
    url: optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
    defaultCurrency: optional("NEXT_PUBLIC_DEFAULT_CURRENCY", "INR"),
  },

  email: {
    brevoKey: optional("BREVO_API_KEY"),
    from: optional("EMAIL_FROM"),
    fromName: optional("EMAIL_FROM_NAME", "Badger"),
  },

  push: {
    publicKey: optional("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),
    privateKey: optional("VAPID_PRIVATE_KEY"),
    subject: optional("VAPID_SUBJECT", "mailto:hello@badger.app"),
  },

  cronSecret: optional("CRON_SECRET"),
} as const;

/** True when a real AI provider is configured; otherwise we use the local fallback parser. */
export function hasAiProvider(): boolean {
  return env.ai.provider === "openai" && env.ai.openaiKey.length > 0;
}

/** Email sending is available when a Brevo key and verified sender are configured. */
export function hasEmail(): boolean {
  return env.email.brevoKey.length > 0 && env.email.from.length > 0;
}

/** Web Push is available when VAPID keys are configured. */
export function hasPush(): boolean {
  return env.push.publicKey.length > 0 && env.push.privateKey.length > 0;
}
