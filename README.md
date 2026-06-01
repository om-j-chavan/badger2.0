# 🦡 Badger — Your Friendly Money Companion

Badger is a production-ready personal finance application that makes money management
approachable, engaging and non-intimidating. It's not accounting software — it's a warm,
smart sidekick that helps you spend, save and plan with confidence.

Built with **Next.js 15 (App Router)**, **TypeScript**, **Prisma + Neon PostgreSQL**,
**Clerk** auth, **TanStack Query**, **Tailwind + shadcn/ui**, **Recharts**, and a
provider-agnostic **AI assistant**.

---

## ✨ Features

| Area | What it does |
|------|--------------|
| **Dashboard** | Spending (actual + effective), savings/investment rate, budget remaining, commitment burden, health score, upcoming payments, goals, account balances, 6-month trend. |
| **Expenses** | Fast logging with category, importance (Essential/Useful/Luxury/Investment), mood, account, note. Edit, delete, paginate. |
| **Calendar** | Monthly grid with per-day totals & counts. Tap a day for details + quick-add. Drag dots to move expenses between days. |
| **Recurring** | Daily → yearly + custom intervals. Instances auto-generated on each visit. |
| **Distributed** | Spread a one-off payment across the months it covers (e.g. ₹4000 internet ÷ 6 = ₹667/mo effective). |
| **Subscriptions** | Track services, see true monthly & yearly burden, renewal reminders. |
| **Loans** | EMI calculation, payoff progress, interest paid, EMI burden bands, **prepayment simulator**. |
| **Commitments** | Unified engine over loans, subs, distributed, insurance & memberships — each exposes monthly impact, next due & status. |
| **Budget planner** | Plan by priority; auto-generates **Safe / Savings-Focused / Emergency** budgets. |
| **Goals** | Targets with progress, completion estimates and contributions. |
| **Budget health score** | 0–100 from savings, investment, debt, essential & luxury ratios — always encouraging, never shaming. |
| **Insights** | Spending personality (Planner/Saver/Investor/Impulsive/Balanced) + personalised nudges. |
| **Gamification** | Levels, XP, badges and streaks. |
| **Badger AI** | Help center, deep-link navigation, natural-language data entry (with confirm), financial Q&A, and search — provider-agnostic with an offline fallback. |
| **Import/Export** | JSON (full backup/restore), CSV & Excel. |

---

## 🏗️ Architecture

```
src/
├─ app/
│  ├─ (auth)/                 # Clerk sign-in / sign-up
│  ├─ (app)/                  # Authenticated shell (sidebar + bottom nav + topbar)
│  │  ├─ dashboard, expenses, calendar, recurring, distributed,
│  │  │  subscriptions, loans, commitments, budget, goals,
│  │  │  review, insights, accounts, achievements, settings, assistant
│  ├─ actions/                # Server Actions (validated, ownership-checked, audited)
│  ├─ api/                    # Route handlers: export, import, clerk webhook
│  ├─ onboarding/             # First-run setup
│  └─ layout.tsx, page.tsx    # Root layout + landing
├─ components/
│  ├─ ui/                     # shadcn-style primitives
│  ├─ layout/, shared/, charts/
│  └─ <feature>/              # Feature client components (forms, managers)
├─ lib/
│  ├─ prisma, auth, ownership, audit, rate-limit, validators, currency, dates
│  ├─ finance/                # Pure domain logic: emi, prepayment, effective-cost,
│  │                          # health-score, personality, budget-plan
│  ├─ services/               # DB aggregations: summary, commitments, trend,
│  │                          # gamification, recurring, search, data-transfer
│  └─ ai/                     # provider abstraction, OpenAI adapter, nl-parser,
│                             # page-registry, assistant orchestrator
├─ hooks/
├─ middleware.ts              # Clerk route protection
prisma/
├─ schema.prisma              # Full data model
└─ seed.ts                    # Badge catalogue + rich demo user
```

**Design principles**

- **Server Components** for reads, **Server Actions** for mutations, **Route Handlers** for streaming/files.
- **Security**: every mutation runs through `requireUserId()` + `requireOwnership()`, wrapped in Prisma transactions, with audit logging and rate-limiting on expensive endpoints.
- **Pure domain layer** (`lib/finance/*`) is framework-free and unit-testable.
- **AI is provider-agnostic** — swap OpenAI for any vendor by adding one adapter implementing `AiProvider`. With no API key, a deterministic parser still powers NL entry, navigation and search.
- **Effective vs Actual** spending is available wherever it matters.

