import { z } from "zod";

const money = z.coerce
  .number({ invalid_type_error: "Enter a valid amount" })
  .positive("Amount must be greater than zero")
  .max(1_000_000_000, "That amount looks too large");

const optionalMoney = z.coerce.number().min(0).max(1_000_000_000);

const isoDate = z.coerce.date();

export const importanceEnum = z.enum(["ESSENTIAL", "USEFUL", "LUXURY", "INVESTMENT"]);
export const moodEnum = z.enum(["GREAT", "GOOD", "NEUTRAL", "REGRET", "STRESSED"]);
export const accountTypeEnum = z.enum([
  "CASH", "BANK", "SAVINGS", "CREDIT_CARD", "UPI", "INVESTMENT", "WALLET", "OTHER",
]);
export const recurrenceEnum = z.enum([
  "DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM",
]);
export const subFrequencyEnum = z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]);
export const loanTypeEnum = z.enum(["PERSONAL", "VEHICLE", "HOME", "EDUCATION", "OTHER"]);
export const insuranceTypeEnum = z.enum(["HEALTH", "LIFE", "VEHICLE", "HOME", "TRAVEL", "OTHER"]);
export const budgetPriorityEnum = z.enum(["MUST_HAVE", "SHOULD_HAVE", "NICE_TO_HAVE"]);

// --- Accounts ---------------------------------------------------------------
export const accountSchema = z.object({
  name: z.string().trim().min(1, "Give it a name").max(60),
  type: accountTypeEnum.default("BANK"),
  currentBalance: optionalMoney.default(0),
  color: z.string().default("#10b981"),
  icon: z.string().default("wallet"),
});

// --- Income -----------------------------------------------------------------
export const incomeSchema = z.object({
  accountId: z.string().cuid().optional().nullable(),
  amount: money,
  source: z.string().trim().min(1, "Where's it from?").max(60).default("Salary"),
  date: isoDate,
  note: z.string().trim().max(200).optional().nullable(),
});

// --- Transfer ---------------------------------------------------------------
export const transferSchema = z
  .object({
    fromAccountId: z.string().cuid({ message: "Pick a source account" }),
    toAccountId: z.string().cuid({ message: "Pick a destination account" }),
    amount: money,
    date: isoDate,
    note: z.string().trim().max(200).optional().nullable(),
    isCardPayment: z.boolean().default(false),
  })
  .refine((d) => d.fromAccountId !== d.toAccountId, {
    message: "Choose two different accounts",
    path: ["toAccountId"],
  });

// --- Categories -------------------------------------------------------------
export const categorySchema = z.object({
  name: z.string().trim().min(1, "Give it a name").max(40),
  icon: z.string().default("circle"),
  color: z.string().default("#64748b"),
});

// --- Expenses ---------------------------------------------------------------
export const expenseSchema = z.object({
  accountId: z.string().cuid().optional().nullable(),
  categoryId: z.string().cuid({ message: "Pick a category" }),
  date: isoDate,
  amount: money,
  importance: importanceEnum.default("USEFUL"),
  note: z.string().trim().max(280).optional().nullable(),
  mood: moodEnum.optional().nullable(),
  paymentMethod: z.string().trim().max(40).optional().nullable(),
});

export const expenseUpdateSchema = expenseSchema.partial().extend({
  id: z.string().cuid(),
});

// --- Recurring --------------------------------------------------------------
export const recurringSchema = z.object({
  name: z.string().trim().min(1).max(80),
  categoryId: z.string().cuid(),
  amount: money,
  importance: importanceEnum.default("USEFUL"),
  frequency: recurrenceEnum.default("MONTHLY"),
  intervalCount: z.coerce.number().int().min(1).max(365).default(1),
  startDate: isoDate,
  endDate: isoDate.optional().nullable(),
});

