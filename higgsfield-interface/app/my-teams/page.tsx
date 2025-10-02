"use client";

import { useWallet } from "@/contexts/WalletContext";
import { useState, useEffect } from "react";

import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

// ===== CONFIGURATION =====
// Initialize Aptos client for devnet
const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

interface TokenPairReserve {
  type: string;
  data: {
    block_timestamp_last: string;
    reserve_x: string;
    reserve_y: string;
  };
}

interface Holding {
  id: string;
  playerName: string;
  team: string;
  position: "BAT" | "BWL" | "AR" | "WK"; // Batsman, Bowler, All-rounder, Wicket-keeper
  price: number;
  change1h: number;
  shares: number;
  holdings: number;
  avatar: string;
}

// TODO: Replace these placeholders with actual devnet deployed addresses
const ROUTER_ADDRESS =
  "0xaf230e3024e92da6a3a15f5a6a3f201c886891268717bf8a21157bb73a1c027b"; // PLACEHOLDER - Replace with the actual address where higgs::router module is deployed on devnet

const BOSON_TOKEN = {
  name: "BOSON",
  type: `${ROUTER_ADDRESS}::Boson::Boson`, // PLACEHOLDER - Replace with actual BOSON token type on devnet
};

const KOHLI_TOKEN = {
  name: "KOHLI",
  type: `${ROUTER_ADDRESS}::ViratKohli::ViratKohli`, // PLACEHOLDER - Replace with actual KOHLI token type on devnet
};

const ABHISHEK_SHARMA_TOKEN = {
  name: "ABHISHEK",
  type: `${ROUTER_ADDRESS}::AbhishekSharma::AbhishekSharma`,
};

// Player mapping from token names to display names and teams
const PLAYER_MAPPING: Record<
  string,
  {
    name: string;
    team: string;
    position: "BAT" | "BWL" | "AR" | "WK";
    avatar: string;
    tokenType: string;
  }
> = {
  BenStokes: {
    name: "Ben Stokes",
    team: "ENG",
    position: "AR",
    avatar: "BS",
    tokenType: `${ROUTER_ADDRESS}::BenStokes::BenStokes`,
  },
  TravisHead: {
    name: "Travis Head",
    team: "AUS",
    position: "BAT",
    avatar: "TH",
    tokenType: `${ROUTER_ADDRESS}::TravisHead::TravisHead`,
  },
  ViratKohli: {
    name: "Virat Kohli",
    team: "IND",
    position: "BAT",
    avatar: "VK",
    tokenType: `${ROUTER_ADDRESS}::ViratKohli::ViratKohli`,
  },
  GlenMaxwell: {
    name: "Glenn Maxwell",
    team: "AUS",
    position: "AR",
    avatar: "GM",
    tokenType: `${ROUTER_ADDRESS}::GlenMaxwell::GlenMaxwell`,
  },
  ShubhamDube: {
    name: "Shubham Dube",
    team: "IND",
    position: "AR",
    avatar: "SD",
    tokenType: `${ROUTER_ADDRESS}::ShubhamDube::ShubhamDube`,
  },
  HardikPandya: {
    name: "Hardik Pandya",
    team: "IND",
    position: "AR",
    avatar: "HP",
    tokenType: `${ROUTER_ADDRESS}::HardikPandya::HardikPandya`,
  },
  ShubhmanGill: {
    name: "Shubman Gill",
    team: "IND",
    position: "BAT",
    avatar: "SG",
    tokenType: `${ROUTER_ADDRESS}::ShubhmanGill::ShubhmanGill`,
  },
  KaneWilliamson: {
    name: "Kane Williamson",
    team: "NZ",
    position: "BAT",
    avatar: "KW",
    tokenType: `${ROUTER_ADDRESS}::KaneWilliamson::KaneWilliamson`,
  },
  AbhishekSharma: {
    name: "Abhishek Sharma",
    team: "IND",
    position: "BAT",
    avatar: "AS",
    tokenType: `${ROUTER_ADDRESS}::AbhishekSharma::AbhishekSharma`,
  },
  JaspreetBumhrah: {
    name: "Jasprit Bumrah",
    team: "IND",
    position: "BWL",
    avatar: "JB",
    tokenType: `${ROUTER_ADDRESS}::JaspreetBumhrah::JaspreetBumhrah`,
  },
  SuryakumarYadav: {
    name: "Suryakumar Yadav",
    team: "IND",
    position: "BAT",
    avatar: "SY",
    tokenType: `${ROUTER_ADDRESS}::SuryakumarYadav::SuryakumarYadav`,
  },
};

