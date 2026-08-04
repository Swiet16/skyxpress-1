import { useState, useEffect } from "react";

const STEPS = [
  { icon: "📦", label: "Parcel Received",  sub: "Origin warehouse",  color: "#34d399", glow: "rgba(52,211,153,0.5)"  },
  { icon: "🚚", label: "Collected",        sub: "Courier dispatch",  color: "#60a5fa", glow: "rgba(96,165,250,0.5)"  },
  { icon: "✈️", label: "In Flight",        sub: "SkyXpress air",     color: "#ff6a1a", glow: "rgba(255,106,26,0.6)"  },
  { icon: "🛂", label: "Customs Clear",    sub: "Border approved",   color: "#c084fc", glow: "rgba(192,132,252,0.5)" },
  { icon: "📍", label: "Hub Arrived",      sub: "Destination city",  color: "#fb923c", glow: "rgba(251,146,60,0.5)"  },
  { icon: "🏠", label: "Delivered",        sub: "Door-to-door ✓",    color: "#4ade80", glow: "rgba(74,222,128,0.6)"  },
];

const STEP_MS   = 1600;                       // ms per step
const PAUSE_MS  = 2200;                       // pause at end before restart
const TRAVEL_MS = STEP_MS * STEPS.length;     // 9600 ms
const TOTAL_MS  = TRAVEL_MS + PAUSE_MS;       // 11800 ms
const N         = STEPS.length;

// Percentage of total cycle that is "travelling" (vs pause)
const TRAVEL_PCT = (TRAVEL_MS / TOTAL_MS) * 100; // ≈ 81.36 %

// Horizontal positions of each step node (matches CSS node flex layout)
// Nodes are evenly distributed across [LEFT_PCT, RIGHT_PCT] of the container
const LEFT_PCT  = 6;    // left edge node centre %
const RIGHT_PCT = 94;   // right edge node centre %
const span      = RIGHT_PCT - LEFT_PCT;

// Plane x at step i (%, offset for 28px plane width ÷ 2 = 14px accounted in CSS)
const nodeX = (i: number) => LEFT_PCT + (i / (N - 1)) * span;

// Build keyframe string: plane glides from step 0 → step N-1 in TRAVEL_PCT of the cycle,
// then stays off-screen / invisible during the pause, then snaps back.
const planeKF = `
  @keyframes planeGlide {
    ${STEPS.map((_, i) => {
      const timePct = ((i / (N - 1)) * TRAVEL_PCT).toFixed(3);
      return `${timePct}% { left: calc(${nodeX(i)}% - 14px); opacity: 1; }`;
    }).join("\n    ")}
    ${(TRAVEL_PCT + 0.01).toFixed(2)}% { opacity: 0; left: calc(${nodeX(N - 1)}% - 14px); }
    99.99%  { opacity: 0; left: calc(${nodeX(0)}% - 14px); }
    100%    { opacity: 1; left: calc(${nodeX(0)}% - 14px); }
  }
`;

const progressKF = `
  @keyframes progressFill {
    0%                        { width: 0%;   opacity: 1; }
    ${TRAVEL_PCT.toFixed(2)}% { width: ${span}%; opacity: 1; }
    ${(TRAVEL_PCT + 0.01).toFixed(2)}% { width: ${span}%; opacity: 0; }
    99.99%                    { width: 0%;   opacity: 0; }
    100%                      { width: 0%;   opacity: 1; }
  }
`;

