import { useState, useEffect } from "react";
import { Aptos, AptosConfig } from "@aptos-labs/ts-sdk";
import { NETWORK, BOSON_TOKEN, DECIMAL_MULTIPLIER, PLAYER_MAPPING } from "@/lib/constants";

const config = new AptosConfig({ network: NETWORK });
const aptos = new Aptos(config);

export function useTokenBalances(walletAddress?: string, availableTokens: any[] = []) {
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!walletAddress || availableTokens.length === 0) {
      setLoading(false);
      return;
    }

    const fetchBalances = async () => {
      setLoading(true);
      try {
        const newBalances: Record<string, number> = {};

        // Fetch BOSON balance
        try {
          const bosonBalance = await aptos.getAccountCoinAmount({
            accountAddress: walletAddress,
            coinType: BOSON_TOKEN.type as `${string}::${string}::${string}`,
          });
          newBalances.boson = bosonBalance / DECIMAL_MULTIPLIER;
        } catch (error) {
          newBalances.boson = 0;
        }

        // Fetch balances for all available player tokens
        for (const token of availableTokens) {
          try {
            const balance = await aptos.getAccountCoinAmount({
              accountAddress: walletAddress,
              coinType: token.type as `${string}::${string}::${string}`,
            });
            newBalances[token.name.toLowerCase()] = balance / DECIMAL_MULTIPLIER;
          } catch (error) {
            newBalances[token.name.toLowerCase()] = 0;
          }
        }

        setBalances(newBalances);
      } catch (error) {
        console.error("Failed to fetch balances:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, [walletAddress, availableTokens]);

  return { balances, loading, refetch: () => {} };
}

