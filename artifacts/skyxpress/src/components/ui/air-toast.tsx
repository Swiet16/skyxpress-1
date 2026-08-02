import React from "react";
import { toast as sonnerToast } from "sonner";

/* ─────────────────────────────────────────────
   Sound engine — whoosh + turbine + chime
───────────────────────────────────────────── */
export function playAirSound(type: "success" | "error" | "info" | "warning" = "success") {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx() as AudioContext;

    /* Whoosh noise */
    const dur = 0.9;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const t = i / d.length;
      d[i] = (Math.random() * 2 - 1) * Math.pow(Math.sin(t * Math.PI), 0.6);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    const bpf = ctx.createBiquadFilter();
    bpf.type = "bandpass";
    bpf.frequency.setValueAtTime(1400, ctx.currentTime);
    bpf.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + dur);
    bpf.Q.value = 0.8;

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.22, ctx.currentTime);
    nGain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);

    noise.connect(bpf);
    bpf.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start();

    /* Engine turbine hum */
    const eng = ctx.createOscillator();
    eng.type = "sawtooth";
    eng.frequency.setValueAtTime(90, ctx.currentTime);
    eng.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.35);
    eng.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.75);

    const eGain = ctx.createGain();
    eGain.gain.setValueAtTime(0.06, ctx.currentTime);
    eGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.75);
    eng.connect(eGain);
    eGain.connect(ctx.destination);
    eng.start();
    eng.stop(ctx.currentTime + 0.75);

    /* Success chime — C E G ascending */
    if (type === "success") {
      [523, 659, 784].forEach((freq, i) => {
        const delay = 0.55 + i * 0.11;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, ctx.currentTime + delay);
        g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + delay + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.45);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.5);
      });
    }

    /* Error buzz */
    if (type === "error") {
      const buzz = ctx.createOscillator();
      buzz.type = "square";
      buzz.frequency.setValueAtTime(160, ctx.currentTime + 0.5);
      buzz.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.9);
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(0.12, ctx.currentTime + 0.5);
      bg.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.9);
      buzz.connect(bg);
      bg.connect(ctx.destination);
      buzz.start(ctx.currentTime + 0.5);
      buzz.stop(ctx.currentTime + 0.9);
    }
  } catch (_) { /* audio not available */ }
}

/* ─────────────────────────────────────────────
   Star component
───────────────────────────────────────────── */
function Star({ style }: { style: React.CSSProperties }) {
  return (
    <span
      style={{
        position: "absolute",
        color: "rgba(255,255,255,0.85)",
        fontSize: 9,
        animation: "airStarTwinkle 2s ease-in-out infinite",
        ...style,
      }}
    >
      ★
    </span>
  );
}

/* ─────────────────────────────────────────────
   Toast content
───────────────────────────────────────────── */
const TYPE_CONFIG = {
  success: {
    gradient: "linear-gradient(135deg, #0f2027 0%, #1a3a4a 40%, #0d3b2e 100%)",
    accent: "#22c55e",
    icon: "✓",
    iconBg: "rgba(34,197,94,0.2)",
    iconBorder: "rgba(34,197,94,0.5)",
    pathColor: "rgba(34,197,94,0.25)",
    contrail: "linear-gradient(to left, rgba(34,197,94,0.7), rgba(34,197,94,0.3), transparent)",
    glow: "rgba(34,197,94,0.15)",
  },
  error: {
    gradient: "linear-gradient(135deg, #1a0a0a 0%, #3b0d0d 40%, #1a0a0a 100%)",
    accent: "#ef4444",
    icon: "✕",
    iconBg: "rgba(239,68,68,0.2)",
    iconBorder: "rgba(239,68,68,0.5)",
    pathColor: "rgba(239,68,68,0.25)",
    contrail: "linear-gradient(to left, rgba(239,68,68,0.7), rgba(239,68,68,0.3), transparent)",
    glow: "rgba(239,68,68,0.15)",
  },
  warning: {
    gradient: "linear-gradient(135deg, #1a1000 0%, #3b2800 40%, #1a1000 100%)",
    accent: "#f59e0b",
    icon: "⚠",
    iconBg: "rgba(245,158,11,0.2)",
    iconBorder: "rgba(245,158,11,0.5)",
    pathColor: "rgba(245,158,11,0.25)",
    contrail: "linear-gradient(to left, rgba(245,158,11,0.7), rgba(245,158,11,0.3), transparent)",
    glow: "rgba(245,158,11,0.15)",
  },
  info: {
    gradient: "linear-gradient(135deg, #0a0f2a 0%, #0d1f4a 40%, #0a1a2e 100%)",
    accent: "#60a5fa",
    icon: "ℹ",
    iconBg: "rgba(96,165,250,0.2)",
    iconBorder: "rgba(96,165,250,0.5)",
    pathColor: "rgba(96,165,250,0.25)",
    contrail: "linear-gradient(to left, rgba(96,165,250,0.7), rgba(96,165,250,0.3), transparent)",
    glow: "rgba(96,165,250,0.15)",
  },
} as const;

