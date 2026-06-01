import type {
  AccountType,
  Importance,
  LoanType,
  Mood,
  RecurrenceFrequency,
  SubscriptionFrequency,
  BudgetPriority,
  InsuranceType,
} from "@prisma/client";

export const DEFAULT_CATEGORIES: { name: string; icon: string; color: string }[] = [
  { name: "Food", icon: "utensils", color: "#f97316" },
  { name: "Transport", icon: "bus", color: "#06b6d4" },
  { name: "Fuel", icon: "fuel", color: "#ef4444" },
  { name: "Rent", icon: "home", color: "#8b5cf6" },
  { name: "Utilities", icon: "plug", color: "#eab308" },
  { name: "Internet", icon: "wifi", color: "#3b82f6" },
  { name: "Phone", icon: "smartphone", color: "#14b8a6" },
  { name: "Entertainment", icon: "clapperboard", color: "#ec4899" },
  { name: "Shopping", icon: "shopping-bag", color: "#f43f5e" },
  { name: "Health", icon: "heart-pulse", color: "#10b981" },
  { name: "Gym", icon: "dumbbell", color: "#84cc16" },
  { name: "Education", icon: "graduation-cap", color: "#6366f1" },
  { name: "Travel", icon: "plane", color: "#0ea5e9" },
  { name: "Investment", icon: "trending-up", color: "#22c55e" },
  { name: "Insurance", icon: "shield", color: "#64748b" },
  { name: "Miscellaneous", icon: "circle-dashed", color: "#94a3b8" },
];

export const IMPORTANCE_META: Record<
  Importance,
  { label: string; color: string; description: string }
> = {
  ESSENTIAL: {
    label: "Essential",
    color: "#10b981",
    description: "Things you genuinely need to live and function.",
  },
  USEFUL: {
    label: "Useful",
    color: "#3b82f6",
    description: "Helpful and worthwhile, but not strictly necessary.",
  },
  LUXURY: {
    label: "Luxury",
    color: "#f59e0b",
    description: "Treats and wants. Totally fine in moderation!",
  },
  INVESTMENT: {
    label: "Investment",
    color: "#8b5cf6",
    description: "Spending that grows your wealth, health or skills.",
  },
};

export const MOOD_META: Record<Mood, { label: string; emoji: string }> = {
  GREAT: { label: "Great", emoji: "😄" },
  GOOD: { label: "Good", emoji: "🙂" },
  NEUTRAL: { label: "Neutral", emoji: "😐" },
  REGRET: { label: "Regret", emoji: "😬" },
  STRESSED: { label: "Stressed", emoji: "😰" },
};

export const ACCOUNT_TYPE_META: Record<AccountType, { label: string; icon: string }> = {
  CASH: { label: "Cash", icon: "banknote" },
  BANK: { label: "Bank Account", icon: "landmark" },
  SAVINGS: { label: "Savings", icon: "piggy-bank" },
  CREDIT_CARD: { label: "Credit Card", icon: "credit-card" },
  UPI: { label: "UPI", icon: "smartphone" },
  INVESTMENT: { label: "Investment", icon: "trending-up" },
  WALLET: { label: "Wallet", icon: "wallet" },
  OTHER: { label: "Other", icon: "circle" },
};

export const LOAN_TYPE_META: Record<LoanType, { label: string; icon: string }> = {
  PERSONAL: { label: "Personal Loan", icon: "user" },
  VEHICLE: { label: "Vehicle Loan", icon: "car" },
  HOME: { label: "Home Loan", icon: "home" },
  EDUCATION: { label: "Education Loan", icon: "graduation-cap" },
  OTHER: { label: "Other", icon: "circle" },
};

export const INSURANCE_TYPE_META: Record<InsuranceType, { label: string }> = {
  HEALTH: { label: "Health" },
  LIFE: { label: "Life" },
  VEHICLE: { label: "Vehicle" },
  HOME: { label: "Home" },
  TRAVEL: { label: "Travel" },
  OTHER: { label: "Other" },
};

export const RECURRENCE_META: Record<RecurrenceFrequency, { label: string }> = {
  DAILY: { label: "Daily" },
  WEEKLY: { label: "Weekly" },
  MONTHLY: { label: "Monthly" },
  QUARTERLY: { label: "Quarterly" },
  YEARLY: { label: "Yearly" },
  CUSTOM: { label: "Custom" },
};

export const SUBSCRIPTION_FREQUENCY_META: Record<
  SubscriptionFrequency,
  { label: string; perYear: number }
> = {
  WEEKLY: { label: "Weekly", perYear: 52 },
  MONTHLY: { label: "Monthly", perYear: 12 },
  QUARTERLY: { label: "Quarterly", perYear: 4 },
  YEARLY: { label: "Yearly", perYear: 1 },
};

export const BUDGET_PRIORITY_META: Record<
  BudgetPriority,
  { label: string; weight: number; color: string }
> = {
  MUST_HAVE: { label: "Must Have", weight: 3, color: "#ef4444" },
  SHOULD_HAVE: { label: "Should Have", weight: 2, color: "#f59e0b" },
  NICE_TO_HAVE: { label: "Nice to Have", weight: 1, color: "#10b981" },
};

export const LEVELS = [
  { level: 1, name: "Rookie", minXp: 0 },
  { level: 2, name: "Explorer", minXp: 200 },
  { level: 3, name: "Builder", minXp: 600 },
  { level: 4, name: "Wealth Builder", minXp: 1500 },
  { level: 5, name: "Master", minXp: 3500 },
] as const;

export const BADGES = [
  { key: "first_expense", name: "First Step", description: "Logged your first expense.", icon: "footprints" },
  { key: "first_budget", name: "Planner", description: "Created your first budget.", icon: "calendar-check" },
  { key: "first_goal", name: "Dreamer", description: "Set your first goal.", icon: "star" },
  { key: "goal_achiever", name: "Goal Achiever", description: "Completed a savings goal.", icon: "trophy" },
  { key: "debt_crusher", name: "Debt Crusher", description: "Fully paid off a loan.", icon: "swords" },
  { key: "tracking_30", name: "Consistent", description: "Logged expenses 30 days in a row.", icon: "flame" },
] as const;

export const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
] as const;

/** EMI burden bands per the PRD. */
export const EMI_BANDS = [
  { max: 20, label: "Excellent", color: "#10b981" },
  { max: 30, label: "Good", color: "#22c55e" },
  { max: 40, label: "Moderate", color: "#f59e0b" },
  { max: 50, label: "High", color: "#f97316" },
  { max: Infinity, label: "Risky", color: "#ef4444" },
] as const;
