import { motion } from "framer-motion";
import { useMarketsContext } from "../../context/MarketsContext";

export function StatsBar() {
  const { markets } = useMarketsContext();

  const stats = [
    { value: markets.length > 0 ? markets.length.toString() : "0", label: "Markets on Chain" },
    { value: "$0",  label: "Fees Inside ER Sessions" },
    { value: "<1s", label: "Settlement Latency" },
  ];

  return (
    <section className="w-full border-y border-[rgba(255,255,255,0.06)]">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16">
        <div className="grid grid-cols-3 divide-x divide-[rgba(255,255,255,0.06)]">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="flex flex-col items-center justify-center py-12 px-4 text-center"
            >
              <span className="font-display italic text-4xl md:text-5xl lg:text-6xl
                text-[#f0f0f0] leading-none mb-3">
                {stat.value}
              </span>
              <span className="text-[10px] uppercase tracking-[0.25em]
                text-[rgba(240,240,240,0.35)]">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
