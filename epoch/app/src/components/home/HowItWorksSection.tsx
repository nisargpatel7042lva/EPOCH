import { motion } from "framer-motion";
import { Plus, ArrowLeftRight, Zap } from "lucide-react";

const STEPS = [
  {
    num: "01",
    icon: Plus,
    title: "Spawn an ER Session",
    body: "Creating a market delegates a Solana PDA to MagicBlock's Ephemeral Rollup. The ER session lifespan IS the market lifespan.",
  },
  {
    num: "02",
    icon: ArrowLeftRight,
    title: "Trade at Zero Cost",
    body: "Take YES or NO positions inside the live ER session. Adjust freely throughout the window. Every update is instant and free.",
  },
  {
    num: "03",
    icon: Zap,
    title: "Atomic Settlement",
    body: "When Pyth oracle confirms the outcome, a Magic Action fires settlement atomically back to Solana mainnet. Winners withdraw instantly.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="w-full py-24">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="mb-14"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-6 h-px bg-[rgba(255,255,255,0.2)]" />
            <span className="text-xs uppercase tracking-[0.3em] text-[rgba(240,240,240,0.4)]">Process</span>
          </div>
          <h2 className="font-display italic text-4xl md:text-5xl lg:text-6xl
            text-[#f0f0f0] leading-tight">
            How <em>EPOCH</em> works
          </h2>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="glass p-8 rounded-[1.5rem] relative overflow-hidden
                  hover:border-[rgba(255,255,255,0.14)] transition-all duration-300 group"
              >
                {/* Background step number */}
                <span className="absolute top-4 right-6 font-display italic
                  text-8xl text-[rgba(255,255,255,0.04)] leading-none select-none
                  group-hover:text-[rgba(255,255,255,0.06)] transition-colors">
                  {step.num}
                </span>

                {/* Icon in box */}
                <div className="w-10 h-10 rounded-xl bg-[rgba(0,255,136,0.08)]
                  border border-[rgba(0,255,136,0.15)] flex items-center justify-center mb-6 relative z-10">
                  <Icon className="w-5 h-5 text-[#00ff88]" />
                </div>

                <h3 className="text-lg font-medium text-[#f0f0f0] mb-3 relative z-10">
                  {step.title}
                </h3>
                <p className="text-sm text-[rgba(240,240,240,0.45)] leading-relaxed relative z-10">
                  {step.body}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