// Function to create a default player entry for unknown players
function createDefaultPlayer(playerName: string): {
  name: string;
  team: string;
  position: "BAT" | "BWL" | "AR" | "WK";
  avatar: string;
} {
  // Extract initials for avatar
  const words = playerName.match(/[A-Z][a-z]+/g) || [playerName];
  const avatar = words
    .map((word) => word[0])
    .join("")
    .substring(0, 2);

  return {
    name: playerName.replace(/([A-Z])/g, " $1").trim(), // Add spaces before capital letters
    team: "TBD", // To be determined
    position: "BAT", // Default to batsman
    avatar: avatar,
  };
}

// API function to fetch token pair reserves
async function fetchTokenPairReserves(
  address: string
): Promise<TokenPairReserve[]> {
  try {
    const response = await fetch(
      `https://api.testnet.aptoslabs.com/v1/accounts/0xaf230e3024e92da6a3a15f5a6a3f201c886891268717bf8a21157bb73a1c027b/resources`
    );
    const data = await response.json();

    console.log("Token pair reserves:", data);

    return data.filter((item: any) => item.type.includes("TokenPairReserve"));
  } catch (error) {
    console.error("Error fetching token pair reserves:", error);
    return [];
  }
}

// Function to extract player name from token type
function extractPlayerName(tokenType: string): string | null {
  console.log("Extracting from token type:", tokenType);

  // Look for player names in the token type string
  // Examples from the API:
  // ...::BenStokes::BenStokes, 0x...::Boson::Boson>
  // ...::Boson::Boson, 0x...::ViratKohli::ViratKohli>

  // Method 1: Look for patterns like ::PlayerName::PlayerName
  const doubleColonMatches = tokenType.match(
    /::([A-Z][a-z]+[A-Z][a-z]*)::[A-Z][a-z]+[A-Z][a-z]*/g
  );
  if (doubleColonMatches) {
    for (const match of doubleColonMatches) {
      const parts = match.split("::");
      if (parts.length >= 3) {
        const playerName = parts[1];
        if (
          playerName !== "Boson" &&
          playerName !== "TokenPairReserve" &&
          playerName !== "swap"
        ) {
          console.log("Found player name (method 1):", playerName);
          return playerName;
        }
      }
    }
  }

  // Method 2: Split by :: and look for patterns like PlayerName::PlayerName
  const parts = tokenType.split("::");
  for (let i = 0; i < parts.length - 1; i++) {
    const current = parts[i];
    const next = parts[i + 1];

    // Look for pattern where current and next are the same (PlayerName::PlayerName)
    if (
      current === next &&
      current !== "Boson" &&
      current !== "TokenPairReserve" &&
      current !== "swap" &&
      current.length > 2 &&
      /^[A-Z][a-z]+[A-Z][a-z]*$/.test(current)
    ) {
      console.log("Found player name (method 2):", current);
      return current;
    }
  }

  // Method 3: Look for any capitalized word that's not Boson
  const capitalizedMatches = tokenType.match(/::([A-Z][a-z]+[A-Z][a-z]*)::/g);
  if (capitalizedMatches) {
    for (const match of capitalizedMatches) {
      const playerName = match.replace(/::/g, "");
      if (
        playerName !== "Boson" &&
        playerName !== "TokenPairReserve" &&
        playerName !== "swap"
      ) {
        console.log("Found player name (method 3):", playerName);
        return playerName;
      }
    }
  }

  console.log("No player name found");
  return null;
}

// Function to calculate BOSON equivalent value
function calculateBosonValue(
  reserveX: string,
  reserveY: string,
  isBosonFirst: boolean
): number {
  const reserveXNum = parseFloat(reserveX) / Math.pow(10, 8); // Convert from 8 decimals
  const reserveYNum = parseFloat(reserveY) / Math.pow(10, 8); // Convert from 8 decimals

  // If Boson is first (reserve_x), then reserve_y is the player token
  // If Boson is second (reserve_y), then reserve_x is the player token
  const bosonReserve = isBosonFirst ? reserveXNum : reserveYNum;
  const playerReserve = isBosonFirst ? reserveYNum : reserveXNum;

  // Since 1 Boson = $1, the total value of Boson reserve is the dollar value
  const bosonValue = bosonReserve; // $1 per Boson

  // The player token reserve should have the same total value
  // So the price per player token = bosonValue / playerReserve
  const playerTokenPrice = bosonValue / playerReserve;

  return playerTokenPrice;
}

