import { CURRENCIES } from "./constants";
import { toNumber } from "./utils";

const SYMBOLS: Record<string, string> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c.symbol]),
);

const LOCALE_BY_CURRENCY: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  JPY: "ja-JP",
  AUD: "en-AU",
  CAD: "en-CA",
  SGD: "en-SG",
  AED: "ar-AE",
};

export function currencySymbol(code = "INR"): string {
  return SYMBOLS[code] ?? code;
}

export function formatCurrency(
  value: unknown,
  currency = "INR",
  options: { compact?: boolean; decimals?: boolean } = {},
): string {
  const amount = toNumber(value);
  const locale = LOCALE_BY_CURRENCY[currency] ?? "en-US";
  const fractionDigits = options.decimals ? 2 : 0;

  if (options.compact && Math.abs(amount) >= 100000) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: fractionDigits,
    }).format(amount);
  } catch {
    // Unknown currency code – fall back to a symbol prefix.
    return `${currencySymbol(currency)}${amount.toLocaleString(locale)}`;
  }
}

export function formatNumber(value: unknown, locale = "en-IN"): string {
  return new Intl.NumberFormat(locale).format(toNumber(value));
}
