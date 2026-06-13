import { useEffect, useState } from "react";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { erConnection, baseConnection } from "../lib/connections";
import { PositionAccount, getPositionPDA, DELEGATION_PROGRAM } from "../lib/program";
import IDL from "../idl.json";

export function usePosition(marketPubkey: PublicKey | null, userPubkey: PublicKey | null) {
  const [position, setPosition] = useState<PositionAccount | null>(null);
  const [positionPubkey, setPositionPubkey] = useState<PublicKey | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!marketPubkey || !userPubkey) {
      setLoading(false);
      return;
    }
    const coder = new anchor.BorshAccountsCoder(IDL as anchor.Idl);
    const [posPda] = getPositionPDA(marketPubkey, userPubkey);
    setPositionPubkey(posPda);

    const check = async () => {
      try {
        const [erInfo, baseInfo] = await Promise.all([
          erConnection.getAccountInfo(posPda),
          baseConnection.getAccountInfo(posPda),
        ]);

        const info = erInfo || baseInfo;
        if (!info) {
          setIsRegistered(false);
          setPosition(null);
          setLoading(false);
          return;
        }

        // Account owned by delegation program = base-layer delegated account
        if (info.owner.equals(DELEGATION_PROGRAM)) {
          setIsRegistered(true);
          setPosition(null);
        } else {
          try {
            const decoded: PositionAccount = coder.decode("Position", info.data);
            setPosition(decoded);
          } catch {
            setPosition(null);
          }
          setIsRegistered(true);
        }
      } catch {
        setIsRegistered(false);
        setPosition(null);
      } finally {
        setLoading(false);
      }
    };

    check();
    const id = setInterval(check, 2_000);
    return () => clearInterval(id);
  }, [marketPubkey?.toBase58(), userPubkey?.toBase58()]);

  return { position, positionPubkey, isRegistered, loading };
}
