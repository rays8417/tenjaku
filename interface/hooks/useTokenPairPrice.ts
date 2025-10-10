import { useState, useEffect } from "react";
import { APTOS_FULLNODE_URL, ROUTER_ADDRESS, DECIMAL_MULTIPLIER, BOSON_TOKEN } from "@/lib/constants";

export function useTokenPairPrice(token1Type?: string, token2Type?: string) {
  const [tokenPrices, setTokenPrices] = useState({
    current: null as any,
    lastUpdated: null as Date | null,
  });
  const [loading, setLoading] = useState(true);

  const fetchPrice = async (tokenA: string, tokenB: string) => {
    setLoading(true);

    try {
      // Helper to try fetching a resource for a given ordering
      const tryFetch = async (firstType: string, secondType: string) => {
        const resourceType = `${ROUTER_ADDRESS}::swap::TokenPairMetadata<${firstType}, ${secondType}>`;
        const url = `${APTOS_FULLNODE_URL}/accounts/${ROUTER_ADDRESS}/resource/${encodeURIComponent(resourceType)}`;
        const resp = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
        if (!resp.ok) {
          return null;
        }
        const json = await resp.json();
        return { json, usedFirst: firstType, usedSecond: secondType };
      };

      // Try Player,BOSON order first; if not found, try BOSON,Player
      let fetched = await tryFetch(tokenA, tokenB);
      if (!fetched) {
        fetched = await tryFetch(tokenB, tokenA);
      }
      if (!fetched) throw new Error("TokenPairMetadata not found in either order");

      const data = fetched.json;

      // Normalize reserves so that playerReserves always refer to the non-BOSON token
      const firstIsBoson = fetched.usedFirst === BOSON_TOKEN.type || fetched.usedFirst.endsWith("::Boson::Boson");
      const rawX = Number(data?.data?.balance_x?.value || 0);
      const rawY = Number(data?.data?.balance_y?.value || 0);

      const bosonRaw = firstIsBoson ? rawX : rawY;
      const playerRaw = firstIsBoson ? rawY : rawX;

      const boson = bosonRaw / DECIMAL_MULTIPLIER;
      const player = playerRaw / DECIMAL_MULTIPLIER;

      const priceInfo = {
        ...data,
        token1: fetched.usedFirst.split("::").pop(),
        token2: fetched.usedSecond.split("::").pop(),
        reserves: rawX && rawY
          ? {
              // Raw and formatted reserves (normalized)
              bosonRaw,
              playerRaw,
              bosonFormatted: boson,
              playerFormatted: player,
              // Exchange rates (normalized)
              playerPriceInBoson: player > 0 ? boson / player : 0, // BOSON per 1 PLAYER
              bosonPriceInPlayer: boson > 0 ? player / boson : 0, // PLAYER per 1 BOSON
              // USD pricing assuming BOSON = $1
              bosonPriceUSD: 1,
              playerPriceUSD: player > 0 ? boson / player : 0,
            }
          : null,
      } as any;

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

