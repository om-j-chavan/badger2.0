import { PrismaClient, type Importance } from "@prisma/client";
import { addMonths, subDays, subMonths } from "date-fns";
import { randomBytes, scryptSync } from "node:crypto";
import { BADGES, DEFAULT_CATEGORIES } from "../src/lib/constants";
import { calculateEmi } from "../src/lib/finance/emi";

const prisma = new PrismaClient();

const DEMO_CLERK_ID = "seed_demo_user";
const DEMO_USERNAME = "demo";
const DEMO_PASSWORD = "badger123";

// Must match the scrypt format in src/lib/auth-local.ts (salt:hashHex, keylen 64).
function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("🌱 Seeding Badger…");

  // 1. Global badge catalogue (always upserted; required by gamification).
  for (const b of BADGES) {
    await prisma.badge.upsert({
      where: { key: b.key },
      update: { name: b.name, description: b.description, icon: b.icon },
      create: { key: b.key, name: b.name, description: b.description, icon: b.icon },
    });
  }
  console.log(`  ✓ ${BADGES.length} badges`);

  // 2. Demo user with rich sample data. Log in locally with demo / badger123.
  await prisma.user.deleteMany({
    where: { OR: [{ clerkId: DEMO_CLERK_ID }, { username: DEMO_USERNAME }, { email: "demo@badger.app" }] },
  });
  const user = await prisma.user.create({
    data: {
      clerkId: DEMO_CLERK_ID,
      username: DEMO_USERNAME,
      passwordHash: hashPassword(DEMO_PASSWORD),
      email: "demo@badger.app",
      name: "Demo Badger",
      currency: "INR",
      timezone: "Asia/Kolkata",
      monthlyIncome: 95000,
      onboardedAt: new Date(),
      gamification: { create: { xp: 240, level: 2 } },
      categories: { create: DEFAULT_CATEGORIES.map((c) => ({ ...c, isDefault: true })) },
    },
    include: { categories: true },
  });

  const cat = (name: string) => user.categories.find((c) => c.name === name)!.id;

  // Accounts
  const [bank, cash, card] = await Promise.all([
    prisma.account.create({ data: { userId: user.id, name: "Main Bank", type: "BANK", currentBalance: 142000, color: "#10b981", icon: "landmark" } }),
    prisma.account.create({ data: { userId: user.id, name: "Cash Wallet", type: "CASH", currentBalance: 4200, color: "#f59e0b", icon: "banknote" } }),
    prisma.account.create({ data: { userId: user.id, name: "Credit Card", type: "CREDIT_CARD", currentBalance: -18500, color: "#ef4444", icon: "credit-card" } }),
  ]);

  // Expenses across the last ~50 days
  const sampleExpenses: { cat: string; amount: number; importance: Importance; daysAgo: number; note: string }[] = [
    { cat: "Food", amount: 420, importance: "USEFUL", daysAgo: 1, note: "Lunch with friends" },
    { cat: "Fuel", amount: 2000, importance: "ESSENTIAL", daysAgo: 2, note: "Petrol" },
    { cat: "Entertainment", amount: 800, importance: "LUXURY", daysAgo: 3, note: "Movie night" },
    { cat: "Food", amount: 1500, importance: "USEFUL", daysAgo: 4, note: "Groceries" },
    { cat: "Gym", amount: 1200, importance: "INVESTMENT", daysAgo: 6, note: "Protein + supplements" },
    { cat: "Shopping", amount: 3500, importance: "LUXURY", daysAgo: 8, note: "New headphones" },
    { cat: "Health", amount: 600, importance: "ESSENTIAL", daysAgo: 10, note: "Medicine" },
    { cat: "Food", amount: 350, importance: "LUXURY", daysAgo: 11, note: "Pizza" },
    { cat: "Transport", amount: 240, importance: "USEFUL", daysAgo: 12, note: "Cab" },
    { cat: "Education", amount: 2999, importance: "INVESTMENT", daysAgo: 15, note: "Online course" },
    { cat: "Food", amount: 480, importance: "USEFUL", daysAgo: 18, note: "Dinner" },
    { cat: "Entertainment", amount: 499, importance: "LUXURY", daysAgo: 22, note: "Concert tickets" },
    { cat: "Rent", amount: 22000, importance: "ESSENTIAL", daysAgo: 25, note: "Monthly rent" },
    { cat: "Investment", amount: 10000, importance: "INVESTMENT", daysAgo: 25, note: "SIP" },
    { cat: "Food", amount: 1300, importance: "USEFUL", daysAgo: 33, note: "Groceries" },
    { cat: "Fuel", amount: 1800, importance: "ESSENTIAL", daysAgo: 38, note: "Petrol" },
    { cat: "Shopping", amount: 2200, importance: "LUXURY", daysAgo: 45, note: "Clothes" },
  ];

  for (const e of sampleExpenses) {
    await prisma.expense.create({
      data: {
        userId: user.id,
        categoryId: cat(e.cat),
        accountId: e.amount > 5000 ? bank.id : Math.random() > 0.5 ? cash.id : card.id,
        date: subDays(new Date(), e.daysAgo),
        amount: e.amount,
        importance: e.importance,
        note: e.note,
      },
    });
  }
  console.log(`  ✓ ${sampleExpenses.length} expenses`);

  // Distributed expense (internet, 6 months) + its logged actual expense
  const internet = await prisma.distributedExpense.create({
    data: {
      userId: user.id,
      categoryId: cat("Internet"),
      name: "Internet (6 months)",
      totalAmount: 4000,
      coverageMonths: 6,
      startDate: subMonths(new Date(), 1),
      importance: "ESSENTIAL",
    },
  });
  await prisma.expense.create({
    data: {
      userId: user.id,
      categoryId: cat("Internet"),
      date: subMonths(new Date(), 1),
      amount: 4000,
      importance: "ESSENTIAL",
      note: "Internet (covers 6 months)",
      distributedExpenseId: internet.id,
    },
  });

  // Subscriptions
  await prisma.subscription.createMany({
    data: [
      { userId: user.id, name: "Netflix", cost: 649, frequency: "MONTHLY", renewalDate: addMonths(new Date(), 0), color: "#e50914" },
      { userId: user.id, name: "Spotify", cost: 119, frequency: "MONTHLY", renewalDate: addMonths(new Date(), 0), color: "#1db954" },
      { userId: user.id, name: "ChatGPT Plus", cost: 1700, frequency: "MONTHLY", renewalDate: addMonths(new Date(), 0), color: "#10a37f" },
      { userId: user.id, name: "Amazon Prime", cost: 1499, frequency: "YEARLY", renewalDate: addMonths(new Date(), 5), color: "#00a8e1" },
    ],
  });
  console.log("  ✓ 4 subscriptions");

  // Loan
  const principal = 500000;
  const rate = 9.5;
  const tenure = 48;
  await prisma.loan.create({
    data: {
      userId: user.id,
      name: "Car Loan",
      lender: "HDFC",
      type: "VEHICLE",
      principalAmount: principal,
      interestRate: rate,
      tenureMonths: tenure,
      startDate: subMonths(new Date(), 10),
      emiAmount: calculateEmi(principal, rate, tenure),
      remainingPrincipal: 410000,
      nextDueDate: addMonths(new Date(), 1),
    },
  });
  console.log("  ✓ 1 loan");

  // Insurance + membership
  await prisma.insurance.create({
    data: { userId: user.id, name: "Health Cover", type: "HEALTH", premium: 18000, frequency: "YEARLY", coverageAmount: 1000000, renewalDate: addMonths(new Date(), 4), provider: "Star Health" },
  });
  await prisma.membership.create({
    data: { userId: user.id, name: "Costco", cost: 4000, frequency: "YEARLY", renewalDate: addMonths(new Date(), 7) },
  });

  // Goals
  await prisma.goal.createMany({
    data: [
      { userId: user.id, name: "Emergency Fund", targetAmount: 300000, currentAmount: 185000, color: "#10b981", icon: "shield" },
      { userId: user.id, name: "Gaming PC", targetAmount: 150000, currentAmount: 60000, color: "#6366f1", icon: "monitor", targetDate: addMonths(new Date(), 6) },
      { userId: user.id, name: "Goa Trip", targetAmount: 80000, currentAmount: 25000, color: "#f59e0b", icon: "plane", targetDate: addMonths(new Date(), 4) },
    ],
  });
  console.log("  ✓ 3 goals");

  // Budget for current month
  const now = new Date();
  await prisma.budget.create({
    data: {
      userId: user.id,
      name: "Monthly Budget",
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      monthlyIncome: 95000,
      items: {
        create: [
          { label: "Rent", amount: 22000, priority: "MUST_HAVE" },
          { label: "Groceries", amount: 8000, priority: "MUST_HAVE" },
          { label: "Fuel", amount: 4000, priority: "MUST_HAVE" },
          { label: "Investments", amount: 15000, priority: "SHOULD_HAVE" },
          { label: "Eating out", amount: 5000, priority: "NICE_TO_HAVE" },
          { label: "Entertainment", amount: 3000, priority: "NICE_TO_HAVE" },
        ],
      },
    },
  });
  console.log("  ✓ budget");

  // A couple of badges + a streak
  const firstExpense = await prisma.badge.findUnique({ where: { key: "first_expense" } });
  const firstGoal = await prisma.badge.findUnique({ where: { key: "first_goal" } });
  if (firstExpense) await prisma.userBadge.create({ data: { userId: user.id, badgeId: firstExpense.id } });
  if (firstGoal) await prisma.userBadge.create({ data: { userId: user.id, badgeId: firstGoal.id } });
  await prisma.streak.create({ data: { userId: user.id, kind: "daily_logging", current: 5, longest: 12, lastDate: new Date() } });

  console.log(`✅ Seed complete! Log in locally with username "${DEMO_USERNAME}" / password "${DEMO_PASSWORD}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
