import { useState, useEffect } from "react";
import { Aptos, AptosConfig } from "@aptos-labs/ts-sdk";
import {
  NETWORK,
  ROUTER_ADDRESS,
  APTOS_FULLNODE_URL,
  PLAYER_MAPPING,
  type PlayerPosition,
} from "@/lib/constants";

const config = new AptosConfig({ network: NETWORK });
const aptos = new Aptos(config);

interface Holding {
  id: string;
  playerName: string;
  moduleName: string;
  team: string;
  position: PlayerPosition;
  price: number;
  shares: number;
  holdings: number;
  avatar: string;
  imageUrl: string;
}

interface TokenPairReserve {
  type: string;
  data: {
    block_timestamp_last: string;
    reserve_x: string;
    reserve_y: string;
  };
}

async function fetchTokenPairReserves(): Promise<TokenPairReserve[]> {
  try {
    const response = await fetch(`${APTOS_FULLNODE_URL}/accounts/${ROUTER_ADDRESS}/resources`);
    const data = await response.json();
    return data.filter((item: any) => item.type.includes("TokenPairReserve"));
  } catch (error) {
    console.error("Error fetching token pair reserves:", error);
    return [];
  }
}

function extractPlayerName(tokenType: string): string | null {
  const doubleColonMatches = tokenType.match(/::([A-Z][a-z]+[A-Z][a-z]*)::[A-Z][a-z]+[A-Z][a-z]*/g);
  if (doubleColonMatches) {
    for (const match of doubleColonMatches) {
      const parts = match.split("::");
      if (parts.length >= 3) {
        const playerName = parts[1];
        if (playerName !== "Boson" && playerName !== "TokenPairReserve" && playerName !== "swap") {
          return playerName;
        }
      }
    }
  }
  return null;
}

function calculateBosonValue(reserveX: string, reserveY: string, isBosonFirst: boolean): number {
  const reserveXNum = parseFloat(reserveX) / Math.pow(10, 8);
  const reserveYNum = parseFloat(reserveY) / Math.pow(10, 8);
  const bosonReserve = isBosonFirst ? reserveXNum : reserveYNum;
  const playerReserve = isBosonFirst ? reserveYNum : reserveXNum;
  return bosonReserve / playerReserve;
}

export function usePlayerHoldings(walletAddress?: string) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }

    const fetchHoldings = async () => {
      try {
        setLoading(true);
        setError(null);

        const tokenReserves = await fetchTokenPairReserves();

        const balances = await Promise.all(
          Object.values(PLAYER_MAPPING).map(async (playerInfo) => {
            const playerName = extractPlayerName(playerInfo.tokenType);
            if (!playerName) return null;

            const balance = await aptos.getAccountCoinAmount({
              accountAddress: walletAddress,
              coinType: playerInfo.tokenType as `${string}::${string}::${string}`,
            });

            return { playerName, balance: balance / 100000000 };
          })
        );

        const processedHoldings: Holding[] = tokenReserves
          .map((reserve, index) => {
            const playerName = extractPlayerName(reserve.type);
            if (!playerName) return null;

            // Only include players that are in the PLAYER_MAPPING (no fallback data)
            const playerInfo = PLAYER_MAPPING[playerName];
            if (!playerInfo) return null;
            
            const isBosonFirst = reserve.type.includes("Boson::Boson,") &&
              !reserve.type.includes(`, ${ROUTER_ADDRESS}::Boson::Boson`);

            const price = calculateBosonValue(
              reserve.data.reserve_x,
              reserve.data.reserve_y,
              isBosonFirst
            );

            const balance = balances.find((b) => b?.playerName === playerName)?.balance as number;

            if (!balance) return null;

            return {
              id: index.toString(),
              playerName: playerInfo.name,
              moduleName: playerName,
              team: playerInfo.team,
              position: playerInfo.position,
              price,
              shares: balance,
              holdings: balance * price,
              avatar: playerInfo.avatar,
              imageUrl: playerInfo.imageUrl || "",
            };
          })
          .filter(Boolean) as Holding[];

        setHoldings(processedHoldings);
      } catch (err) {
        setError("Failed to fetch player data");
        console.error("Error processing data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHoldings();
  }, [walletAddress]);

  return { holdings, loading, error };
}