export default function MyTeamsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { account } = useWallet();

  const address = account?.address;

  // Fetch real data on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!address) return;
      try {
        setLoading(true);
        const tokenReserves = await fetchTokenPairReserves(address);

        console.log("Token reserves:", tokenReserves);

        const balances = await Promise.all(
          Object.values(PLAYER_MAPPING).map(async (playerInfo) => {
            const playerName = extractPlayerName(playerInfo.tokenType);

            if (!playerName) {
              return null;
            }

            const balance = await aptos.getAccountCoinAmount({
              accountAddress: address,
              coinType:
                playerInfo.tokenType as `${string}::${string}::${string}`,
            });

            return {
              playerName,
              balance: balance / 100000000,
            };
          })
        );

        const processedHoldings: Holding[] = tokenReserves
          .map((reserve, index) => {
            const playerName = extractPlayerName(reserve.type);

            if (!playerName) {
              return null;
            }

            const playerInfo =
              PLAYER_MAPPING[playerName] || createDefaultPlayer(playerName);
            console.log("Using player info:", playerInfo);

            // Check if Boson is the first token in the pair
            const isBosonFirst =
              reserve.type.includes("Boson::Boson,") &&
              !reserve.type.includes(
                ", 0xaf230e3024e92da6a3a15f5a6a3f201c886891268717bf8a21157bb73a1c027b::Boson::Boson"
              );

            const price = calculateBosonValue(
              reserve.data.reserve_x,
              reserve.data.reserve_y,
              isBosonFirst
            );

            // Calculate real shares based on token reserves
            // Shares represent the percentage of total token supply in the liquidity pool
            const totalTokenSupply = 20000000; // 20M tokens as per schema
            const reserveXNum =
              parseFloat(reserve.data.reserve_x) / Math.pow(10, 8); // Convert from 8 decimals
            const reserveYNum =
              parseFloat(reserve.data.reserve_y) / Math.pow(10, 8); // Convert from 8 decimals
            const playerTokenReserve = isBosonFirst ? reserveYNum : reserveXNum;
            const shares = (playerTokenReserve / totalTokenSupply) * 100; // Percentage of total supply

            // Mock data for change (as requested)
            const change1h = (Math.random() - 0.5) * 4; // Random between -2% to +2%

            const balance = balances.find(
              (balance) => balance?.playerName === playerName
            )?.balance as number;

            if (!balance) {
              return null;
            }

            return {
              id: index.toString(),
              playerName: playerInfo.name,
              team: playerInfo.team,
              position: playerInfo.position,
              price: price,
              change1h: change1h,
              shares: balance,
              holdings: balance * price, // Calculate holdings as actual token amount * price
              avatar: playerInfo.avatar,
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

    fetchData();
  }, [address]);

  const filteredHoldings = holdings.filter(
    (holding) =>
      holding.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      holding.team.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Chart data points for the line graph
  const chartPoints = [
    { x: 0, y: 40 },
    { x: 20, y: 45 },
    { x: 40, y: 42 },
    { x: 60, y: 48 },
    { x: 80, y: 46 },
    { x: 100, y: 52 },
    { x: 120, y: 50 },
    { x: 140, y: 55 },
    { x: 160, y: 58 },
    { x: 180, y: 62 },
    { x: 200, y: 65 },
  ];

  const pathData = chartPoints
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
    )
    .join(" ");

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-black">My Teams</h1>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
              <p className="text-gray-600">Loading player data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-black">My Teams</h1>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-black">My Teams</h1>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="Search players or teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Holdings Table */}
        <div className="mt-8 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="col-span-4 text-xs uppercase tracking-wider text-gray-500 font-medium">
              PLAYER
            </div>
            <div className="col-span-2 text-xs uppercase tracking-wider text-gray-500 font-medium text-right">
              PRICE (BOSON)
            </div>
            <div className="col-span-2 text-xs uppercase tracking-wider text-gray-500 font-medium text-right">
              1H
            </div>
            <div className="col-span-2 text-xs uppercase tracking-wider text-gray-500 font-medium text-right">
              SHARES
            </div>
            <div className="col-span-2 text-xs uppercase tracking-wider text-gray-500 font-medium text-right">
              HOLDINGS (BOSON)
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100">
            {filteredHoldings.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                No players found matching your search.
              </div>
            ) : (
              filteredHoldings.map((holding) => (
                <div
                  key={holding.id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-semibold text-sm">
                      {holding.avatar}
                    </div>
                    <div>
                      <div className="font-medium text-black">
                        {holding.playerName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {holding.team} • {holding.position}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-yellow-500">🪙</span>
                      <span className="font-medium text-black">
                        {holding.price.toFixed(6)}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <span
                      className={`text-sm font-medium ${
                        holding.change1h >= 0
                          ? "text-emerald-500"
                          : "text-red-500"
                      }`}
                    >
                      {holding.change1h >= 0 ? "↑" : "↓"}
                      {Math.abs(holding.change1h).toFixed(2)}%
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="font-medium text-black">
                      {holding.shares.toFixed(2)}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-yellow-500">🪙</span>
                      <span className="font-medium text-black">
                        {holding.holdings.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing 1 - {filteredHoldings.length} of {holdings.length}
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              ←
            </button>
            <button className="px-3 py-2 rounded-lg bg-black text-white text-sm font-medium">
              1
            </button>
            <button className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors">
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
