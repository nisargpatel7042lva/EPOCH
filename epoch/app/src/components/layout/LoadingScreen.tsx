import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LiveDot } from "../ui/LiveDot";

const WORDS = ["Predict.", "Stake.", "Settle.", "Win."];

interface Props {
  onComplete: () => void;
}

export function LoadingScreen({ onComplete }: Props) {
  const [count, setCount] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const startRef = useRef<number | null>(null);
  const rafRef  = useRef<number>(0);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const DURATION = 2500;
    doneRef.current = false;

    const tick = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const pct = Math.min(100, (elapsed / DURATION) * 100);
      setCount(pct);

      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!doneRef.current) {
        doneRef.current = true;
        setTimeout(() => {
          setVisible(false);
          setTimeout(() => onCompleteRef.current(), 500);
        }, 350);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      startRef.current = null;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setWordIndex(i => (i + 1) % WORDS.length), 625);
    return () => clearInterval(id);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col bg-[#08080f]"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Top left */}
          <motion.div
            className="absolute top-8 left-8 text-xs uppercase tracking-[0.3em] text-[rgba(240,240,240,0.4)]"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            EPOCH
          </motion.div>

          {/* Top right */}
          <div className="absolute top-8 right-8 flex items-center gap-2">
            <LiveDot color="green" />
            <span className="text-xs uppercase tracking-[0.3em] text-[#00ff88]">DEVNET</span>
          </div>

          {/* Center cycling word */}
          <div className="flex-1 flex items-center justify-center pointer-events-none">
            <AnimatePresence mode="wait">
              <motion.span
                key={wordIndex}
                className="font-display italic text-6xl md:text-8xl text-[rgba(240,240,240,0.75)] select-none"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.32, ease: "easeOut" }}
              >
                {WORDS[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Bottom right counter */}
          <motion.div
            className="absolute bottom-10 right-8 font-display italic text-8xl md:text-9xl tabular-nums text-[#f0f0f0] select-none leading-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {String(Math.floor(count)).padStart(3, "0")}
          </motion.div>

          {/* Bottom progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[rgba(255,255,255,0.06)]">
            <motion.div
              className="h-full accent-gradient"
              style={{
                scaleX: count / 100,
                transformOrigin: "left",
                boxShadow: "0 0 10px rgba(0,255,136,0.5)",
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
