import { useState, useEffect } from "react";
import { APTOS_FULLNODE_URL, ROUTER_ADDRESS, DECIMAL_MULTIPLIER } from "@/lib/constants";

export function useTokenPairPrice(token1Type?: string, token2Type?: string) {
  const [tokenPrices, setTokenPrices] = useState({
    current: null as any,
    lastUpdated: null as Date | null,
  });
  const [loading, setLoading] = useState(true);

  const fetchPrice = async (tokenA: string, tokenB: string) => {
    setLoading(true);

    try {
      const resourceType = `${ROUTER_ADDRESS}::swap::TokenPairMetadata<${tokenA},%20${tokenB}>`;
      const url = `${APTOS_FULLNODE_URL}/accounts/${ROUTER_ADDRESS}/resource/${encodeURIComponent(resourceType)}`;

      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error(`API request failed: ${response.status}`);

      const data = await response.json();
      const priceInfo = {
        ...data,
        token1: tokenA.split("::").pop(),
        token2: tokenB.split("::").pop(),
        reserves: data?.data?.balance_x && data?.data?.balance_y
          ? {
              tokenX: data.data.balance_x.value,
              tokenY: data.data.balance_y.value,
              formattedX: Number(data.data.balance_x.value) / DECIMAL_MULTIPLIER,
              formattedY: Number(data.data.balance_y.value) / DECIMAL_MULTIPLIER,
              ratio: Number(data.data.balance_x.value) / Number(data.data.balance_y.value),
              bosonPriceUSD: 1,
              abhishekPriceUSD: ((Number(data.data.balance_y.value) / DECIMAL_MULTIPLIER) * 1) / (Number(data.data.balance_x.value) / DECIMAL_MULTIPLIER),
              abhishekPriceInBoson: Number(data.data.balance_y.value) / DECIMAL_MULTIPLIER / (Number(data.data.balance_x.value) / DECIMAL_MULTIPLIER),
              bosonPriceInAbhishek: Number(data.data.balance_x.value) / DECIMAL_MULTIPLIER / (Number(data.data.balance_y.value) / DECIMAL_MULTIPLIER),
            }
          : null,
      };

      setTokenPrices({ current: priceInfo, lastUpdated: new Date() });
      return priceInfo;
    } catch (error) {
      console.error("❌ Failed to fetch token pair price:", error);
      setTokenPrices({ current: null, lastUpdated: new Date() });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token1Type && token2Type) {
      fetchPrice(token1Type, token2Type);

      // Set up periodic price updates every 30 seconds
      const priceInterval = setInterval(() => {
        fetchPrice(token1Type, token2Type);
      }, 30000);

      return () => clearInterval(priceInterval);
    } else {
      setLoading(false);
    }
  }, [token1Type, token2Type]);

  return { tokenPrices, loading, refetchPrice: fetchPrice };
}

