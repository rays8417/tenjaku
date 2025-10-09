import { useState, useEffect } from "react";
import { APTOS_FULLNODE_URL, ROUTER_ADDRESS, PLAYER_MAPPING } from "@/lib/constants";

interface TokenPair {
  token1: {
    name: string;
    type: string;
    displayName: string;
    team?: string;
    position?: string;
  };
  token2: {
    name: string;
    type: string;
    displayName: string;
  };
  reserves: {
    reserve_x: string;
    reserve_y: string;
    block_timestamp_last: string;
  };
}

export function useLiquidityPairs() {
  const [availableTokenPairs, setAvailableTokenPairs] = useState<TokenPair[]>([]);
  const [availableTokens, setAvailableTokens] = useState<Array<{
    name: string;
    type: string;
    displayName: string;
    team?: string;
    position?: string;
    avatar: string;
    imageUrl: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPairs = async () => {
      setLoading(true);
      try {
        const url = `${APTOS_FULLNODE_URL}/accounts/${ROUTER_ADDRESS}/resources`;
        
        const response = await fetch(url, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        const tokenPairReserves = data.filter((resource: any) => 
          resource.type.includes("TokenPairReserve")
        );

        const parsedPairs: TokenPair[] = [];
        const tokenSet = new Set<string>();

        for (const resource of tokenPairReserves) {
          try {
            const typeMatch = resource.type.match(/TokenPairReserve<([^,]+),\s*([^>]+)>/);
            if (!typeMatch) continue;

            const token1Type = typeMatch[1];
            const token2Type = typeMatch[2];
            const token1Name = token1Type.split("::").pop();
            const token2Name = token2Type.split("::").pop();

            // Skip if we couldn't parse token names or if neither is Boson
            if (!token1Name || !token2Name) continue;
            if (token1Name !== "Boson" && token2Name !== "Boson") continue;

            const isPlayerTokenFirst = token1Name !== "Boson";
            const playerTokenName = isPlayerTokenFirst ? token1Name : token2Name;
            const playerTokenType = isPlayerTokenFirst ? token1Type : token2Type;
            const bosonTokenType = isPlayerTokenFirst ? token2Type : token1Type;

            const playerInfo = PLAYER_MAPPING[playerTokenName];
            if (!playerInfo) continue;

            tokenSet.add(playerTokenName);

            const pair: TokenPair = {
              token1: {
                name: playerTokenName,
                type: playerTokenType,
                displayName: playerInfo.displayName,
                team: playerInfo.team,
                position: playerInfo.position,
              },
              token2: {
                name: "BOSON",
                type: bosonTokenType,
                displayName: "BOSON",
              },
              reserves: resource.data,
            };

            parsedPairs.push(pair);
          } catch (error) {
            console.error(`Failed to parse resource:`, error);
          }
        }

        const tokensList = Array.from(tokenSet).map(tokenName => {
          const playerInfo = PLAYER_MAPPING[tokenName];
          return {
            name: tokenName,
            type: `${ROUTER_ADDRESS}::${tokenName}::${tokenName}`,
            displayName: playerInfo.displayName,
            team: playerInfo.team,
            position: playerInfo.position,
            avatar: playerInfo.avatar,
            imageUrl: playerInfo.imageUrl,
          };
        });

        setAvailableTokenPairs(parsedPairs);
        setAvailableTokens(tokensList);
      } catch (error) {
        console.error("Failed to fetch liquidity pairs:", error);
        setAvailableTokenPairs([]);
        setAvailableTokens([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPairs();
  }, []);

  return { availableTokenPairs, availableTokens, loading };
}

