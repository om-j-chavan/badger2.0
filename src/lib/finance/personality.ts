import { round2 } from "../utils";

export type PersonalityType =
  | "Planner"
  | "Saver"
  | "Investor"
  | "Impulsive Buyer"
  | "Balanced";

export interface PersonalityInputs {
  savingsRate: number; // %
  investmentRatio: number; // % of spending tagged INVESTMENT
  luxuryRatio: number; // % of spending tagged LUXURY
  regretRatio: number; // % of expenses logged with a "regret" mood
  budgetAdherence: number; // 0-100, how close actual was to plan
  loggingConsistency: number; // 0-100, share of days with a log
}

export interface PersonalityResult {
  type: PersonalityType;
  emoji: string;
  summary: string;
  traits: string[];
}

/**
 * Derive a friendly spending personality from behavioural signals. The
 * dominant signal wins; ties resolve toward "Balanced".
 */
export function derivePersonality(i: PersonalityInputs): PersonalityResult {
  const scores: Record<PersonalityType, number> = {
    Planner: i.budgetAdherence * 0.7 + i.loggingConsistency * 0.3,
    Saver: i.savingsRate * 2.5,
    Investor: i.investmentRatio * 3,
    "Impulsive Buyer": i.luxuryRatio * 1.5 + i.regretRatio * 2,
    Balanced: 50, // baseline that other archetypes must beat clearly
  };

  let type: PersonalityType = "Balanced";
  let best = scores.Balanced + 10; // require a clear margin over baseline
  (Object.keys(scores) as PersonalityType[]).forEach((k) => {
    if (k !== "Balanced" && scores[k] > best) {
      best = scores[k];
      type = k;
    }
  });

  const meta: Record<PersonalityType, { emoji: string; summary: string; traits: string[] }> = {
    Planner: {
      emoji: "🗺️",
      summary: "You like a plan and you stick to it. Your budgets aren't just wishful thinking.",
      traits: ["Consistent logger", "Strong budget adherence", "Few surprises"],
    },
    Saver: {
      emoji: "🐿️",
      summary: "You're great at keeping money in reserve. That safety net is real and growing.",
      traits: ["High savings rate", "Cautious with luxuries", "Building a cushion"],
    },
    Investor: {
      emoji: "📈",
      summary: "You put money to work. A healthy chunk of your spending grows your future.",
      traits: ["Strong investment ratio", "Long-term mindset", "Wealth-building habits"],
    },
    "Impulsive Buyer": {
      emoji: "✨",
      summary: "You love a good treat in the moment. Nothing wrong with that — a little awareness goes a long way.",
      traits: ["Enjoys luxuries", "Spontaneous purchases", "Room to plan ahead"],
    },
    Balanced: {
      emoji: "⚖️",
      summary: "You keep things in balance — a bit of saving, a bit of fun, and steady habits.",
      traits: ["Well-rounded spending", "Moderate in most areas", "Adaptable"],
    },
  };

  return { type, ...meta[type] };
}

export function ratio(part: number, whole: number): number {
  if (!whole) return 0;
  return round2((part / whole) * 100);
}
