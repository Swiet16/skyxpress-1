import { useState, useEffect, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import FeatureCards from "@/components/FeatureCards";
import ImageSlider from "@/components/ImageSlider";
import { TrackingSection } from "@/components/TrackingSection";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Globe, Package, Shield, Zap, Users, Star } from "lucide-react";

/* ── animated entrance ── */
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setSeen(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, seen };
}

/* ── live ticker ── */
const TICKER_ITEMS = [
  "✈  SkyXpress now covers 195+ countries",
  "📦  1M+ parcels delivered this year",
  "🌍  New routes: Lagos · Nairobi · Accra",
  "⚡  Same-day collection available in select cities",
  "🏆  ISO certified — 99.8% on-time delivery",
  "🤝  Partner programme now open — apply today",
];

function LiveTicker() {
  return (
    <div
      className="w-full overflow-hidden py-2.5"
      style={{ background: "linear-gradient(90deg,#0b1f3a,#061530,#0b1f3a)", borderBottom: "1px solid rgba(46,134,255,0.15)" }}
    >
      <style>{`
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div
        className="flex gap-16 whitespace-nowrap text-xs font-semibold text-white/50 tracking-wide"
        style={{ animation: "tickerScroll 30s linear infinite", width: "max-content" }}
      >
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
          <span key={i} className="flex items-center gap-3">
            {item}
            <span className="w-1 h-1 rounded-full bg-white/20" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── world stats row ── */
function WorldStatsRow({ seen }: { seen: boolean }) {
  const stats = [
    { label: "Shipments Today",   value: "12,847",  color: "#2e86ff", icon: Package },
    { label: "Active Flights",    value: "384",      color: "#ff6a1a", icon: Globe },
    { label: "Partner Hubs",      value: "92",       color: "#0f9d58", icon: Users },
    { label: "Delivered Today",   value: "11,290",   color: "#ffb020", icon: Shield },
    { label: "Avg Delivery Time", value: "2.3 days", color: "#a78bfa", icon: Zap },
  ];
  return (
    <div
      className="flex flex-wrap justify-center gap-0"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 20,
        overflow: "hidden",
      }}
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          className="flex-1 min-w-[140px] flex flex-col items-center gap-1 py-5 px-4 relative"
          style={{
            borderRight: i < stats.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
            animation: seen ? `statIn 0.5s ${i * 0.08}s ease both` : "none",
            opacity: seen ? undefined : 0,
          }}
        >
          <s.icon className="h-4 w-4 mb-1" style={{ color: s.color }} />
          <div className="text-xl font-black text-white">{s.value}</div>
          <div className="text-[10px] font-semibold text-white/35 uppercase tracking-widest text-center">{s.label}</div>
          {/* live dot */}
          <div
            className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full"
            style={{ background: s.color, boxShadow: `0 0 6px ${s.color}`, animation: "pulse 2s ease infinite" }}
          />
        </div>
      ))}
    </div>
  );
}

/* ── testimonial / trust section ── */
const TESTIMONIALS = [
  { name: "Kwame A.", role: "Logistics Director", text: "SkyXpress cut our air freight costs by 28%. Partner dashboard is exceptional.", rating: 5 },
  { name: "Maria S.", role: "E-commerce CEO", text: "Plug-and-play integration. Orders ship within hours, tracking is flawless.", rating: 5 },
  { name: "James O.", role: "Operations Manager", text: "99.8% on-time is not marketing — we verified it across 4,000 shipments.", rating: 5 },
];

function TrustSection({ seen }: { seen: boolean }) {
  return (
    <div className="mt-20">
      <div className="text-center mb-10" style={{ animation: seen ? "cardIn 0.6s ease both" : "none", opacity: seen ? undefined : 0 }}>
        <div
          className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-widest"
          style={{ background: "rgba(255,176,32,0.12)", border: "1px solid rgba(255,176,32,0.25)", color: "#ffb020" }}
        >
          <Star className="h-3 w-3" /> Trusted Worldwide
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-white">
          What our partners say
        </h2>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {TESTIMONIALS.map((t, i) => (
          <div
            key={t.name}
            className="rounded-2xl p-6"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              animation: seen ? `cardIn 0.6s ${0.1 + i * 0.1}s ease both` : "none",
              opacity: seen ? undefined : 0,
            }}
          >
            <div className="flex gap-0.5 mb-4">
              {Array.from({ length: t.rating }).map((_, j) => (
                <Star key={j} className="h-3.5 w-3.5 fill-current" style={{ color: "#ffb020" }} />
              ))}
            </div>
            <p className="text-sm text-white/60 leading-relaxed mb-5">"{t.text}"</p>
            <div>
              <div className="text-sm font-bold text-white">{t.name}</div>
              <div className="text-xs text-white/35">{t.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── CTA banner ── */
function CTABanner({ seen }: { seen: boolean }) {
  return (
    <div
      className="mt-20 rounded-2xl overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, #0b1f3a 0%, #071530 100%)",
        border: "1px solid rgba(46,134,255,0.2)",
        animation: seen ? "cardIn 0.7s 0.2s ease both" : "none",
        opacity: seen ? undefined : 0,
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(46,134,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(46,134,255,0.04) 1px,transparent 1px)",
        backgroundSize: "40px 40px",
      }} />
      <div className="absolute right-0 top-0 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,106,26,0.1) 0%, transparent 70%)" }} />
      <div className="relative z-10 p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-white mb-2">
            Ready to ship with confidence?
          </h2>
          <p className="text-white/45 text-sm">
            Open your SkyXpress account today — free to start, no contract required.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link to="/auth">
            <Button
              size="lg"
              className="h-11 px-7 text-sm font-bold rounded-xl"
              style={{ background: "linear-gradient(135deg,#2e86ff,#1a5aff)", border: "none" }}
            >
              Get Started Free <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/quote">
            <Button
              variant="outline"
              size="lg"
              className="h-11 px-7 text-sm font-bold rounded-xl"
              style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.04)" }}
            >
              Get a Quote
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ PAGE ══════════════════ */
const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { ref: extraRef, seen: extraSeen } = useInView();

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("Error getting session:", error);
      } finally {
        setLoading(false);
      }
    };
    getInitialSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#050d1a" }}>
        <style>{`
          @keyframes spinnerRing { to { transform: rotate(360deg); } }
        `}</style>
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full"
            style={{ border: "3px solid rgba(46,134,255,0.15)", borderTopColor: "#2e86ff", animation: "spinnerRing 0.8s linear infinite" }}
          />
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest">Loading SkyXpress</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#050d1a" }}>
      <style>{`
        @keyframes cardIn { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes statIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse  { 0%,100% { opacity:0.6; } 50% { opacity:1; } }
      `}</style>

      {/* Live ticker */}
      <LiveTicker />

      <Header user={user} />

      <main>
        {/* ── HERO ── */}
        <HeroSection />

        {/* ── LIVE WORLD STATS ── */}
        <section className="py-12 px-4" style={{ background: "#050d1a" }}>
          <div className="container mx-auto">
            <div ref={bottomRef} />
            <WorldStatsRow seen={true} />
          </div>
        </section>

        {/* ── TRACKING ── */}
        <TrackingSection />

        {/* ── IMAGE SLIDER ── */}
        <section className="py-4 px-4" style={{ background: "#050d1a" }}>
          <div className="container mx-auto">
            <ImageSlider />
          </div>
        </section>

        {/* ── FEATURES + PARTNER + HOW IT WORKS ── */}
        <FeatureCards />

        {/* ── TRUST + CTA ── */}
        <section
          ref={extraRef}
          className="py-20 px-4"
          style={{ background: "linear-gradient(180deg,#050d1a 0%,#061530 100%)" }}
        >
          <div className="container mx-auto">
            <TrustSection seen={extraSeen} />
            <CTABanner seen={extraSeen} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