export default function ShipmentJourney() {
  const [active, setActive] = useState(0);
  const [completed, setCompleted] = useState(false);

  // Advance React state in lock-step with the CSS animation timing
  useEffect(() => {
    if (completed) {
      const t = setTimeout(() => { setActive(0); setCompleted(false); }, PAUSE_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      if (active < N - 1) setActive(p => p + 1);
      else setCompleted(true);
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [active, completed]);

  return (
    <div className="relative w-full overflow-hidden" style={{ background: "transparent" }}>
      <style>{`
        ${planeKF}
        ${progressKF}
        @keyframes nodeRing {
          0%   { transform: scale(1);   opacity: 0.75; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes nodePop {
          0%   { transform: scale(0.7); opacity: 0; }
          60%  { transform: scale(1.12); }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes planeBob {
          0%,100% { transform: translateY(0px);  }
          50%     { transform: translateY(-5px); }
        }
        @keyframes fadeSlideUp {
          from { opacity:0; transform:translateY(18px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes shimmerText {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes liveDot {
          0%,100% { opacity:0.5; transform:scale(1);    }
          50%     { opacity:1;   transform:scale(1.25); }
        }
      `}</style>

      <div className="relative mx-auto px-4 py-14 md:py-20" style={{ maxWidth: 900 }}>

        {/* ── Header ── */}
        <div className="text-center mb-12" style={{ animation: "fadeSlideUp 0.7s ease both" }}>
          <div
            className="inline-flex items-center gap-2 text-[10px] font-black px-3 py-1 rounded-full mb-3 uppercase tracking-widest"
            style={{ background: "rgba(255,106,26,0.12)", border: "1px solid rgba(255,106,26,0.3)", color: "#ff6a1a" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#ff6a1a", animation: "liveDot 1.2s ease infinite" }} />
            Live Shipment Journey
          </div>
          <h2
            className="text-2xl md:text-4xl font-black leading-tight"
            style={{
              background: "linear-gradient(90deg,#ffffff 0%,#93c5fd 50%,#ff6a1a 100%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "shimmerText 4s linear infinite",
            }}
          >
            Every Parcel. Every Step. Tracked.
          </h2>
          <p className="text-white/40 text-sm mt-2 font-medium">
            SkyXpress delivers door-to-door across 195+ countries
          </p>
        </div>

        {/* ── Desktop track ── */}
        <div className="hidden md:block relative" style={{ height: 110 }}>

          {/* Dashed background rail */}
          <div
            className="absolute"
            style={{
              top: 28, left: `${LEFT_PCT}%`, right: `${100 - RIGHT_PCT}%`,
              height: 2,
              background: "repeating-linear-gradient(90deg,rgba(255,255,255,0.1) 0,rgba(255,255,255,0.1) 6px,transparent 6px,transparent 11px)",
            }}
          />

          {/* Animated progress fill — pure CSS, perfectly smooth */}
          <div
            className="absolute"
            style={{
              top: 28,
              left: `${LEFT_PCT}%`,
              height: 2,
              borderRadius: 4,
              background: "linear-gradient(90deg,#34d399,#60a5fa,#ff6a1a,#c084fc,#fb923c,#4ade80)",
              boxShadow: "0 0 8px rgba(255,106,26,0.5)",
              animation: `progressFill ${TOTAL_MS}ms linear infinite`,
            }}
          />

          {/* Animated plane — pure CSS linear, no jumps */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: 0,
              width: 28,
              zIndex: 10,
              animation: `planeGlide ${TOTAL_MS}ms linear infinite`,
            }}
          >
            <div style={{ animation: "planeBob 1.6s ease-in-out infinite", fontSize: 26, lineHeight: 1 }}>
              ✈️
            </div>
          </div>

          {/* Step nodes */}
          <div
            className="absolute inset-0 flex justify-between items-start"
            style={{ paddingLeft: `${LEFT_PCT}%`, paddingRight: `${100 - RIGHT_PCT}%`, paddingTop: 8 }}
          >
            {STEPS.map((s, i) => {
              const isDone    = i < active;
              const isCurrent = i === active;
              return (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2"
                  style={{ animation: `nodePop 0.5s ${i * 0.07}s ease both` }}
                >
                  {/* Circle */}
                  <div className="relative flex items-center justify-center" style={{ width: 56, height: 56 }}>
                    {isCurrent && (
                      <>
                        <span className="absolute inset-0 rounded-full" style={{ background: s.glow, animation: "nodeRing 1.1s ease-out infinite" }} />
                        <span className="absolute inset-0 rounded-full" style={{ background: s.glow, animation: "nodeRing 1.1s 0.45s ease-out infinite" }} />
                      </>
                    )}
                    <div
                      className="relative flex items-center justify-center rounded-full text-xl transition-all duration-500"
                      style={{
                        width:  isCurrent ? 52 : 40,
                        height: isCurrent ? 52 : 40,
                        background: isCurrent
                          ? `linear-gradient(135deg,${s.color},${s.color}bb)`
                          : isDone
                          ? `linear-gradient(135deg,${s.color}44,${s.color}18)`
                          : "rgba(255,255,255,0.04)",
                        border: isCurrent
                          ? `2px solid ${s.color}`
                          : isDone
                          ? `1.5px solid ${s.color}55`
                          : "1.5px solid rgba(255,255,255,0.1)",
                        boxShadow: isCurrent ? `0 0 22px ${s.glow}, 0 0 44px ${s.glow}` : "none",
                        transition: "all 0.5s cubic-bezier(0.4,0,0.2,1)",
                      }}
                    >
                      <span style={{ filter: isCurrent ? "drop-shadow(0 0 4px rgba(255,255,255,0.7))" : "none" }}>
                        {isDone ? "✅" : s.icon}
                      </span>
                    </div>
                  </div>

                  {/* Label */}
                  <div className="text-center" style={{ minWidth: 82 }}>
                    <div
                      className="text-[11px] font-bold leading-tight transition-colors duration-500"
                      style={{ color: isCurrent ? s.color : isDone ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)" }}
                    >
                      {s.label}
                    </div>
                    <div
                      className="text-[10px] font-medium mt-0.5 transition-colors duration-500"
                      style={{ color: isCurrent ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.13)" }}
                    >
                      {s.sub}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Mobile vertical list ── */}
        <div className="md:hidden flex flex-col gap-2.5">
          {STEPS.map((s, i) => {
            const isDone    = i < active;
            const isCurrent = i === active;
            return (
              <div
                key={i}
                className="flex items-center gap-4 rounded-2xl px-4 py-3 transition-all duration-500"
                style={{
                  background: isCurrent ? `${s.color}12` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isCurrent ? s.color + "44" : isDone ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.04)"}`,
                  boxShadow: isCurrent ? `0 0 18px ${s.glow}` : "none",
                }}
              >
                {/* Mobile progress line on left */}
                <div className="flex flex-col items-center gap-0 self-stretch" style={{ width: 2, marginRight: 2 }}>
                  <div className="flex-1 rounded-full transition-all duration-700"
                    style={{ width: 2, background: isDone || isCurrent ? s.color : "rgba(255,255,255,0.08)" }} />
                </div>

                <div
                  className="flex items-center justify-center rounded-full text-lg flex-shrink-0"
                  style={{
                    width: 44, height: 44,
                    background: isCurrent ? `${s.color}28` : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${isCurrent ? s.color : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  {isDone ? "✅" : s.icon}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold transition-colors duration-500"
                    style={{ color: isCurrent ? s.color : isDone ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.2)" }}>
                    {s.label}
                  </div>
                  <div className="text-[11px] text-white/25">{s.sub}</div>
                </div>
                {isCurrent && (
                  <div className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${s.color}22`, color: s.color, border: `1px solid ${s.color}35` }}>
                    LIVE
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Active step detail pill ── */}
        <div key={active} className="mt-10 flex flex-col items-center gap-3"
          style={{ animation: "fadeSlideUp 0.4s ease both" }}>
          <div
            className="flex items-center gap-3 px-5 py-3 rounded-2xl"
            style={{
              background: `${STEPS[active].color}10`,
              border:     `1px solid ${STEPS[active].color}30`,
              boxShadow:  `0 4px 28px ${STEPS[active].glow}`,
            }}
          >
            <span style={{ fontSize: 22 }}>{STEPS[active].icon}</span>
            <div>
              <div className="text-sm font-black" style={{ color: STEPS[active].color }}>
                {STEPS[active].label}
              </div>
              <div className="text-xs text-white/35">{STEPS[active].sub}</div>
            </div>
            <div
              className="ml-4 flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest"
              style={{
                background: `${STEPS[active].color}18`,
                color:       STEPS[active].color,
                border:     `1px solid ${STEPS[active].color}35`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full"
                style={{ background: STEPS[active].color, animation: "liveDot 0.9s ease infinite" }} />
              {completed ? "Complete" : "In Progress"}
            </div>
          </div>

          {/* Step progress dots */}
          <div className="flex gap-2">
            {STEPS.map((s, i) => (
              <div key={i} className="rounded-full transition-all duration-500"
                style={{
                  width: i === active ? 20 : 6,
                  height: 6,
                  background: i <= active ? s.color : "rgba(255,255,255,0.1)",
                }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
