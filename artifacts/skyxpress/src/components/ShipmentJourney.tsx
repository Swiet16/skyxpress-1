import { useState, useEffect } from "react";

const STEPS = [
  {
    icon: "📦",
    label: "Parcel Received",
    sub: "Origin warehouse",
    color: "#34d399",
    glow: "rgba(52,211,153,0.5)",
  },
  {
    icon: "🚚",
    label: "Collected",
    sub: "Courier dispatch",
    color: "#60a5fa",
    glow: "rgba(96,165,250,0.5)",
  },
  {
    icon: "✈️",
    label: "In Flight",
    sub: "SkyXpress air",
    color: "#ff6a1a",
    glow: "rgba(255,106,26,0.6)",
  },
  {
    icon: "🛂",
    label: "Customs Clear",
    sub: "Border approved",
    color: "#c084fc",
    glow: "rgba(192,132,252,0.5)",
  },
  {
    icon: "📍",
    label: "Hub Arrived",
    sub: "Destination city",
    color: "#fb923c",
    glow: "rgba(251,146,60,0.5)",
  },
  {
    icon: "🏠",
    label: "Delivered",
    sub: "Door-to-door ✓",
    color: "#4ade80",
    glow: "rgba(74,222,128,0.6)",
  },
];

const STEP_DURATION = 1600; // ms per step
const PAUSE_AFTER_COMPLETE = 2200; // ms pause before restart

