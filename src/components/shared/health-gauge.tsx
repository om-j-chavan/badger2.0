import { cn } from "@/lib/utils";

/**
 * A semi-circular gauge for the Budget Health Score. Server-renderable (pure
 * SVG, no client JS).
 */
export function HealthGauge({
  score,
  grade,
}: {
  score: number;
  grade: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const angle = (clamped / 100) * 180;
  const radius = 80;
  const cx = 100;
  const cy = 100;

  const end = polar(cx, cy, radius, 180 - angle);
  const largeArc = angle > 180 ? 1 : 0;
  const trackEnd = polar(cx, cy, radius, 0);
  const start = polar(cx, cy, radius, 180);

  const color =
    clamped >= 70 ? "#10b981" : clamped >= 55 ? "#84cc16" : clamped >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="w-full max-w-[260px]">
        <path
          d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${trackEnd.x} ${trackEnd.y}`}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={14}
          strokeLinecap="round"
        />
        <path
          d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`}
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
        />
        <text x={cx} y={cy - 8} textAnchor="middle" className="fill-foreground" fontSize={30} fontWeight={700}>
          {Math.round(clamped)}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="fill-muted-foreground" fontSize={11}>
          out of 100
        </text>
      </svg>
      <span
        className={cn("mt-1 rounded-full px-3 py-1 text-sm font-semibold")}
        style={{ backgroundColor: `${color}1a`, color }}
      >
        {grade}
      </span>
    </div>
  );
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}
