import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Globe, Zap, Shield, TrendingUp } from "lucide-react";
import ShipmentJourney from "./ShipmentJourney";

/* ── animated counter hook ── */
function useCounter(target: number, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

/* ── floating orb ── */
function Orb({ x, y, size, color, delay }: { x: string; y: string; size: number; color: string; delay: number }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x, top: y,
        width: size, height: size,
        background: color,
        filter: `blur(${size * 0.55}px)`,
        opacity: 0.35,
        animation: `orbFloat ${5 + delay}s ease-in-out ${delay}s infinite alternate`,
      }}
    />
  );
}

/* ── grid overlay ── */
function GridOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage:
          "linear-gradient(rgba(46,134,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(46,134,255,0.06) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
        maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 100%)",
      }}
    />
  );
}

/* ── stat card ── */
function StatCard({ value, suffix, label, icon: Icon, color, started }: {
  value: number; suffix: string; label: string; icon: React.ElementType; color: string; started: boolean;
}) {
  const count = useCounter(value, 1800, started);
  return (
    <div className="group relative flex flex-col items-center gap-1 px-8 py-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-white/25 hover:bg-white/8 transition-all duration-300 cursor-default">
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${color}22 0%, transparent 70%)` }}
      />
      <Icon className="h-5 w-5 mb-1" style={{ color }} />
      <div className="text-3xl font-black text-white tabular-nums leading-none">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">{label}</div>
    </div>
  );
}

const HeroSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[88vh] flex flex-col justify-center overflow-hidden"
      style={{ background: "linear-gradient(135deg, #050d1a 0%, #0b1f3a 40%, #071226 100%)" }}
    >
      {/* keyframes injected once */}
      <style>{`
        @keyframes orbFloat { from { transform: translateY(0px) scale(1); } to { transform: translateY(-30px) scale(1.08); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes scanLine { 0%,100% { transform:translateY(-100%); opacity:0; } 10%,90% { opacity:0.35; } 50% { transform:translateY(100vh); opacity:0.1; } }
        @keyframes planeFly {
          0%   { transform: translateX(-60px) translateY(0px) rotate(-5deg); opacity:0; }
          10%  { opacity:1; }
          90%  { opacity:1; }
          100% { transform: translateX(calc(100vw + 60px)) translateY(-30px) rotate(-3deg); opacity:0; }
        }
        @keyframes pulseRing { 0% { transform:scale(1); opacity:0.6; } 100% { transform:scale(2.5); opacity:0; } }
        @keyframes glowPulse { 0%,100% { opacity:0.6; } 50% { opacity:1; } }
      `}</style>

      {/* bg orbs */}
      <Orb x="5%"  y="10%" size={400} color="#1a5aff" delay={0} />
      <Orb x="70%" y="60%" size={350} color="#ff6a1a" delay={1.5} />
      <Orb x="85%" y="5%"  size={260} color="#2e86ff" delay={3} />
      <Orb x="20%" y="70%" size={220} color="#0f9d58" delay={2} />

      {/* grid */}
      <GridOverlay />

      {/* scan line */}
      <div
        className="absolute inset-x-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg,transparent,rgba(46,134,255,0.6),transparent)", animation: "scanLine 8s linear infinite" }}
      />

      {/* flying plane */}
      <div
        className="absolute pointer-events-none text-white/60"
        style={{ top: "30%", fontSize: 28, animation: "planeFly 12s linear 2s infinite" }}
      >
        ✈
      </div>

      {/* ── SHIPMENT JOURNEY ANIMATION ── */}
      <div className="relative z-10 w-full">
        <ShipmentJourney />
      </div>

      {/* bottom fade */}
      <div
        className="absolute bottom-0 inset-x-0 h-32 pointer-events-none"
        style={{ background: "linear-gradient(to top, var(--background, #050d1a), transparent)" }}
      />
    </section>
  );
};

export default HeroSection;
