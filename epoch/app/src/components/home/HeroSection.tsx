import { useEffect, useRef } from "react";
import { Sparkles, ArrowUpRight, Zap, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import gsap from "gsap";
import { LiveDot } from "../ui/LiveDot";
import { AccentButton } from "../ui/AccentButton";
import { useOraclePrice } from "../../hooks/useOraclePrice";
import { useMarketsContext } from "../../context/MarketsContext";

const PARTICLES = [
  { top: "12%",  left: "8%",  delay: 0,   dur: 6 },
  { top: "25%",  left: "15%", delay: 1.2, dur: 7.5 },
  { top: "60%",  left: "5%",  delay: 0.5, dur: 5.8 },
  { top: "75%",  left: "20%", delay: 2,   dur: 8 },
  { top: "15%",  left: "80%", delay: 0.8, dur: 6.5 },
  { top: "35%",  left: "90%", delay: 1.5, dur: 7 },
  { top: "65%",  left: "85%", delay: 0.3, dur: 9 },
  { top: "80%",  left: "75%", delay: 1.8, dur: 6.2 },
  { top: "45%",  left: "3%",  delay: 2.5, dur: 7.8 },
  { top: "10%",  left: "50%", delay: 0.7, dur: 5.5 },
  { top: "88%",  left: "45%", delay: 1.1, dur: 8.5 },
  { top: "50%",  left: "95%", delay: 3,   dur: 6.8 },
];

export function HeroSection() {
  const { price, direction, loading: priceLoading, lastUpdated } = useOraclePrice("SOL/USD");
  const { markets, loading: marketsLoading } = useMarketsContext();

  const eyebrowRef = useRef<HTMLDivElement>(null);
  const h1Ref      = useRef<HTMLDivElement>(null);
  const subtextRef = useRef<HTMLParagraphElement>(null);
  const ctaRef     = useRef<HTMLDivElement>(null);
  const animRan    = useRef(false);

  useEffect(() => {
    if (animRan.current) return;
    animRan.current = true;

    // setTimeout ensures DOM is fully painted before GSAP targets refs
    const timer = setTimeout(() => {
      if (!eyebrowRef.current || !h1Ref.current) return;

      gsap.set(eyebrowRef.current, { y: 24 });
      gsap.set(h1Ref.current,      { y: 48 });
      gsap.set(subtextRef.current, { y: 0, filter: "blur(8px)" });
      gsap.set(ctaRef.current,     { y: 16 });

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.to(eyebrowRef.current,  { opacity: 1, y: 0, duration: 0.9, delay: 0.1 })
        .to(h1Ref.current,       { opacity: 1, y: 0, duration: 1.1 }, "-=0.6")
        .to(subtextRef.current,  { opacity: 1, filter: "blur(0px)", duration: 0.9 }, "-=0.7")
        .to(ctaRef.current,      { opacity: 1, y: 0, duration: 0.7 }, "-=0.5")
        .fromTo(".hero-float-card",
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.12 },
          "-=0.4"
        );
    }, 100);

    return () => { clearTimeout(timer); animRan.current = false; };
  }, []);

  // Fallback: if GSAP fails or is blocked, force content visible after 2s
  useEffect(() => {
    const fallback = setTimeout(() => {
      document.querySelectorAll(".gsap-hidden").forEach(el => {
        (el as HTMLElement).style.opacity = "1";
        (el as HTMLElement).style.transform = "none";
        (el as HTMLElement).style.filter = "none";
      });
    }, 2000);
    return () => clearTimeout(fallback);
  }, []);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const secondsAgo = lastUpdated ? Math.floor((Date.now() - lastUpdated) / 1000) : null;

  return (
    <section className="relative overflow-hidden">
      {/* ── Background layers ── */}
      <div className="absolute inset-0 bg-[#08080f]" />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(0,255,136,0.05) 0%, transparent 70%)" }}
      />
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), " +
            "linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* Bottom fade-out */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-[#08080f] pointer-events-none z-10" />

      {/* ── Particles ── */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            top: p.top, left: p.left,
            width: 3, height: 3,
            borderRadius: "50%",
            background: "#00ff88",
            opacity: 0.35,
            animation: `float-particle ${p.dur}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}

      {/* ── Content — full viewport height, flex-centered ── */}
      <div className="relative z-20 flex flex-col items-center justify-center text-center px-6 w-full min-h-screen">
        {/* Eyebrow */}
        <div ref={eyebrowRef} className="gsap-hidden inline-flex items-center gap-2 px-4 py-2 rounded-full
          bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.18)]
          backdrop-blur-md mb-8">
          <Sparkles className="w-4 h-4 text-[#00ff88] flex-shrink-0" />
          <span className="text-sm text-[#00ff88]">Real-time prediction markets · MagicBlock ERs</span>
        </div>

        {/* Heading */}
        <div ref={h1Ref} className="gsap-hidden mb-6 max-w-5xl">
          <div className="font-display italic text-5xl sm:text-7xl md:text-8xl lg:text-[96px]
            leading-[0.92] tracking-tight text-[#f0f0f0]">
            Markets that
          </div>
          <div className="font-display italic text-5xl sm:text-7xl md:text-8xl lg:text-[96px]
            leading-[0.92] tracking-tight text-[#00ff88]">
            live in real time.
          </div>
        </div>

        {/* Subtext */}
        <p ref={subtextRef}
          className="gsap-hidden text-base md:text-lg text-[rgba(240,240,240,0.5)]
            max-w-xl mx-auto leading-relaxed mb-10">
          Each market is an Ephemeral Rollup session. Zero fees inside the ER.
          Sub-second position updates. Atomic settlement on Solana mainnet.
        </p>

        {/* CTA */}
        <div ref={ctaRef} className="gsap-hidden flex items-center gap-4 justify-center flex-wrap">
          <AccentButton variant="primary" onClick={() => scrollTo("markets")}>
            <span className="flex items-center gap-2">
              Enter Markets <ArrowUpRight className="w-4 h-4" />
            </span>
          </AccentButton>
          <AccentButton variant="secondary" onClick={() => scrollTo("how-it-works")}>
            How It Works
          </AccentButton>
        </div>
      </div>

      {/* ── Float card A — bottom left ── */}
      <div className="hero-float-card absolute bottom-0 left-0 z-20 glass-strong rounded-[2rem] p-5 min-w-[160px]"
        style={{ opacity: 0 }}>
        {marketsLoading ? (
          <div className="w-12 h-8 bg-[rgba(255,255,255,0.06)] rounded-lg animate-pulse mb-1" />
        ) : (
          <span className="font-display italic text-4xl text-[#f0f0f0]">{markets.length}</span>
        )}
        <span className="text-[10px] uppercase tracking-wider text-[rgba(240,240,240,0.45)] mt-1 block">
          Live Markets
        </span>
        <div className="flex items-center gap-1.5 mt-3">
          <LiveDot color="green" />
          <span className="text-[10px] uppercase tracking-wider text-[#00ff88]">On Ephemeral Rollup</span>
        </div>
      </div>

      {/* ── Float card B — bottom right, faux cutout ── */}
      <div className="hero-float-card absolute bottom-0 right-0 z-20
        p-4 pt-6 pl-10 md:p-6 md:pt-8 md:pl-14
        bg-[#08080f] rounded-tl-[3rem] flex items-center gap-4"
        style={{ opacity: 0 }}>
        {/* corner masks */}
        <div className="absolute -top-[3.5rem] right-0 w-[3.5rem] h-[3.5rem] pointer-events-none">
          <svg width="100%" height="100%" viewBox="0 0 56 56" fill="none">
            <path d="M56 56V0C56 30.9279 30.9279 56 0 56H56Z" fill="#08080f" />
          </svg>
        </div>
        <div className="absolute bottom-0 -left-[3.5rem] w-[3.5rem] h-[3.5rem] pointer-events-none">
          <svg width="100%" height="100%" viewBox="0 0 56 56" fill="none">
            <path d="M56 56H0C30.9279 56 56 30.9279 56 0V56Z" fill="#08080f" />
          </svg>
        </div>
        <div className="w-12 h-12 rounded-full bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.15)]
          flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-[#00ff88]" />
        </div>
        <div>
          <span className="text-base md:text-lg text-[#f0f0f0] block">MagicBlock Powered</span>
          <span className="text-xs text-[rgba(240,240,240,0.45)] flex items-center gap-1 mt-0.5">
            Ephemeral Rollups <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* ── Float card C — right side oracle price ── */}
      <div className="hero-float-card absolute right-6 top-[38%] z-20 glass rounded-2xl p-4 w-44 hidden lg:block"
        style={{ opacity: 0 }}>
        <div className="text-[10px] uppercase tracking-wider text-[rgba(240,240,240,0.45)] mb-2">
          SOL/USD Live
        </div>
        {priceLoading ? (
          <div className="w-20 h-7 bg-[rgba(255,255,255,0.06)] rounded-lg animate-pulse" />
        ) : (
          <div className={`font-display italic text-2xl ${direction === "up" ? "text-[#00ff88]" : "text-[#ff4466]"}`}>
            ${price?.toFixed(2) ?? "—"}
          </div>
        )}
        <div className="flex items-center gap-1 mt-1">
          {direction === "up"
            ? <TrendingUp className="w-3 h-3 text-[#00ff88]" />
            : <TrendingDown className="w-3 h-3 text-[#ff4466]" />}
          <span className="text-[10px] text-[rgba(240,240,240,0.45)]">
            {secondsAgo !== null ? `${secondsAgo}s ago` : "—"}
          </span>
        </div>
      </div>

      {/* ── Scroll indicator ── */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.25em] text-[rgba(240,240,240,0.35)]">Scroll</span>
        <div className="w-px h-10 bg-[rgba(255,255,255,0.08)] relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-4 bg-[#00ff88] animate-scroll-line" />
        </div>
      </div>
    </section>
  );
}
