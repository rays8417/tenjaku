import { Network } from "@aptos-labs/ts-sdk";

// ===== NETWORK CONFIGURATION =====
export const NETWORK = Network.TESTNET;
export const APTOS_FULLNODE_URL = "https://api.testnet.aptoslabs.com/v1";

// ===== API CONFIGURATION =====
export const CRICBUZZ_API_HOST = "cricbuzz-cricket.p.rapidapi.com";
export const CRICBUZZ_API_URL = "https://cricbuzz-cricket.p.rapidapi.com";

// API keys - prefer environment variables, fallback to empty string
export const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || "";
export const getRapidApiKey = () => process.env.NEXT_PUBLIC_RAPIDAPI_KEY || "";

// ===== CONTRACT ADDRESSES =====
export const ROUTER_ADDRESS =
  "0xaf230e3024e92da6a3a15f5a6a3f201c886891268717bf8a21157bb73a1c027b";

// ===== TOKEN CONFIGURATION =====
export const TOKEN_DECIMALS = 8;
export const DECIMAL_MULTIPLIER = Math.pow(10, TOKEN_DECIMALS);

export const BOSON_TOKEN = {
  name: "BOSON",
  type: `${ROUTER_ADDRESS}::Boson::Boson`,
  displayName: "BOSON",
  team: "Base",
  position: "Base" as const,
  avatar: "B",
};

// ===== TRADING CONFIGURATION =====
export const SLIPPAGE_TOLERANCE = 0.9; // 10% slippage (99.5% = 0.5% slippage)

// ===== PLAYER TYPES =====
export type PlayerPosition = "BAT" | "BWL" | "AR" | "WK";

export interface PlayerInfo {
  displayName: string;
  name: string;
  team: string;
  position: PlayerPosition;
  avatar: string;
  tokenType: string;
}

// ===== PLAYER MAPPING =====
export const PLAYER_MAPPING: Record<string, PlayerInfo> = {
  BenStokes: {
    displayName: "Ben Stokes",
    name: "Ben Stokes",
    team: "ENG",
    position: "AR",
    avatar: "BS",
    tokenType: `${ROUTER_ADDRESS}::BenStokes::BenStokes`,
  },
  TravisHead: {
    displayName: "Travis Head",
    name: "Travis Head",
    team: "AUS",
    position: "BAT",
    avatar: "TH",
    tokenType: `${ROUTER_ADDRESS}::TravisHead::TravisHead`,
  },
  ViratKohli: {
    displayName: "Virat Kohli",
    name: "Virat Kohli",
    team: "IND",
    position: "BAT",
    avatar: "VK",
    tokenType: `${ROUTER_ADDRESS}::ViratKohli::ViratKohli`,
  },
  GlenMaxwell: {
    displayName: "Glenn Maxwell",
    name: "Glenn Maxwell",
    team: "AUS",
    position: "AR",
    avatar: "GM",
    tokenType: `${ROUTER_ADDRESS}::GlenMaxwell::GlenMaxwell`,
  },
  ShubhamDube: {
    displayName: "Shubham Dube",
    name: "Shubham Dube",
    team: "IND",
    position: "AR",
    avatar: "SD",
    tokenType: `${ROUTER_ADDRESS}::ShubhamDube::ShubhamDube`,
  },
  HardikPandya: {
    displayName: "Hardik Pandya",
    name: "Hardik Pandya",
    team: "IND",
    position: "AR",
    avatar: "HP",
    tokenType: `${ROUTER_ADDRESS}::HardikPandya::HardikPandya`,
  },
  ShubhmanGill: {
    displayName: "Shubman Gill",
    name: "Shubman Gill",
    team: "IND",
    position: "BAT",
    avatar: "SG",
    tokenType: `${ROUTER_ADDRESS}::ShubhmanGill::ShubhmanGill`,
  },
  KaneWilliamson: {
    displayName: "Kane Williamson",
    name: "Kane Williamson",
    team: "NZ",
    position: "BAT",
    avatar: "KW",
    tokenType: `${ROUTER_ADDRESS}::KaneWilliamson::KaneWilliamson`,
  },
  AbhishekSharma: {
    displayName: "Abhishek Sharma",
    name: "Abhishek Sharma",
    team: "IND",
    position: "BAT",
    avatar: "AS",
    tokenType: `${ROUTER_ADDRESS}::AbhishekSharma::AbhishekSharma`,
  },
  JaspreetBumhrah: {
    displayName: "Jasprit Bumrah",
    name: "Jasprit Bumrah",
    team: "IND",
    position: "BWL",
    avatar: "JB",
    tokenType: `${ROUTER_ADDRESS}::JaspreetBumhrah::JaspreetBumhrah`,
  },
  SuryakumarYadav: {
    displayName: "Suryakumar Yadav",
    name: "Suryakumar Yadav",
    team: "IND",
    position: "BAT",
    avatar: "SY",
    tokenType: `${ROUTER_ADDRESS}::SuryakumarYadav::SuryakumarYadav`,
  },
};

// ===== HELPER FUNCTIONS =====

/**
 * Create a default player entry for unknown players
 */
export function createDefaultPlayer(playerName: string): Omit<PlayerInfo, "tokenType"> {
  // Extract initials for avatar
  const words = playerName.match(/[A-Z][a-z]+/g) || [playerName];
  const avatar = words
    .map((word) => word[0])
    .join("")
    .substring(0, 2);

  return {
    name: playerName.replace(/([A-Z])/g, " $1").trim(), // Add spaces before capital letters
    displayName: playerName.replace(/([A-Z])/g, " $1").trim(),
    team: "TBD", // To be determined
    position: "BAT", // Default to batsman
    avatar: avatar,
  };
}

/**
 * Get player info by token name
 */
export function getPlayerInfo(tokenName: string): PlayerInfo | undefined {
  return PLAYER_MAPPING[tokenName];
}

/**
 * Get all player token names
 */
export function getAllPlayerTokenNames(): string[] {
  return Object.keys(PLAYER_MAPPING);
}

/**
 * Get all player infos
 */
export function getAllPlayerInfos(): PlayerInfo[] {
  return Object.values(PLAYER_MAPPING);
}