interface AirToastProps {
  title: string;
  description?: string;
  type?: keyof typeof TYPE_CONFIG;
}

export function AirToastContent({ title, description, type = "success" }: AirToastProps) {
  const cfg = TYPE_CONFIG[type];

  return (
    <div
      style={{
        width: 340,
        background: cfg.gradient,
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.1)`,
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}
    >
      {/* Stars layer */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <Star style={{ top: "18%", left: "8%",  animationDelay: "0s" }} />
        <Star style={{ top: "55%", left: "18%", animationDelay: "0.4s", fontSize: 5 }} />
        <Star style={{ top: "22%", left: "38%", animationDelay: "0.8s", fontSize: 6 }} />
        <Star style={{ top: "65%", left: "52%", animationDelay: "0.2s", fontSize: 5 }} />
        <Star style={{ top: "15%", left: "68%", animationDelay: "1.1s" }} />
        <Star style={{ top: "70%", left: "80%", animationDelay: "0.6s", fontSize: 6 }} />
        <Star style={{ top: "30%", left: "90%", animationDelay: "0.3s", fontSize: 5 }} />
      </div>

      {/* Glow pulse behind plane path */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 0,
          right: 0,
          height: 48,
          background: `radial-gradient(ellipse 60% 100% at 50% 50%, ${cfg.glow}, transparent)`,
          animation: "airGlowPulse 2s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* ── Flight zone ── */}
      <div style={{ position: "relative", height: 68, overflow: "hidden" }}>

        {/* Dashed flight path */}
        <div
          style={{
            position: "absolute",
            top: 30,
            left: 12,
            right: 12,
            height: 1,
            background: `repeating-linear-gradient(to right, ${cfg.pathColor} 0, ${cfg.pathColor} 10px, transparent 10px, transparent 20px)`,
          }}
        />

        {/* Plane + contrail + parcel group */}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 0,
            display: "flex",
            alignItems: "flex-start",
            animation: "airPlaneFly 2.6s cubic-bezier(0.25, 0.1, 0.25, 1) forwards",
          }}
        >
          {/* Contrail */}
          <div
            style={{
              position: "absolute",
              right: "calc(100% - 8px)",
              top: 14,
              height: 3,
              width: 0,
              background: cfg.contrail,
              borderRadius: 2,
              animation: "airContrailGrow 2.6s cubic-bezier(0.25, 0.1, 0.25, 1) forwards",
            }}
          />

          {/* Plane emoji */}
          <span
            style={{
              fontSize: 30,
              lineHeight: 1,
              filter: "drop-shadow(0 2px 12px rgba(0,0,0,0.8))",
              display: "block",
            }}
          >
            ✈️
          </span>

          {/* Rope + parcel */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginLeft: -10,
              marginTop: 22,
              animation: "airParcelSwing 0.55s ease-in-out infinite",
              transformOrigin: "top center",
            }}
          >
            {/* Rope segments */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 1.5, height: 4, background: "rgba(255,255,255,0.6)", borderRadius: 1 }} />
              ))}
            </div>
            <span style={{ fontSize: 18, lineHeight: 1, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.7))" }}>
              📦
            </span>
          </div>
        </div>

        {/* Landing strip dots at right edge */}
        <div style={{ position: "absolute", right: 14, top: 27, display: "flex", gap: 3 }}>
          {[0,1,2].map(i => (
            <div
              key={i}
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: cfg.accent,
                opacity: 0.7,
                animation: `airDotBlink 1s ${i * 0.25}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "0 16px" }} />

      {/* Message row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px 14px" }}>
        {/* Status icon */}
        <div
          style={{
            flexShrink: 0,
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: cfg.iconBg,
            border: `1.5px solid ${cfg.iconBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: cfg.accent,
            fontWeight: 700,
            fontSize: 13,
            marginTop: 1,
          }}
        >
          {cfg.icon}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: "#fff", fontWeight: 600, fontSize: 14, lineHeight: 1.3, margin: 0 }}>
            {title}
          </p>
          {description && (
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, lineHeight: 1.5, margin: "3px 0 0" }}>
              {description}
            </p>
          )}
        </div>

        {/* SkyXpress badge */}
        <div
          style={{
            flexShrink: 0,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6,
            padding: "2px 6px",
            fontSize: 9,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.05em",
            fontWeight: 600,
            textTransform: "uppercase",
            marginTop: 2,
          }}
        >
          SKX
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 2,
          background: `linear-gradient(to right, ${cfg.accent}, rgba(255,255,255,0.2))`,
          animation: "airProgressBar 4.5s linear forwards",
          transformOrigin: "left",
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Public helper — call this everywhere
───────────────────────────────────────────── */
export function airToast(
  title: string,
  description?: string,
  type: keyof typeof TYPE_CONFIG = "success",
) {
  playAirSound(type);
  sonnerToast.custom(
    () => <AirToastContent title={title} description={description} type={type} />,
    { duration: 4500, unstyled: true },
  );
}