// --- Distributed ------------------------------------------------------------
export const distributedSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    categoryId: z.string().cuid(),
    totalAmount: money,
    // How much of the total has already been paid (logged as actual spend).
    amountPaid: optionalMoney.default(0),
    coverageMonths: z.coerce.number().int().min(1).max(120),
    startDate: isoDate,
    importance: importanceEnum.default("ESSENTIAL"),
    note: z.string().trim().max(280).optional().nullable(),
  })
  .refine((d) => d.amountPaid <= d.totalAmount, {
    message: "Already paid can't exceed the total",
    path: ["amountPaid"],
  });

// --- Subscriptions ----------------------------------------------------------
export const subscriptionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  categoryId: z.string().cuid().optional().nullable(),
  cost: money,
  frequency: subFrequencyEnum.default("MONTHLY"),
  renewalDate: isoDate,
  icon: z.string().default("repeat"),
  color: z.string().default("#6366f1"),
  remindDaysBefore: z.coerce.number().int().min(0).max(60).default(3),
});

// --- Loans ------------------------------------------------------------------
export const loanSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    lender: z.string().trim().max(80).optional().nullable(),
    type: loanTypeEnum.default("PERSONAL"),
    principalAmount: money,
    interestRate: z.coerce.number().min(0).max(100),
    tenureMonths: z.coerce.number().int().min(1).max(600),
    startDate: isoDate,
    // emiAmount is computed server-side but can be overridden for odd schedules.
    emiAmount: optionalMoney.optional(),
    // Principal already repaid (for loans you're partway through).
    amountPaid: optionalMoney.default(0),
  })
  .refine((d) => d.amountPaid <= d.principalAmount, {
    message: "Already paid can't exceed the principal",
    path: ["amountPaid"],
  });

export const loanPaymentSchema = z.object({
  loanId: z.string().cuid(),
  date: isoDate,
  amount: money,
  isPrepayment: z.boolean().default(false),
  note: z.string().trim().max(200).optional().nullable(),
});

export const prepaymentSimSchema = z.object({
  loanId: z.string().cuid(),
  extraMonthly: optionalMoney.default(0),
  lumpSum: optionalMoney.default(0),
});

// --- Insurance / Membership -------------------------------------------------
export const insuranceSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: insuranceTypeEnum.default("HEALTH"),
  premium: money,
  frequency: subFrequencyEnum.default("YEARLY"),
  coverageAmount: optionalMoney.optional().nullable(),
  renewalDate: isoDate,
  provider: z.string().trim().max(80).optional().nullable(),
});

export const membershipSchema = z.object({
  name: z.string().trim().min(1).max(80),
  cost: money,
  frequency: subFrequencyEnum.default("YEARLY"),
  renewalDate: isoDate,
});

// --- Budget -----------------------------------------------------------------
export const budgetItemSchema = z.object({
  label: z.string().trim().min(1).max(60),
  amount: money,
  priority: budgetPriorityEnum.default("SHOULD_HAVE"),
  categoryId: z.string().cuid().optional().nullable(),
});

export const budgetSchema = z.object({
  name: z.string().trim().min(1).max(60).default("Monthly Budget"),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  monthlyIncome: money,
  items: z.array(budgetItemSchema).default([]),
});

// --- Goals ------------------------------------------------------------------
export const goalSchema = z.object({
  name: z.string().trim().min(1).max(80),
  icon: z.string().default("target"),
  color: z.string().default("#10b981"),
  targetAmount: money,
  currentAmount: optionalMoney.default(0),
  targetDate: isoDate.optional().nullable(),
});

export const goalContributionSchema = z.object({
  goalId: z.string().cuid(),
  amount: money,
  date: isoDate.optional(),
  note: z.string().trim().max(200).optional().nullable(),
});

// --- Profile ----------------------------------------------------------------
export const profileSchema = z.object({
  name: z.string().trim().max(80).optional().nullable(),
  email: z.string().trim().email("Enter a valid email").optional(),
  currency: z.string().length(3).optional(),
  timezone: z.string().max(60).optional(),
  monthlyIncome: optionalMoney.optional().nullable(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
export type LoanInput = z.infer<typeof loanSchema>;
export type SubscriptionInput = z.infer<typeof subscriptionSchema>;
export type DistributedInput = z.infer<typeof distributedSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
