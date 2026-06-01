import { EMI_BANDS } from "../constants";
import { clamp, round2 } from "../utils";

export interface HealthInputs {
  monthlyIncome: number;
  totalSpending: number; // actual money out this month (excl. savings transfers)
  essentialSpending: number;
  luxurySpending: number;
  investmentSpending: number;
  monthlyDebt: number; // EMI burden
  savings: number; // income - spending - debt (>=0)
}

export interface HealthComponent {
  key: string;
  label: string;
  score: number; // 0-100 sub-score
  weight: number;
  value: number; // the underlying ratio (%)
  explanation: string;
}

export interface HealthScore {
  score: number; // 0-100
  grade: "Thriving" | "Healthy" | "Steady" | "Tight" | "Stretched";
  components: HealthComponent[];
  headline: string;
}

/**
 * Budget Health Score (0-100). Combines five weighted, encouragement-framed
 * sub-scores. Never shames: messaging is always constructive.
 */
export function calculateHealthScore(inputs: HealthInputs): HealthScore {
  const income = Math.max(inputs.monthlyIncome, 1);

  const savingsRate = clamp((inputs.savings / income) * 100, 0, 100);
  const investmentRate = clamp((inputs.investmentSpending / income) * 100, 0, 100);
  const debtBurden = clamp((inputs.monthlyDebt / income) * 100, 0, 200);
  const essentialRatio =
    inputs.totalSpending > 0 ? (inputs.essentialSpending / inputs.totalSpending) * 100 : 0;
  const luxuryRatio =
    inputs.totalSpending > 0 ? (inputs.luxurySpending / inputs.totalSpending) * 100 : 0;

  // Sub-score curves (each 0-100).
  const savingsScore = clamp((savingsRate / 25) * 100, 0, 100); // 25%+ savings = full marks
  const investmentScore = clamp((investmentRate / 15) * 100, 0, 100); // 15%+ invested = full
  const debtScore = clamp(100 - (debtBurden / 50) * 100, 0, 100); // 0% debt = full, 50%+ = 0
  // Essentials between 45-65% of spend is healthiest; penalise extremes gently.
  const essentialScore = clamp(100 - Math.abs(essentialRatio - 55) * 1.6, 0, 100);
  const luxuryScore = clamp(100 - Math.max(0, luxuryRatio - 25) * 2.2, 0, 100); // up to 25% luxury is fine

  const components: HealthComponent[] = [
    {
      key: "savings",
      label: "Savings rate",
      score: round2(savingsScore),
      weight: 0.3,
      value: round2(savingsRate),
      explanation:
        savingsRate >= 20
          ? `You're keeping ${Math.round(savingsRate)}% of your income — that's a strong cushion.`
          : `You're saving ${Math.round(savingsRate)}% right now. Even small bumps add up over time.`,
    },
    {
      key: "investment",
      label: "Investment rate",
      score: round2(investmentScore),
      weight: 0.2,
      value: round2(investmentRate),
      explanation:
        investmentRate >= 10
          ? `${Math.round(investmentRate)}% is going toward growth. Future you says thanks!`
          : `Investing ${Math.round(investmentRate)}% of income. Consider nudging this up when comfortable.`,
    },
    {
      key: "debt",
      label: "Debt burden",
      score: round2(debtScore),
      weight: 0.2,
      value: round2(debtBurden),
      explanation:
        debtBurden <= 30
          ? `Debt is ${Math.round(debtBurden)}% of income — well within a comfortable range.`
          : `Debt is ${Math.round(debtBurden)}% of income. The prepayment simulator can help map a faster exit.`,
    },
    {
      key: "essentials",
      label: "Essential balance",
      score: round2(essentialScore),
      weight: 0.15,
      value: round2(essentialRatio),
      explanation: `Essentials are ${Math.round(essentialRatio)}% of your spending. A balanced mix sits around half.`,
    },
    {
      key: "luxury",
      label: "Luxury balance",
      score: round2(luxuryScore),
      weight: 0.15,
      value: round2(luxuryRatio),
      explanation:
        luxuryRatio <= 25
          ? `Luxuries are ${Math.round(luxuryRatio)}% of spend — a healthy bit of enjoyment.`
          : `Luxuries are ${Math.round(luxuryRatio)}% of spend. Treats are great; just keeping you aware.`,
    },
  ];

  const score = round2(components.reduce((s, c) => s + c.score * c.weight, 0));

  let grade: HealthScore["grade"];
  let headline: string;
  if (score >= 85) {
    grade = "Thriving";
    headline = "You're thriving — your money habits are in great shape. 🌟";
  } else if (score >= 70) {
    grade = "Healthy";
    headline = "Looking healthy! A few small tweaks could push you even higher.";
  } else if (score >= 55) {
    grade = "Steady";
    headline = "Steady going. You've got a solid base to build on.";
  } else if (score >= 40) {
    grade = "Tight";
    headline = "Things are a little tight this month — that's okay, let's find some room.";
  } else {
    grade = "Stretched";
    headline = "Money feels stretched right now. Small steps will turn this around.";
  }

  return { score, grade, components, headline };
}

export interface EmiBurden {
  ratio: number; // %
  label: string;
  color: string;
}

/** Classify EMI burden per the PRD bands. */
export function classifyEmiBurden(totalEmi: number, monthlyIncome: number): EmiBurden {
  const ratio = monthlyIncome > 0 ? round2((totalEmi / monthlyIncome) * 100) : 0;
  const band = EMI_BANDS.find((b) => ratio < b.max) ?? EMI_BANDS[EMI_BANDS.length - 1];
  return { ratio, label: band.label, color: band.color };
}
