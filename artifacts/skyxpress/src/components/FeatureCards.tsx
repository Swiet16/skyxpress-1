import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Globe, Package, ShoppingCart, ArrowRight, Plane, Users, Clock, Shield,
  Zap, BarChart3, FileText, HeadphonesIcon,
} from "lucide-react";

/* ── animated entrance hook ── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setSeen(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, seen };
}

/* ── main feature card ── */
interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
  link: string;
  accent: string;
  tag?: string;
}

function FeatureCard({ feature, index, seen }: { feature: Feature; index: number; seen: boolean }) {
  const { icon: Icon, title, description, link, accent, tag } = feature;
  const delay = (index % 3) * 0.1 + Math.floor(index / 3) * 0.15;
  return (
    <div
      className="group relative rounded-2xl p-6 cursor-pointer overflow-hidden transition-all duration-500 hover:-translate-y-1"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
        animation: seen ? `cardIn 0.6s ${delay}s ease both` : "none",
        opacity: seen ? undefined : 0,
      }}
    >
      {/* hover glow */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 20% 20%, ${accent}18 0%, transparent 60%)` }}
      />
      {/* accent top border */}
      <div
        className="absolute top-0 left-6 right-6 h-px transition-all duration-500 group-hover:left-0 group-hover:right-0"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      {tag && (
        <span
          className="absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
          style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}
        >
          {tag}
        </span>
      )}

      {/* icon */}
      <div
        className="mb-4 w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
      >
        <Icon className="h-6 w-6" style={{ color: accent }} />
      </div>

      <h3 className="text-base font-bold text-white mb-2 leading-snug">{title}</h3>
      <p className="text-sm text-white/45 leading-relaxed mb-5">{description}</p>

      <Link to={link}>
        <button
          className="flex items-center gap-1.5 text-xs font-semibold transition-all duration-300 group-hover:gap-2.5"
          style={{ color: accent }}
        >
          Explore <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </Link>
    </div>
  );
}

/* ── partner highlight card ── */
function PartnerCard({ seen }: { seen: boolean }) {
  return (
    <div
      className="col-span-full relative rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0b1f3a 0%, #0a2244 60%, #0d1a2e 100%)",
        border: "1px solid rgba(46,134,255,0.25)",
        animation: seen ? "cardIn 0.7s 0.5s ease both" : "none",
        opacity: seen ? undefined : 0,
      }}
    >
      {/* decorative grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(46,134,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(46,134,255,0.05) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute right-0 top-0 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(46,134,255,0.15) 0%, transparent 70%)" }} />

      <div className="relative z-10 p-5 md:p-10 grid md:grid-cols-2 gap-6 md:gap-8 items-center">
        <div>
          <div
            className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-widest"
            style={{ background: "rgba(46,134,255,0.15)", border: "1px solid rgba(46,134,255,0.3)", color: "#60a5fa" }}
          >
            <Users className="h-3 w-3" /> Partner Program
          </div>
          <h3 className="text-xl md:text-3xl font-black text-white mb-3 leading-tight">
            Grow your business with the <span style={{ color: "#2e86ff" }}>SkyXpress</span> network
          </h3>
          <p className="text-white/50 text-sm leading-relaxed mb-5">
            Join hundreds of logistics partners worldwide. Get access to our global cargo network,
            dedicated account management, real-time manifest tools, and competitive rates.
          </p>
          {/* benefit badges — 2-col grid on mobile so they never overflow */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {["Competitive Rates", "Dedicated Support", "Manifest Tools", "Volume Discounts"].map(b => (
              <span
                key={b}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg truncate"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
              >
                ✓ {b}
              </span>
            ))}
          </div>
          {/* buttons — stack on mobile, side-by-side on sm+ */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Link to="/auth" className="w-full sm:w-auto">
              <Button
                size="sm"
                className="w-full sm:w-auto h-9 px-5 text-xs font-bold rounded-xl"
                style={{ background: "linear-gradient(135deg,#2e86ff,#1a5aff)", border: "none" }}
              >
                Become a Partner <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/network" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto h-9 px-5 text-xs font-bold rounded-xl"
                style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", background: "transparent" }}
              >
                View Network
              </Button>
            </Link>
          </div>
        </div>

        {/* stat cards — always 2-col */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: "Active Partners",  value: "480+",    color: "#2e86ff" },
            { label: "Countries Covered",value: "195+",    color: "#ff6a1a" },
            { label: "Daily Flights",    value: "1,200+",  color: "#0f9d58" },
            { label: "Partner Revenue",  value: "+34%",    color: "#ffb020" },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-xl p-3 md:p-4 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="text-xl md:text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] md:text-[11px] text-white/40 font-semibold mt-0.5 uppercase tracking-wide leading-tight">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── How it works ── */
const STEPS = [
  { step: "01", title: "Book Online", desc: "Create your shipment in seconds — quote, label, done.", icon: FileText, color: "#2e86ff" },
  { step: "02", title: "We Collect", desc: "Our team picks up from your door at a scheduled time.", icon: Package, color: "#ff6a1a" },
  { step: "03", title: "Air Transit", desc: "Cargo flies on dedicated or commercial airline routes.", icon: Plane, color: "#0f9d58" },
  { step: "04", title: "Delivered", desc: "Last-mile delivery with real-time tracking updates.", icon: Clock, color: "#ffb020" },
];

function HowItWorks({ seen }: { seen: boolean }) {
  return (
    <div className="mt-24">
      <div
        className="text-center mb-12"
        style={{ animation: seen ? "cardIn 0.6s 0.1s ease both" : "none", opacity: seen ? undefined : 0 }}
      >
        <div
          className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-widest"
          style={{ background: "rgba(255,106,26,0.12)", border: "1px solid rgba(255,106,26,0.25)", color: "#ff6a1a" }}
        >
          <Zap className="h-3 w-3" /> How It Works
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
          Ship worldwide in <span style={{ color: "#2e86ff" }}>4 simple steps</span>
        </h2>
      </div>
      <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* connector line */}
        <div
          className="absolute top-10 left-[12.5%] right-[12.5%] h-px hidden md:block pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)" }}
        />
        {STEPS.map((s, i) => (
          <div
            key={s.step}
            className="relative flex flex-col items-center text-center gap-3 p-5 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              animation: seen ? `cardIn 0.6s ${0.2 + i * 0.1}s ease both` : "none",
              opacity: seen ? undefined : 0,
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: `${s.color}18`, border: `1px solid ${s.color}30` }}
            >
              <s.icon className="h-6 w-6" style={{ color: s.color }} />
            </div>
            <div className="text-[10px] font-black text-white/20 tracking-widest">{s.step}</div>
            <h4 className="text-sm font-bold text-white leading-snug">{s.title}</h4>
            <p className="text-xs text-white/40 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── main export ── */
const FEATURES: Feature[] = [
  {
    icon: Globe,
    title: "Global Network",
    description: "Our network stretches across all continents — fast, reliable express delivery to almost every country on Earth.",
    link: "/network",
    accent: "#2e86ff",
  },
  {
    icon: Package,
    title: "Real-time Tracking",
    description: "Monitor every shipment from pickup to doorstep. Live status, route checkpoints, and instant notifications.",
    link: "/track",
    accent: "#0f9d58",
  },
  {
    icon: ShoppingCart,
    title: "E-commerce Solutions",
    description: "Plug SkyXpress into your store. Automated labels, bulk imports, and fulfillment API for high-volume sellers.",
    link: "/services",
    accent: "#ff6a1a",
  },
  {
    icon: Plane,
    title: "Air Freight",
    description: "Dedicated cargo capacity on scheduled airline routes. Ideal for heavy, oversized, or time-critical freight.",
    link: "/services",
    accent: "#a78bfa",
    tag: "Popular",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Full visibility into shipping spend, volume trends, delivery rates, and partner performance in one place.",
    link: "/dashboard",
    accent: "#ffb020",
  },
  {
    icon: HeadphonesIcon,
    title: "24/7 Support",
    description: "Dedicated ops team available around the clock. Live chat, phone, and priority escalation paths.",
    link: "/contact",
    accent: "#f472b6",
  },
];

const FeatureCards = () => {
  const { ref, seen } = useInView();

  return (
    <section
      ref={ref}
      className="py-20 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, var(--background) 0%, #050d1a 100%)" }}
    >
      <style>{`
        @keyframes cardIn {
          from { opacity:0; transform:translateY(28px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
      `}</style>

      <div className="container mx-auto px-4">
        {/* section header */}
        <div
          className="text-center mb-14"
          style={{ animation: seen ? "cardIn 0.6s ease both" : "none", opacity: seen ? undefined : 0 }}
        >
          <div
            className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-widest"
            style={{ background: "rgba(46,134,255,0.12)", border: "1px solid rgba(46,134,255,0.25)", color: "#60a5fa" }}
          >
            <Shield className="h-3 w-3" /> What We Offer
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-3">
            Everything your logistics
            <br />
            <span style={{ background: "linear-gradient(90deg,#2e86ff,#ff6a1a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              operation needs
            </span>
          </h2>
          <p className="text-white/40 text-base max-w-xl mx-auto">
            From single parcels to enterprise freight — one platform, global reach.
          </p>
        </div>

        {/* feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} seen={seen} />
          ))}
        </div>

        {/* partner highlight */}
        <PartnerCard seen={seen} />

        {/* how it works */}
        <HowItWorks seen={seen} />
      </div>
    </section>
  );
};

export default FeatureCards;
