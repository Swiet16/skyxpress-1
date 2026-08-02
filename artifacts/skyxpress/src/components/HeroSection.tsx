import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Globe, Zap, Shield, TrendingUp } from "lucide-react";

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

      {/* ── CONTENT ── */}
      <div className="relative z-10 container mx-auto px-4 py-20 flex flex-col items-center text-center gap-10">

        {/* CTAs */}
        <div
          className="flex flex-wrap justify-center gap-4"
          style={{ animation: visible ? "slideUp 0.7s 0.3s ease both" : "none", opacity: 0 }}
        >
          <Link to="/track">
            <Button
              size="lg"
              className="h-12 px-8 text-sm font-bold rounded-xl gap-2 shadow-2xl"
              style={{ background: "linear-gradient(135deg,#2e86ff,#1a5aff)", border: "none" }}
            >
              Track Shipment <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/quote">
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-8 text-sm font-bold rounded-xl gap-2"
              style={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.85)", background: "rgba(255,255,255,0.05)" }}
            >
              Get a Quote
            </Button>
          </Link>
          <Link to="/auth">
            <Button
              size="lg"
              className="h-12 px-8 text-sm font-bold rounded-xl gap-2"
              style={{ background: "linear-gradient(135deg,#ff6a1a,#e55a0a)", border: "none" }}
            >
              Partner Portal
            </Button>
          </Link>
        </div>

        {/* animated stat counters */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-3xl"
          style={{ animation: visible ? "slideUp 0.7s 0.45s ease both" : "none", opacity: 0 }}
        >
          <StatCard value={195}  suffix="+"  label="Countries"  icon={Globe}       color="#2e86ff"  started={visible} />
          <StatCard value={40}   suffix="yr" label="Experience" icon={TrendingUp}   color="#ffb020"  started={visible} />
          <StatCard value={1000} suffix="K+" label="Shipments"  icon={ArrowRight}   color="#0f9d58"  started={visible} />
          <StatCard value={99}   suffix=".8%" label="On-time"   icon={Shield}       color="#ff6a1a"  started={visible} />
        </div>

        {/* trust strip */}
        <div
          className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs text-white/35 font-semibold tracking-widest uppercase"
          style={{ animation: visible ? "fadeIn 1s 0.8s ease both" : "none", opacity: 0 }}
        >
          {["ISO Certified", "IATA Member", "Worldwide Coverage", "24/7 Support", "Real-time Tracking"].map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-white/25" />
              {t}
            </span>
          ))}
        </div>
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
