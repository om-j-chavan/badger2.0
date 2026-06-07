import { cn } from "@/lib/utils";

/**
 * Badger brand mark — an original, themeable SVG (brand green tile + a
 * front-facing badger face with the signature white blaze and eye stripes).
 * Used as the in-app logo and mirrored by /icon.svg for favicon / PWA.
 */
export function BadgerLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="Badger"
      className={cn("h-8 w-8", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="15" fill="hsl(158 64% 38%)" />
      {/* ears */}
      <circle cx="20.5" cy="16" r="4.6" fill="#ffffff" />
      <circle cx="43.5" cy="16" r="4.6" fill="#ffffff" />
      <circle cx="20.5" cy="16" r="1.9" fill="#13402f" />
      <circle cx="43.5" cy="16" r="1.9" fill="#13402f" />
      {/* head */}
      <ellipse cx="32" cy="34" rx="18.5" ry="20" fill="#ffffff" />
      {/* eye stripes */}
      <path
        d="M20.5 18 Q16.8 32 22.5 45.5 Q25.4 47 28 45.5 Q24.2 31.5 26.6 18 Q23.5 16.4 20.5 18 Z"
        fill="#20262f"
      />
      <path
        d="M43.5 18 Q47.2 32 41.5 45.5 Q38.6 47 36 45.5 Q39.8 31.5 37.4 18 Q40.5 16.4 43.5 18 Z"
        fill="#20262f"
      />
      {/* eyes */}
      <circle cx="23" cy="28" r="1.7" fill="#ffffff" />
      <circle cx="41" cy="28" r="1.7" fill="#ffffff" />
      {/* nose */}
      <ellipse cx="32" cy="47.5" rx="3.5" ry="2.7" fill="#20262f" />
    </svg>
  );
}
