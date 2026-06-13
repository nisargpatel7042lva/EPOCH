import { useMemo, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";
import { LoadingScreen } from "./components/layout/LoadingScreen";
import { Navbar } from "./components/layout/Navbar";
import { HomePage } from "./pages/HomePage";
import { MarketPage } from "./pages/MarketPage";
import { MarketsProvider } from "./context/MarketsContext";
import "./index.css";

const ENDPOINT = import.meta.env.VITE_PROVIDER_ENDPOINT || "https://api.devnet.solana.com";

export default function App() {
  const [loading, setLoading] = useState(true);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {loading && <LoadingScreen onComplete={() => setLoading(false)} />}
          {!loading && (
            <BrowserRouter>
              <MarketsProvider>
                <Navbar />
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/market/:marketId" element={<MarketPage />} />
                </Routes>
              </MarketsProvider>
            </BrowserRouter>
          )}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
