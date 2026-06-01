import {
  LayoutDashboard,
  Receipt,
  CalendarDays,
  Repeat,
  CalendarRange,
  CreditCard,
  Landmark,
  Layers,
  PiggyBank,
  Target,
  LineChart,
  Sparkles,
  Wallet,
  Trophy,
  Settings,
  Bot,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  group: "main" | "money" | "plan" | "more";
  /** Show in the mobile bottom bar. */
  bottomBar?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "main", bottomBar: true },
  { label: "Expenses", href: "/expenses", icon: Receipt, group: "money", bottomBar: true },
  { label: "Calendar", href: "/calendar", icon: CalendarDays, group: "money" },
  { label: "Recurring", href: "/recurring", icon: Repeat, group: "money" },
  { label: "Distributed", href: "/distributed", icon: CalendarRange, group: "money" },
  { label: "Subscriptions", href: "/subscriptions", icon: CreditCard, group: "money" },
  { label: "Loans", href: "/loans", icon: Landmark, group: "money" },
  { label: "Commitments", href: "/commitments", icon: Layers, group: "money" },
  { label: "Budget", href: "/budget", icon: PiggyBank, group: "plan", bottomBar: true },
  { label: "Goals", href: "/goals", icon: Target, group: "plan" },
  { label: "Review", href: "/review", icon: LineChart, group: "plan" },
  { label: "Insights", href: "/insights", icon: Sparkles, group: "plan" },
  { label: "Accounts", href: "/accounts", icon: Wallet, group: "more" },
  { label: "Achievements", href: "/achievements", icon: Trophy, group: "more" },
  { label: "Settings", href: "/settings", icon: Settings, group: "more" },
];

export const ASSISTANT_NAV: NavItem = {
  label: "Badger AI",
  href: "/assistant",
  icon: Bot,
  group: "main",
  bottomBar: true,
};

export const NAV_GROUPS: { key: NavItem["group"]; label: string }[] = [
  { key: "main", label: "Overview" },
  { key: "money", label: "Money" },
  { key: "plan", label: "Plan & Grow" },
  { key: "more", label: "More" },
];
