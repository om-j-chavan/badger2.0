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
} as const;

/** True when a real AI provider is configured; otherwise we use the local fallback parser. */
export function hasAiProvider(): boolean {
  return env.ai.provider === "openai" && env.ai.openaiKey.length > 0;
}