---

## 🚀 Getting started (local)

### 1. Prerequisites
- Node.js 20+ and npm
- A PostgreSQL database — local (any local Postgres) or [Neon](https://neon.tech) (free)
- *(optional)* An OpenAI API key

> **Auth modes.** Badger supports two, switched via `NEXT_PUBLIC_AUTH_MODE`:
> - `local` — built-in **username + password** auth with hashed passwords (scrypt)
>   and server-side cookie sessions. **No external account needed.** Ideal for
>   running fully on your machine.
> - `clerk` — [Clerk](https://clerk.com)-hosted auth (set the `CLERK_*` keys).
>   Recommended for production; works on localhost too.
>
> The seeded demo account logs in (local mode) with **username `demo` / password `badger123`**.

### 2. Install
```bash
npm install
```

### 3. Configure environment
Copy `.env.example` to `.env` and fill in real values:
```bash
cp .env.example .env
```
- `DATABASE_URL` / `DIRECT_URL` — from your Neon dashboard (pooled + direct).
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — from Clerk → API Keys.
- `OPENAI_API_KEY` — optional. Leave blank to use the built-in smart fallback.

### 4. Set up the database
```bash
npm run db:push      # create tables from the schema (or: npm run db:migrate)
npm run db:seed      # seed badge catalogue + a demo user with sample data
```

### 5. Run
```bash
npm run dev
```
Open http://localhost:3000, sign up, and you're in. 🦡

---

## ☁️ Deploying to Vercel

1. **Push** this repo to GitHub.
2. **Neon**: create a project; copy the **pooled** connection string into `DATABASE_URL`
   and the **direct** string into `DIRECT_URL`.
3. **Vercel**: import the repo. Add all variables from `.env.example` in
   *Project → Settings → Environment Variables*.
4. **Build command** is `prisma generate && next build` (already in `package.json`).
   Run migrations against Neon once from your machine or CI:
   ```bash
   npm run db:migrate    # or: npx prisma db push
   npm run db:seed       # optional: seed badge catalogue (recommended in prod too)
   ```
   > The `Badge` catalogue must exist for gamification to award badges. The seed
   > upserts badges idempotently, so it's safe to run against production.
5. **Clerk**: in the Clerk dashboard set your production domain and the sign-in/up URLs
   (`/sign-in`, `/sign-up`). Add a **webhook** to `https://<your-domain>/api/webhooks/clerk`
   for `user.created`, `user.updated`, `user.deleted`, and put its signing secret in
   `CLERK_WEBHOOK_SECRET`. (User provisioning also happens lazily on first request, so
   the app works even before the webhook is configured.)
6. **Deploy**. Vercel will build and host the app on its edge/serverless platform.

---

## 🧪 Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (`prisma generate` + `next build`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` | Push schema to the DB (no migration history) |
| `npm run db:migrate` | Create & apply a dev migration |
| `npm run db:seed` | Seed badges + demo data |
| `npm run db:studio` | Open Prisma Studio |

---

## 🔌 Swapping the AI provider

`src/lib/ai/providers/openai.ts` implements the `AiProvider` interface
(`src/lib/ai/types.ts`). To use another vendor:

1. Add `src/lib/ai/providers/<vendor>.ts` implementing `AiProvider`.
2. Register it in `getProvider()` inside `src/lib/ai/assistant.ts` (switch on `AI_PROVIDER`).
3. Set `AI_PROVIDER=<vendor>` and its key in `.env`.

The deterministic NL parser (`src/lib/ai/nl-parser.ts`) runs first regardless, so
"spent 500 on fuel today" works with or without an LLM.

---

## 🔐 Security notes

- All data is scoped per-user; `requireOwnership` blocks cross-user access on every mutation.
- Inputs are validated server-side with Zod (`src/lib/validators.ts`).
- Mutations run in transactions; balance/loan math is atomic.
- Audit log records every significant action (`AuditLog`).
- Expensive endpoints (AI, import, export) are rate-limited.

---

Made with care. 🦡
