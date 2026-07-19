// Lightweight, dependency-free chart primitives for the admin dashboard.
// Pure SVG — no charting library required, so nothing new to install.

// ---------- date bucketing helpers ----------

export function lastNDays(n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function bucketByDay(items: any[], dateField: string, days: string[]): number[] {
  const counts: Record<string, number> = {};
  days.forEach((d) => (counts[d] = 0));
  items.forEach((item) => {
    const raw = item?.[dateField];
    if (!raw) return;
    const key = new Date(raw).toISOString().slice(0, 10);
    if (key in counts) counts[key] += 1;
  });
  return days.map((d) => counts[d]);
}

export function sumByDay(items: any[], dateField: string, valueField: string, days: string[]): number[] {
  const sums: Record<string, number> = {};
  days.forEach((d) => (sums[d] = 0));
  items.forEach((item) => {
    const raw = item?.[dateField];
    if (!raw) return;
    const key = new Date(raw).toISOString().slice(0, 10);
    if (key in sums) sums[key] += Number(item?.[valueField]) || 0;
  });
  return days.map((d) => sums[d]);
}

export function dayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2).toUpperCase();
}

export function pctDelta(recent: number[], previous: number[]): number {
  const recentSum = recent.reduce((a, b) => a + b, 0);
  const previousSum = previous.reduce((a, b) => a + b, 0);
  if (previousSum === 0) return recentSum > 0 ? 100 : 0;
  return Math.round(((recentSum - previousSum) / previousSum) * 100);
}

// ---------- Flight-path trend line (signature chart) ----------

interface FlightPathChartProps {
  data: number[];
  labels: string[];
  accent?: string;
  height?: number;
}

export const FlightPathChart = ({ data, labels, accent = "#C98A2B", height = 120 }: FlightPathChartProps) => {
  const width = 560;
  const padding = 14;
  const max = Math.max(1, ...data);
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;

  const points = data.map((v, i) => {
    const x = padding + i * stepX;
    const y = height - padding - (v / max) * (height - padding * 2);
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1][0].toFixed(1)} ${height - padding} L ${points[0][0].toFixed(1)} ${height - padding} Z`
      : "";
  const last = points[points.length - 1];

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="none">
        <defs>
          <linearGradient id="flightFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="currentColor"
          strokeOpacity="0.1"
        />
        {areaPath && <path d={areaPath} fill="url(#flightFill)" />}
        <path d={linePath} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {last && <circle cx={last[0]} cy={last[1]} r="3.5" fill={accent} />}
        {last && <circle cx={last[0]} cy={last[1]} r="7" fill={accent} fillOpacity="0.18" />}
      </svg>
      <div className="flex justify-between mt-1.5 text-[10px] font-mono tracking-wide text-muted-foreground">
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </div>
  );
};

// ---------- Manifest bar (status breakdown) ----------

interface ManifestSegment {
  label: string;
  value: number;
  color: string;
}

export const ManifestBar = ({ segments }: { segments: ManifestSegment[] }) => {
  const total = Math.max(1, segments.reduce((s, seg) => s + seg.value, 0));
  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {segments.map((seg, i) => (
          <div
            key={i}
            style={{ width: `${(seg.value / total) * 100}%`, backgroundColor: seg.color }}
            className="h-full"
            title={`${seg.label}: ${seg.value}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="capitalize">{seg.label.replace(/_/g, " ")}</span>
            <span className="font-mono text-foreground">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- Ledger bars (revenue) ----------

interface LedgerBarsProps {
  data: number[];
  labels: string[];
  accent?: string;
  height?: number;
  formatValue?: (v: number) => string;
}

export const LedgerBars = ({ data, labels, accent = "#2B8C7E", height = 120, formatValue }: LedgerBarsProps) => {
  const max = Math.max(1, ...data);
  return (
    <div className="w-full">
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((v, i) => (
          <div key={i} className="flex-1 h-full flex flex-col justify-end items-center">
            <div
              className="w-full rounded-t-sm"
              style={{
                height: `${Math.max(2, (v / max) * 100)}%`,
                backgroundColor: accent,
                opacity: i === data.length - 1 ? 1 : 0.5,
              }}
              title={formatValue ? formatValue(v) : String(v)}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] font-mono tracking-wide text-muted-foreground">
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </div>
  );
};

// ---------- Sparkline (for stat cards) ----------

export const Sparkline = ({ data, accent = "#C98A2B" }: { data: number[]; accent?: string }) => {
  const width = 84;
  const height = 26;
  const max = Math.max(1, ...data);
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  const points = data
    .map((v, i) => `${(i * stepX).toFixed(1)},${(height - (v / max) * (height - 2) - 1).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-20 h-6 shrink-0">
      <polyline points={points} fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
