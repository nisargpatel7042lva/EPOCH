import { HeroSection } from "../components/home/HeroSection";
import { StatsBar } from "../components/home/StatsBar";
import { LiveMarketsGrid } from "../components/home/LiveMarketsGrid";
import { HowItWorksSection } from "../components/home/HowItWorksSection";
import { MarqueeFooter } from "../components/home/MarqueeFooter";

export function HomePage() {
  return (
    <main>
      <HeroSection />
      <StatsBar />
      <LiveMarketsGrid />
      <HowItWorksSection />
      <MarqueeFooter />
    </main>
  );
}