export default function ShipmentJourney() {
  const [active, setActive] = useState(0);
  const [completed, setCompleted] = useState(false);
  const n = STEPS.length;

  useEffect(() => {
    if (completed) {
      const t = setTimeout(() => {
        setActive(0);
        setCompleted(false);
      }, PAUSE_AFTER_COMPLETE);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      if (active < n - 1) {
        setActive((p) => p + 1);
      } else {
        setCompleted(true);
      }
    }, STEP_DURATION);
    return () => clearTimeout(t);
  }, [active, completed]);

  const pct = (active / (n - 1)) * 100;

  return (
    <div className="relative w-full overflow-hidden" style={{ background: "transparent" }}>
      <style>{`
        @keyframes nodeRing {
          0%   { transform: scale(1);   opacity: 0.8; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        @keyframes nodePop {
          0%   { transform: scale(0.7); opacity: 0; }
          60%  { transform: scale(1.15); }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes planeBob {
          0%,100% { transform: translateY(0px) rotate(-6deg); }
          50%     { transform: translateY(-5px) rotate(-3deg); }
        }
        @keyframes deliveredBurst {
          0%   { transform: scale(1);   opacity:1; }
          50%  { transform: scale(1.35); opacity:0.7; }
          100% { transform: scale(1);   opacity:1; }
        }
        @keyframes dashMove {
          to { stroke-dashoffset: -20; }
        }
        @keyframes fadeSlideUp {
          from { opacity:0; transform:translateY(18px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      <div
        className="relative mx-auto px-4 py-14 md:py-20"
        style={{ maxWidth: 900 }}
      >
        {/* ── Section header ── */}
        <div
          className="text-center mb-12"
          style={{ animation: "fadeSlideUp 0.7s ease both" }}
        >
          <div
            className="inline-flex items-center gap-2 text-[10px] font-black px-3 py-1 rounded-full mb-3 uppercase tracking-widest"
            style={{
              background: "rgba(255,106,26,0.12)",
              border: "1px solid rgba(255,106,26,0.3)",
              color: "#ff6a1a",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#ff6a1a", animation: "deliveredBurst 1.2s ease infinite" }}
            />
            Live Shipment Journey
          </div>
          <h2
            className="text-2xl md:text-4xl font-black leading-tight"
            style={{
              background: "linear-gradient(90deg,#ffffff 0%,#93c5fd 50%,#ff6a1a 100%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "shimmer 4s linear infinite",
            }}
          >
            Every Parcel. Every Step. Tracked.
          </h2>
          <p className="text-white/40 text-sm mt-2 font-medium">
            SkyXpress delivers door-to-door across 195+ countries
          </p>
        </div>

        {/* ── Journey track (desktop) ── */}
        <div className="hidden md:block relative">
          {/* SVG path layer */}
          <svg
            className="absolute inset-0 w-full pointer-events-none"
            height="60"
            style={{ top: 18, overflow: "visible" }}
          >
            {/* Background dashed line */}
            <line
              x1="6%" y1="30" x2="94%" y2="30"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="2"
              strokeDasharray="6 5"
              style={{ animation: "dashMove 1.2s linear infinite" }}
            />
            {/* Progress filled line */}
            <line
              x1="6%" y1="30"
              x2={`${6 + pct * 0.88}%`} y2="30"
              stroke={STEPS[active].color}
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{
                transition: "x2 0.9s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease",
                filter: `drop-shadow(0 0 6px ${STEPS[active].color})`,
              }}
            />
          </svg>

          {/* Step nodes row */}
          <div className="relative flex justify-between items-start" style={{ zIndex: 2 }}>
            {STEPS.map((s, i) => {
              const isDone = i < active;
              const isCurrent = i === active;
              return (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2"
                  style={{ flex: 1, animation: `nodePop 0.5s ${i * 0.08}s ease both` }}
                >
                  {/* Node circle */}
                  <div className="relative flex items-center justify-center">
                    {/* Pulse rings on active */}
                    {isCurrent && (
                      <>
                        <span
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: s.glow,
                            animation: "nodeRing 1.1s ease-out infinite",
                          }}
                        />
                        <span
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: s.glow,
                            animation: "nodeRing 1.1s 0.45s ease-out infinite",
                          }}
                        />
                      </>
                    )}
                    <div
                      className="relative flex items-center justify-center rounded-full text-xl transition-all duration-500"
                      style={{
                        width: isCurrent ? 56 : 44,
                        height: isCurrent ? 56 : 44,
                        background: isDone
                          ? `linear-gradient(135deg,${s.color}55,${s.color}22)`
                          : isCurrent
                          ? `linear-gradient(135deg,${s.color},${s.color}bb)`
                          : "rgba(255,255,255,0.04)",
                        border: isCurrent
                          ? `2px solid ${s.color}`
                          : isDone
                          ? `1.5px solid ${s.color}66`
                          : "1.5px solid rgba(255,255,255,0.1)",
                        boxShadow: isCurrent ? `0 0 20px ${s.glow}, 0 0 40px ${s.glow}` : "none",
                        transform: isCurrent ? "scale(1.05)" : "scale(1)",
                        transition: "all 0.5s cubic-bezier(0.4,0,0.2,1)",
                      }}
                    >
                      <span style={{ filter: isCurrent ? "drop-shadow(0 0 4px rgba(255,255,255,0.6))" : "none" }}>
                        {isDone ? "✅" : s.icon}
                      </span>
                    </div>
                  </div>

                  {/* Label */}
                  <div className="text-center" style={{ minWidth: 80 }}>
                    <div
                      className="text-xs font-bold leading-tight transition-colors duration-500"
                      style={{ color: isCurrent ? s.color : isDone ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.25)" }}
                    >
                      {s.label}
                    </div>
                    <div
                      className="text-[10px] font-medium mt-0.5 transition-colors duration-500"
                      style={{ color: isCurrent ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.15)" }}
                    >
                      {s.sub}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Plane flying above the track */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: -14,
              left: `calc(${6 + pct * 0.88}% - 14px)`,
              transition: "left 0.9s cubic-bezier(0.4,0,0.2,1)",
              zIndex: 10,
            }}
          >
            <div
              style={{
                fontSize: 26,
                animation: "planeBob 1.8s ease-in-out infinite",
                filter: `drop-shadow(0 0 8px ${STEPS[active].color}) drop-shadow(0 2px 12px rgba(255,106,26,0.5))`,
              }}
            >
              ✈️
            </div>
          </div>
        </div>

        {/* ── Mobile vertical layout ── */}
        <div className="md:hidden flex flex-col gap-3">
          {STEPS.map((s, i) => {
            const isDone = i < active;
            const isCurrent = i === active;
            return (
              <div
                key={i}
                className="flex items-center gap-4 rounded-2xl px-4 py-3 transition-all duration-500"
                style={{
                  background: isCurrent
                    ? `linear-gradient(135deg,${s.color}18,${s.color}08)`
                    : "rgba(255,255,255,0.02)",
                  border: isCurrent
                    ? `1px solid ${s.color}55`
                    : isDone
                    ? "1px solid rgba(255,255,255,0.06)"
                    : "1px solid rgba(255,255,255,0.04)",
                  boxShadow: isCurrent ? `0 0 20px ${s.glow}` : "none",
                }}
              >
                <div
                  className="flex items-center justify-center rounded-full text-lg flex-shrink-0"
                  style={{
                    width: 44, height: 44,
                    background: isCurrent ? `${s.color}33` : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${isCurrent ? s.color : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  {isDone ? "✅" : s.icon}
                </div>
                <div className="flex-1">
                  <div
                    className="text-sm font-bold"
                    style={{ color: isCurrent ? s.color : isDone ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.2)" }}
                  >
                    {s.label}
                  </div>
                  <div className="text-[11px] text-white/25">{s.sub}</div>
                </div>
                {isCurrent && (
                  <div
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${s.color}25`, color: s.color, border: `1px solid ${s.color}40` }}
                  >
                    LIVE
                  </div>
                )}
                {isDone && (
                  <div className="text-[11px] text-white/20 font-semibold">Done</div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Active step detail card ── */}
        <div
          key={active}
          className="mt-10 flex flex-col items-center gap-2"
          style={{ animation: "fadeSlideUp 0.4s ease both" }}
        >
          <div
            className="flex items-center gap-3 px-6 py-3 rounded-2xl"
            style={{
              background: `linear-gradient(135deg,${STEPS[active].color}15,${STEPS[active].color}06)`,
              border: `1px solid ${STEPS[active].color}35`,
              boxShadow: `0 4px 30px ${STEPS[active].glow}`,
            }}
          >
            <span style={{ fontSize: 22 }}>{STEPS[active].icon}</span>
            <div>
              <div
                className="text-sm font-black"
                style={{ color: STEPS[active].color }}
              >
                {STEPS[active].label}
              </div>
              <div className="text-xs text-white/40">{STEPS[active].sub}</div>
            </div>
            <div
              className="ml-4 flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest"
              style={{
                background: `${STEPS[active].color}20`,
                color: STEPS[active].color,
                border: `1px solid ${STEPS[active].color}40`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: STEPS[active].color, animation: "deliveredBurst 0.9s ease infinite" }}
              />
              {completed ? "Complete" : "In Progress"}
            </div>
          </div>

          {/* Step dots */}
          <div className="flex gap-2 mt-2">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-500"
                style={{
                  width: i === active ? 20 : 6,
                  height: 6,
                  background: i <= active ? s.color : "rgba(255,255,255,0.12)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
