import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const map: Record<string, string> = {
      "Markets":      "markets",
      "How It Works": "how-it-works",
      "Docs":         "https://magicblock.gg",
    };
    const target = map[id];
    if (!target) return;
    if (target.startsWith("http")) { window.open(target, "_blank"); return; }
    document.getElementById(target)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${scrolled
          ? "py-3 glass border-b border-[rgba(255,255,255,0.06)]"
          : "py-5 bg-transparent"
        }`}
      style={{ borderRadius: 0 }}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => navigate("/")}
          className="flex items-baseline gap-1 cursor-pointer"
        >
          <span className="text-lg tracking-tight text-[#f0f0f0] font-medium select-none">EPOCH</span>
          <sup className="text-[10px] text-[#00ff88] leading-none">β</sup>
        </button>

        {/* Center links — desktop only */}
        <ul className="hidden md:flex items-center gap-8 text-sm text-[rgba(240,240,240,0.5)]">
          {["Markets", "How It Works", "Docs"].map(link => (
            <li
              key={link}
              className="cursor-pointer hover:text-[#f0f0f0] transition-colors duration-200"
              onClick={() => scrollToSection(link)}
            >
              {link}
            </li>
          ))}
        </ul>

        {/* Wallet button */}
        <WalletMultiButton
          style={{
            background: "rgba(0,255,136,0.08)",
            border: "1px solid rgba(0,255,136,0.22)",
            borderRadius: "9999px",
            color: "#00ff88",
            fontSize: "13px",
            height: "38px",
            padding: "0 18px",
            lineHeight: 1,
          }}
        />
      </div>
    </nav>
  );
}
