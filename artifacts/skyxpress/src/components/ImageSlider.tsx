import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import heroLogisticsImage from "@/assets/hero-logistics.jpg";

const slides = [
  {
    image: "https://thunaolandjuvuhvbsds.supabase.co/storage/v1/object/public/File/pic1.png",
    title: "Global Air Cargo Network",
    subtitle: "Fast and reliable international shipping solutions",
    accent: "#34d399",
  },
  {
    image: "https://thunaolandjuvuhvbsds.supabase.co/storage/v1/object/public/File/image2.png",
    title: "Express Delivery Solutions",
    subtitle: "Door-to-door courier services worldwide",
    accent: "#60a5fa",
  },
  {
    image: "https://thunaolandjuvuhvbsds.supabase.co/storage/v1/object/public/File/image.jpg",
    title: "Secure Package Handling",
    subtitle: "Your packages are safe with our expert team",
    accent: "#f59e0b",
  },
  {
    image: "https://thunaolandjuvuhbsds.supabase.co/storage/v1/object/public/File/pic4.png",
    title: "Real-time Tracking",
    subtitle: "Monitor your shipments every step of the journey",
    accent: "#a78bfa",
  },
  {
    image: "https://thunaolandjuvuhvbsds.supabase.co/storage/v1/object/public/File/pic5.png",
    title: "International Commerce",
    subtitle: "Connecting businesses across continents seamlessly",
    accent: "#fb923c",
  },
  {
    image: "https://thunaolandjuvuhvbsds.supabase.co/storage/v1/object/public/File/image3.png",
    title: "Reliable Global Logistics",
    subtitle: "Courier and cargo services built around your business",
    accent: "#34d399",
  },
];

const INTERVAL = 5000;

const ImageSlider = () => {
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimers = () => {
    // Progress bar
    setProgress(0);
    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + 100 / (INTERVAL / 50), 100));
    }, 50);

    // Slide advance
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, INTERVAL);
  };

  useEffect(() => {
    startTimers();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  useEffect(() => {
    startTimers();
  }, [current]);

  const go = (idx: number) => {
    if (idx === current) return;
    setCurrent(idx);
  };

  const prev = () => go((current - 1 + slides.length) % slides.length);
  const next = () => go((current + 1) % slides.length);

  const slide = slides[current];

  return (
    <div className="relative w-full h-80 md:h-[480px] overflow-hidden group">

      {/* ── Slides (crossfade) ── */}
      {slides.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
        >
          <img
            src={s.image}
            alt={s.title}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              if (e.currentTarget.src !== heroLogisticsImage) {
                e.currentTarget.src = heroLogisticsImage;
              }
            }}
          />
          {/* Multi-layer gradient for text contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
        </div>
      ))}

      {/* ── Text content ── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-12 md:px-10 md:pb-14">
        <div
          key={current}
          className="animate-in fade-in slide-in-from-bottom-3 duration-500"
        >
          {/* Accent line */}
          <div
            className="h-0.5 w-12 rounded-full mb-3 transition-colors duration-500"
            style={{ background: slide.accent }}
          />
          <h3 className="text-xl md:text-3xl font-bold text-white leading-tight mb-1.5 drop-shadow-lg">
            {slide.title}
          </h3>
          <p className="text-sm md:text-base text-white/70 font-medium drop-shadow">
            {slide.subtitle}
          </p>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 h-0.5 bg-white/10">
        <div
          className="h-full transition-none rounded-full"
          style={{
            width: `${progress}%`,
            background: slide.accent,
            transition: progress === 0 ? "none" : undefined,
          }}
        />
      </div>

      {/* ── Prev / Next arrows ── */}
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full flex items-center justify-center
          bg-white/10 backdrop-blur-sm border border-white/15 text-white
          hover:bg-white/20 hover:border-white/30 transition-all duration-200
          opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0"
        aria-label="Previous"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full flex items-center justify-center
          bg-white/10 backdrop-blur-sm border border-white/15 text-white
          hover:bg-white/20 hover:border-white/30 transition-all duration-200
          opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
        aria-label="Next"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* ── Dot indicators ── */}
      <div className="absolute bottom-4 right-5 z-20 flex items-center gap-1.5">
        {slides.map((s, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            className="transition-all duration-300 rounded-full"
            style={{
              width: i === current ? 20 : 6,
              height: 6,
              background: i === current ? s.accent : "rgba(255,255,255,0.35)",
            }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* ── Slide counter ── */}
      <div className="absolute top-4 right-4 z-20 bg-black/30 backdrop-blur-sm border border-white/10 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white/60">
        {current + 1} / {slides.length}
      </div>
    </div>
  );
};

export default ImageSlider;
