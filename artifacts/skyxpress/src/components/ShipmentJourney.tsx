import { useState, useEffect, useRef } from "react";

/* ─── config ─── */
const STEPS = [
  { icon: "📦", label: "Parcel Received",  sub: "Origin warehouse",  color: "#34d399", glow: "rgba(52,211,153,0.45)"  },
  { icon: "🚚", label: "Collected",        sub: "Courier dispatch",  color: "#60a5fa", glow: "rgba(96,165,250,0.45)"  },
  { icon: "✈️", label: "In Flight",        sub: "SkyXpress air",     color: "#ff6a1a", glow: "rgba(255,106,26,0.55)"  },
  { icon: "🛂", label: "Customs Clear",    sub: "Border approved",   color: "#c084fc", glow: "rgba(192,132,252,0.45)" },
  { icon: "📍", label: "Hub Arrived",      sub: "Destination city",  color: "#fb923c", glow: "rgba(251,146,60,0.45)"  },
  { icon: "🏠", label: "Delivered",        sub: "Door-to-door ✓",    color: "#4ade80", glow: "rgba(74,222,128,0.55)"  },
];

const N         = STEPS.length;
const STEP_MS   = 1800;           // time per step
const PAUSE_MS  = 2400;           // hold at "Delivered" before restart
const TOTAL_MS  = STEP_MS * N + PAUSE_MS;

// Horizontal node positions as % of the track container
const TRACK_L = 6;                // left  edge %
const TRACK_R = 94;               // right edge %
const nodeX   = (i: number) => TRACK_L + (i / (N - 1)) * (TRACK_R - TRACK_L);

