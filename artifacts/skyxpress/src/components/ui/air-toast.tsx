import React, { useEffect, useState } from "react";
import { toast as sonnerToast } from "sonner";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";

/* ─────────────────────────────────────────────
   Sound engine — whoosh + turbine + chime
───────────────────────────────────────────── */
export function playAirSound(type: "success" | "error" | "info" | "warning" = "success") {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx() as AudioContext;

    const dur = 0.5;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const t = i / d.length;
      d[i] = (Math.random() * 2 - 1) * Math.pow(Math.sin(t * Math.PI), 0.8);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const bpf = ctx.createBiquadFilter();
    bpf.type = "bandpass";
    bpf.frequency.setValueAtTime(2000, ctx.currentTime);
    bpf.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + dur);
    bpf.Q.value = 1.2;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.12, ctx.currentTime);
    nGain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
    noise.connect(bpf);
    bpf.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start();

    if (type === "success") {
      [659, 784].forEach((freq, i) => {
        const delay = 0.1 + i * 0.1;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, ctx.currentTime + delay);
        g.gain.linearRampToValueAtTime(0.14, ctx.currentTime + delay + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.35);
      });
    }

    if (type === "error") {
      const buzz = ctx.createOscillator();
      buzz.type = "square";
      buzz.frequency.setValueAtTime(140, ctx.currentTime + 0.05);
      buzz.frequency.linearRampToValueAtTime(70, ctx.currentTime + 0.4);
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(0.09, ctx.currentTime + 0.05);
      bg.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      buzz.connect(bg);
      bg.connect(ctx.destination);
      buzz.start(ctx.currentTime + 0.05);
      buzz.stop(ctx.currentTime + 0.4);
    }
  } catch (_) { /* audio not available */ }
}

/* ─────────────────────────────────────────────
   Type config
───────────────────────────────────────────── */
const TYPE_CONFIG = {
  success: {
    icon: CheckCircle2,
    accent: "#22d3a5",
    glow: "rgba(34,211,165,0.25)",
    label: "Success",
    bg: "linear-gradient(135deg, #0a1f18 0%, #0d2820 100%)",
    border: "rgba(34,211,165,0.25)",
  },
  error: {
    icon: XCircle,
    accent: "#f05252",
    glow: "rgba(240,82,82,0.25)",
    label: "Error",
    bg: "linear-gradient(135deg, #1f0a0a 0%, #280d0d 100%)",
    border: "rgba(240,82,82,0.25)",
  },
  info: {
    icon: Info,
    accent: "#3b9eff",
    glow: "rgba(59,158,255,0.25)",
    label: "Info",
    bg: "linear-gradient(135deg, #0a1020 0%, #0d1a2e 100%)",
    border: "rgba(59,158,255,0.25)",
  },
  warning: {
    icon: AlertTriangle,
    accent: "#f59e0b",
    glow: "rgba(245,158,11,0.25)",
    label: "Warning",
    bg: "linear-gradient(135deg, #1a1200 0%, #211700 100%)",
    border: "rgba(245,158,11,0.25)",
  },
} as const;

/* ─────────────────────────────────────────────
   Slim game-style toast content
───────────────────────────────────────────── */
function AirToastContent({
  title,
  description,
  type = "success",
  onDismiss,
}: {
  title: string;
  description?: string;
  type?: keyof typeof TYPE_CONFIG;
  onDismiss?: () => void;
}) {
  const cfg = TYPE_CONFIG[type];
  const Icon = cfg.icon;
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = 4000;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.max(0, 100 - (elapsed / duration) * 100));
      if (elapsed >= duration) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{
        width: 340,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)`,
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* accent left stripe */}
      <div style={{ display: "flex", gap: 0 }}>
        <div style={{ width: 3, background: `linear-gradient(180deg, ${cfg.accent}, ${cfg.accent}55)`, flexShrink: 0 }} />

        {/* main content */}
        <div style={{ flex: 1, padding: "10px 12px 10px 10px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
            {/* icon with glow */}
            <div
              style={{
                flexShrink: 0,
                width: 28,
                height: 28,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `${cfg.accent}18`,
                border: `1px solid ${cfg.accent}30`,
                boxShadow: `0 0 12px ${cfg.glow}`,
                marginTop: 1,
              }}
            >
              <Icon size={13} color={cfg.accent} strokeWidth={2.5} />
            </div>

            {/* text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#ffffff",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {title}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  {/* SKX badge */}
                  <div
                    style={{
                      fontSize: 8,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      color: cfg.accent,
                      background: `${cfg.accent}15`,
                      border: `1px solid ${cfg.accent}30`,
                      borderRadius: 4,
                      padding: "1px 5px",
                      textTransform: "uppercase",
                    }}
                  >
                    SKX
                  </div>
                  {/* dismiss */}
                  <button
                    onClick={onDismiss}
                    style={{
                      width: 16,
                      height: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 4,
                      cursor: "pointer",
                      color: "rgba(255,255,255,0.4)",
                      padding: 0,
                    }}
                  >
                    <X size={9} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
              {description && (
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.45)",
                    marginTop: 2,
                    lineHeight: 1.4,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {description}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* slim progress bar */}
      <div style={{ height: 2, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${cfg.accent}, ${cfg.accent}88)`,
            transition: "width 0.03s linear",
            boxShadow: `0 0 6px ${cfg.glow}`,
          }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Public helper
───────────────────────────────────────────── */
export function airToast(
  title: string,
  description?: string,
  type: keyof typeof TYPE_CONFIG = "success",
) {
  playAirSound(type);
  sonnerToast.custom(
    (id) => (
      <AirToastContent
        title={title}
        description={description}
        type={type}
        onDismiss={() => sonnerToast.dismiss(id)}
      />
    ),
    { duration: 4000, unstyled: true },
  );
}