/* ─── component ─── */
export default function ShipmentJourney() {
  const [active, setActive]       = useState(0);
  const [completed, setCompleted] = useState(false);

  const planeRef    = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const activeRef   = useRef(0);
  const startRef    = useRef<number | null>(null);
  const rafRef      = useRef<number>(0);

  /* ── single rAF loop: drives plane + progress bar via direct DOM ── */
  useEffect(() => {
    const tick = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = (ts - startRef.current) % TOTAL_MS;
      const isTravelling = elapsed < STEP_MS * N;

      if (isTravelling) {
        /* ── plane position ── */
        const stepFloat = elapsed / STEP_MS;          // e.g. 2.34 = midway through step 2→3
        const stepIdx   = Math.min(Math.floor(stepFloat), N - 1);
        const frac      = stepFloat - stepIdx;         // 0..1 within this step
        const fromX     = nodeX(stepIdx);
        const toX       = nodeX(Math.min(stepIdx + 1, N - 1));
        // Ease in-out within each step for natural feel
        const eased     = frac < 0.5
          ? 2 * frac * frac
          : 1 - Math.pow(-2 * frac + 2, 2) / 2;
        const px        = stepIdx < N - 1 ? fromX + eased * (toX - fromX) : nodeX(N - 1);

        if (planeRef.current) {
          planeRef.current.style.left    = `calc(${px}% - 14px)`;
          planeRef.current.style.opacity = "1";
        }

        /* ── progress bar ── */
        if (progressRef.current) {
          const trackW = TRACK_R - TRACK_L;
          const fillW  = ((px - TRACK_L) / trackW) * trackW;
          progressRef.current.style.width   = `${fillW}%`;
          progressRef.current.style.opacity = "1";
        }

        /* ── active step (state — triggers re-render only on change) ── */
        if (stepIdx !== activeRef.current) {
          activeRef.current = stepIdx;
          setActive(stepIdx);
          setCompleted(false);
        }

      } else {
        /* ── pause phase ── */
        if (planeRef.current) {
          planeRef.current.style.left    = `calc(${nodeX(N - 1)}% - 14px)`;
          planeRef.current.style.opacity = "0.35";
        }
        if (progressRef.current) {
          progressRef.current.style.width = `${TRACK_R - TRACK_L}%`;
        }
        if (activeRef.current !== N - 1) {
          activeRef.current = N - 1;
          setActive(N - 1);
          setCompleted(true);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const cur = STEPS[active];

  return (
    <div className="relative w-full overflow-hidden">
      <style>{`
        @keyframes nodeRing {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes nodePop {
          0%   { transform: scale(0.65); opacity: 0; }
          65%  { transform: scale(1.1); }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes planeBob {
          0%,100% { transform: translateY(0px); }
          50%     { transform: translateY(-5px); }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes shimmerTxt {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes liveDot {
          0%,100% { opacity:0.5; transform:scale(1);    }
          50%     { opacity:1;   transform:scale(1.3);  }
        }
        @keyframes dashMove {
          to { stroke-dashoffset: -16; }
        }
      `}</style>

      <div className="relative mx-auto px-4 py-14 md:py-20" style={{ maxWidth: 920 }}>

        {/* ── header ── */}
        <div className="text-center mb-12" style={{ animation: "fadeUp 0.7s ease both" }}>
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
              background: "linear-gradient(90deg,#fff 0%,#93c5fd 45%,#ff6a1a 100%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "shimmerTxt 4s linear infinite",
            }}
          >
            Every Parcel. Every Step. Tracked.
          </h2>
          <p className="text-white/40 text-sm mt-2 font-medium">
            SkyXpress delivers door-to-door across 195+ countries
          </p>
        </div>

        {/* ═══════════════ DESKTOP TRACK ═══════════════ */}
        <div className="hidden md:block relative" style={{ height: 116 }}>

          {/* Dashed rail */}
          <svg className="absolute inset-0 w-full pointer-events-none" height="60"
            style={{ top: 20, overflow: "visible" }}>
            <line
              x1={`${TRACK_L}%`} y1="30" x2={`${TRACK_R}%`} y2="30"
              stroke="rgba(255,255,255,0.08)" strokeWidth="2"
              strokeDasharray="6 5"
              style={{ animation: "dashMove 1s linear infinite" }}
            />
          </svg>

          {/* Progress fill — updated directly by rAF */}
          <div
            ref={progressRef}
            className="absolute pointer-events-none"
            style={{
              top: 49, left: `${TRACK_L}%`,
              height: 2, width: "0%",
              borderRadius: 4,
              background: "linear-gradient(90deg,#34d399,#60a5fa,#ff6a1a,#c084fc,#fb923c,#4ade80)",
              boxShadow: "0 0 8px rgba(255,140,50,0.5)",
              opacity: 1,
            }}
          />

          {/* ✈️ Plane — position updated directly by rAF, NO CSS left transition */}
          <div
            ref={planeRef}
            className="absolute pointer-events-none"
            style={{ top: 8, left: `calc(${TRACK_L}% - 14px)`, width: 28, zIndex: 10 }}
          >
            <div style={{ animation: "planeBob 1.4s ease-in-out infinite", fontSize: 26, lineHeight: 1 }}>
              ✈️
            </div>
          </div>

          {/* Step nodes */}
          <div
            className="absolute inset-0 flex justify-between items-start"
            style={{ paddingLeft: `${TRACK_L}%`, paddingRight: `${100 - TRACK_R}%`, paddingTop: 6 }}
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
                  <div className="relative flex items-center justify-center" style={{ width: 58, height: 58 }}>
                    {isCurrent && (
                      <>
                        <span className="absolute inset-0 rounded-full"
                          style={{ background: s.glow, animation: "nodeRing 1.1s ease-out infinite" }} />
                        <span className="absolute inset-0 rounded-full"
                          style={{ background: s.glow, animation: "nodeRing 1.1s 0.45s ease-out infinite" }} />
                      </>
                    )}
                    <div
                      className="relative flex items-center justify-center rounded-full text-xl transition-all duration-500"
                      style={{
                        width:  isCurrent ? 52 : 40,
                        height: isCurrent ? 52 : 40,
                        background: isCurrent
                          ? `linear-gradient(135deg,${s.color},${s.color}bb)`
                          : isDone ? `${s.color}28` : "rgba(255,255,255,0.04)",
                        border: `2px solid ${isCurrent ? s.color : isDone ? s.color + "44" : "rgba(255,255,255,0.1)"}`,
                        boxShadow: isCurrent ? `0 0 24px ${s.glow}, 0 0 48px ${s.glow}` : "none",
                        transition: "all 0.45s cubic-bezier(0.4,0,0.2,1)",
                      }}
                    >
                      <span style={{ filter: isCurrent ? "drop-shadow(0 0 5px rgba(255,255,255,0.7))" : "none" }}>
                        {isDone ? "✅" : s.icon}
                      </span>
                    </div>
                  </div>

                  <div className="text-center" style={{ minWidth: 84 }}>
                    <div className="text-[11px] font-bold leading-tight transition-colors duration-400"
                      style={{ color: isCurrent ? s.color : isDone ? "rgba(255,255,255,0.48)" : "rgba(255,255,255,0.18)" }}>
                      {s.label}
                    </div>
                    <div className="text-[10px] font-medium mt-0.5 transition-colors duration-400"
                      style={{ color: isCurrent ? "rgba(255,255,255,0.48)" : "rgba(255,255,255,0.12)" }}>
                      {s.sub}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════ MOBILE LIST ═══════════════ */}
        <div className="md:hidden flex flex-col gap-2.5">
          {STEPS.map((s, i) => {
            const isDone    = i < active;
            const isCurrent = i === active;
            return (
              <div key={i} className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-500"
                style={{
                  background: isCurrent ? `${s.color}10` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isCurrent ? s.color + "44" : isDone ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.04)"}`,
                  boxShadow: isCurrent ? `0 0 20px ${s.glow}` : "none",
                }}>
                <div className="flex items-center justify-center rounded-full text-lg flex-shrink-0 transition-all duration-500"
                  style={{
                    width: 44, height: 44,
                    background: isCurrent ? `${s.color}28` : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${isCurrent ? s.color : "rgba(255,255,255,0.08)"}`,
                  }}>
                  {isDone ? "✅" : s.icon}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold transition-colors duration-500"
                    style={{ color: isCurrent ? s.color : isDone ? "rgba(255,255,255,0.42)" : "rgba(255,255,255,0.18)" }}>
                    {s.label}
                  </div>
                  <div className="text-[11px] text-white/25">{s.sub}</div>
                </div>
                {isCurrent && (
                  <div className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${s.color}20`, color: s.color, border: `1px solid ${s.color}35` }}>
                    LIVE
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Active step detail pill ── */}
        <div key={active} className="mt-10 flex flex-col items-center gap-3"
          style={{ animation: "fadeUp 0.4s ease both" }}>
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl"
            style={{
              background: `${cur.color}0e`,
              border: `1px solid ${cur.color}2e`,
              boxShadow: `0 4px 30px ${cur.glow}`,
            }}>
            <span style={{ fontSize: 22 }}>{cur.icon}</span>
            <div>
              <div className="text-sm font-black" style={{ color: cur.color }}>{cur.label}</div>
              <div className="text-xs text-white/35">{cur.sub}</div>
            </div>
            <div className="ml-4 flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest"
              style={{ background: `${cur.color}18`, color: cur.color, border: `1px solid ${cur.color}30` }}>
              <span className="w-1.5 h-1.5 rounded-full"
                style={{ background: cur.color, animation: "liveDot 0.9s ease infinite" }} />
              {completed ? "Complete" : "In Progress"}
            </div>
          </div>

          {/* dots */}
          <div className="flex gap-2">
            {STEPS.map((s, i) => (
              <div key={i} className="rounded-full transition-all duration-500"
                style={{ width: i === active ? 20 : 6, height: 6, background: i <= active ? s.color : "rgba(255,255,255,0.1)" }} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
