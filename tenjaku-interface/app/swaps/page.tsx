"use client";

import { useState, useEffect, useCallback } from "react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import debounce from "lodash/debounce";
import { useWallet } from "../../contexts/WalletContext";
import toast from "react-hot-toast";

// Extend Window interface for Aptos wallet
declare global {
  interface Window {
    aptos?: any;
  }
}

// ===== CONFIGURATION =====
// Initialize Aptos client for devnet
const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

// TODO: Replace these placeholders with actual devnet deployed addresses
const ROUTER_ADDRESS =
  "0xaf230e3024e92da6a3a15f5a6a3f201c886891268717bf8a21157bb73a1c027b"; // PLACEHOLDER - Replace with the actual address where higgs::router module is deployed on devnet

// Available functions in your higgs::router contract:
// Entry functions (transactions):
// - ${ROUTER_ADDRESS}::router::swap_exact_input (direct swap - what we're using)
// - ${ROUTER_ADDRESS}::router::swap_exact_input_doublehop (2-hop swap)
// - ${ROUTER_ADDRESS}::router::swap_exact_input_triplehop (3-hop swap)
// - ${ROUTER_ADDRESS}::router::swap_exact_input_quadruplehop (4-hop swap)
// - ${ROUTER_ADDRESS}::router::swap_exact_output (specify exact output amount)
// View functions (read-only):
// - ${ROUTER_ADDRESS}::router::get_amount_in (get input needed for specific output - what we use for quotes)

// API endpoint for fetching token pair prices
const APTOS_FULLNODE_URL = "https://api.testnet.aptoslabs.com/v1";

// Base token configuration
const BOSON_TOKEN = {
  name: "BOSON",
  type: `${ROUTER_ADDRESS}::Boson::Boson`,
  displayName: "BOSON",
  team: "Base",
  position: "Base" as const,
  avatar: "B",
};

// Interface for dynamic token pairs
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
    team?: string;
    position?: string;
  };
  reserves: {
    reserve_x: string;
    reserve_y: string;
    block_timestamp_last: string;
  };
}

// Player mapping for display names and metadata
const PLAYER_MAPPING: Record<string, {
  displayName: string;
  team: string;
  position: "BAT" | "BWL" | "AR" | "WK";
  avatar: string;
}> = {
  BenStokes: {
    displayName: "Ben Stokes",
    team: "ENG",
    position: "AR",
    avatar: "BS",
  },
  TravisHead: {
    displayName: "Travis Head",
    team: "AUS",
    position: "BAT",
    avatar: "TH",
  },
  ViratKohli: {
    displayName: "Virat Kohli",
    team: "IND",
    position: "BAT",
    avatar: "VK",
  },
  GlenMaxwell: {
    displayName: "Glenn Maxwell",
    team: "AUS",
    position: "AR",
    avatar: "GM",
  },
  ShubhamDube: {
    displayName: "Shubham Dube",
    team: "IND",
    position: "AR",
    avatar: "SD",
  },
  HardikPandya: {
    displayName: "Hardik Pandya",
    team: "IND",
    position: "AR",
    avatar: "HP",
  },
  ShubhmanGill: {
    displayName: "Shubman Gill",
    team: "IND",
    position: "BAT",
    avatar: "SG",
  },
  KaneWilliamson: {
    displayName: "Kane Williamson",
    team: "NZ",
    position: "BAT",
    avatar: "KW",
  },
  JaspreetBumhrah: {
    displayName: "Jasprit Bumrah",
    team: "IND",
    position: "BWL",
    avatar: "JB",
  },
  SuryakumarYadav: {
    displayName: "Suryakumar Yadav",
    team: "IND",
    position: "BAT",
    avatar: "SY",
  },
  AbhishekSharma: {
    displayName: "Abhishek Sharma",
    team: "IND",
    position: "AR",
    avatar: "AS",
  },
};

// Token decimals - assuming 8 decimals for both tokens
const TOKEN_DECIMALS = 8;
const DECIMAL_MULTIPLIER = Math.pow(10, TOKEN_DECIMALS);

// Slippage tolerance (99.5% = 0.5% slippage)
const SLIPPAGE_TOLERANCE = 0.9;

export default function SwapsPage() {
  // Get wallet state from context
  const { account } = useWallet();
  
  // UI State
  const [payAmount, setPayAmount] = useState("");
  const [receiveAmount, setReceiveAmount] = useState("");
  const [isSwapped, setIsSwapped] = useState(false);
  const [selectedPlayerToken, setSelectedPlayerToken] = useState("AbhishekSharma");

  // Web3 State
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState({
    balance: false,
    quote: false,
    swap: false,
    price: false,
    liquidity: false,
  });
  const [tokenPrices, setTokenPrices] = useState({
    current: null as any,
    lastUpdated: null as Date | null,
  });
  const [availableTokenPairs, setAvailableTokenPairs] = useState<TokenPair[]>([]);
  const [availableTokens, setAvailableTokens] = useState<Array<{
    name: string;
    type: string;
    displayName: string;
    team?: string;
    position?: string;
    avatar: string;
  }>>([]);

  // Get current token configuration based on swap state and selected token
  const getCurrentTokens = () => {
    const selectedToken = availableTokens.find(token => token.name === selectedPlayerToken);
    
    if (!selectedToken) {
      // Fallback to ABHISHEK if selected token not found
      const fallbackToken = {
        name: "AbhishekSharma",
        type: `${ROUTER_ADDRESS}::AbhishekSharma::AbhishekSharma`,
        displayName: "Abhishek Sharma",
        team: "IND",
        position: "AR" as const,
        avatar: "AS",
      };
      
      if (isSwapped) {
        return {
          from: fallbackToken,
          to: BOSON_TOKEN,
          fromBalance: balances[fallbackToken.name.toLowerCase()] || 0,
          toBalance: balances.boson || 0,
        };
      } else {
        return {
          from: BOSON_TOKEN,
          to: fallbackToken,
          fromBalance: balances.boson || 0,
          toBalance: balances[fallbackToken.name.toLowerCase()] || 0,
        };
      }
    }

    // Ensure selectedToken has all required properties
    const tokenWithDefaults = {
      name: selectedToken.name,
      type: selectedToken.type,
      displayName: selectedToken.displayName || selectedToken.name,
      team: selectedToken.team || "Unknown",
      position: selectedToken.position || "Unknown",
      avatar: selectedToken.avatar || selectedToken.name.charAt(0),
    };

    if (isSwapped) {
      return {
        from: tokenWithDefaults,
        to: BOSON_TOKEN,
        fromBalance: balances[selectedToken.name.toLowerCase()] || 0,
        toBalance: balances.boson || 0,
      };
    } else {
      return {
        from: BOSON_TOKEN,
        to: tokenWithDefaults,
        fromBalance: balances.boson || 0,
        toBalance: balances[selectedToken.name.toLowerCase()] || 0,
      };
    }
  };

  // ===== WEB3 FUNCTIONS =====

  // Fetch all available liquidity pairs from the contract
  const fetchLiquidityPairs = async () => {
    setIsLoading((prev) => ({ ...prev, liquidity: true }));

    try {
      console.log("🔍 === FETCHING LIQUIDITY PAIRS ===");
      
      const url = `${APTOS_FULLNODE_URL}/accounts/${ROUTER_ADDRESS}/resources`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("✅ Liquidity pairs data received:", data);

      // Filter for TokenPairReserve resources
      const tokenPairReserves = data.filter((resource: any) => 
        resource.type.includes("TokenPairReserve")
      );

      console.log("📊 Found token pair reserves:", tokenPairReserves.length);

      const parsedPairs: TokenPair[] = [];
      const tokenSet = new Set<string>();

      for (const resource of tokenPairReserves) {
        try {
          // Parse the type string to extract token types
          const typeMatch = resource.type.match(/TokenPairReserve<([^,]+),\s*([^>]+)>/);
          if (!typeMatch) continue;

          const token1Type = typeMatch[1];
          const token2Type = typeMatch[2];

          // Extract token names from type strings
          const token1Name = token1Type.split("::").pop() || "Unknown";
          const token2Name = token2Type.split("::").pop() || "Unknown";

          // Skip if either token is not a player token or BOSON
          if (token1Name !== "Boson" && token2Name !== "Boson") continue;

          // Determine which is the player token and which is BOSON
          const isPlayerTokenFirst = token1Name !== "Boson";
          const playerTokenName = isPlayerTokenFirst ? token1Name : token2Name;
          const playerTokenType = isPlayerTokenFirst ? token1Type : token2Type;
          const bosonTokenType = isPlayerTokenFirst ? token2Type : token1Type;

          // Get player metadata
          const playerInfo = PLAYER_MAPPING[playerTokenName];
          if (!playerInfo) {
            console.warn(`No player mapping found for: ${playerTokenName}`);
            continue;
          }

          // Add to token set for dropdown
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

          console.log(`✅ Parsed pair: ${playerInfo.displayName} ↔ BOSON`, {
            reserves: resource.data,
            playerToken: playerTokenName,
          });
        } catch (error) {
          console.error(`❌ Failed to parse resource:`, resource, error);
        }
      }

      // Create available tokens list for dropdown
      const tokensList = Array.from(tokenSet).map(tokenName => {
        const playerInfo = PLAYER_MAPPING[tokenName];
        return {
          name: tokenName,
          type: `${ROUTER_ADDRESS}::${tokenName}::${tokenName}`,
          displayName: playerInfo.displayName,
          team: playerInfo.team,
          position: playerInfo.position,
          avatar: playerInfo.avatar,
        };
      });

      setAvailableTokenPairs(parsedPairs);
      setAvailableTokens(tokensList);

      console.log("🎉 === LIQUIDITY PAIRS FETCHED SUCCESSFULLY ===");
      console.log("Available tokens:", tokensList);
      console.log("Available pairs:", parsedPairs.length);

      return parsedPairs;
    } catch (error) {
      console.error("❌ Failed to fetch liquidity pairs:", error);
      setAvailableTokenPairs([]);
      setAvailableTokens([]);
    } finally {
      setIsLoading((prev) => ({ ...prev, liquidity: false }));
    }
  };

  // Fetch token pair price from Aptos fullnode API
  const fetchTokenPairPrice = async (tokenA?: string, tokenB?: string) => {
    setIsLoading((prev) => ({ ...prev, price: true }));

    try {
      // Use provided tokens or default to selected player token/BOSON pair
      const token1 = tokenA || (availableTokens.find(t => t.name === selectedPlayerToken)?.type || `${ROUTER_ADDRESS}::AbhishekSharma::AbhishekSharma`);
      const token2 = tokenB || BOSON_TOKEN.type;

      // Construct the resource type URL-encoded string based on the curl command
      const resourceType = `${ROUTER_ADDRESS}::swap::TokenPairMetadata<${token1},%20${token2}>`;

      const url = `${APTOS_FULLNODE_URL}/accounts/${ROUTER_ADDRESS}/resource/${encodeURIComponent(
        resourceType
      )}`;

      console.log("🔍 === FETCHING TOKEN PAIR PRICE ===");
      console.log("📊 API request details:", {
        url,
        resourceType,
        accountAddress: ROUTER_ADDRESS,
        token1Name: token1.split("::").pop(),
        token2Name: token2.split("::").pop(),
      });

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      console.log("✅ Token pair price data received:", data);

      // Extract useful information from the response and calculate prices
      const priceInfo = {
        ...data,
        token1: token1.split("::").pop(),
        token2: token2.split("::").pop(),
        reserves:
          data?.data?.balance_x && data?.data?.balance_y
            ? {
                // Raw reserve values
                tokenX: data.data.balance_x.value,
                tokenY: data.data.balance_y.value,
                // Formatted reserve values (with decimals)
                formattedX:
                  Number(data.data.balance_x.value) / DECIMAL_MULTIPLIER,
                formattedY:
                  Number(data.data.balance_y.value) / DECIMAL_MULTIPLIER,
                // Basic ratio
                ratio:
                  Number(data.data.balance_x.value) /
                  Number(data.data.balance_y.value),
                // Price calculations using liquidity pool formulas
                // Assuming 1 Boson = $1 USD (as per your reference)
                bosonPriceUSD: 1,
                // Formula: P_x = (R_y × P_y) / R_x
                // AbhishekSharma price in USD = (Boson Reserve × Boson Price) / AbhishekSharma Reserve
                abhishekPriceUSD:
                  ((Number(data.data.balance_y.value) / DECIMAL_MULTIPLIER) *
                    1) /
                  (Number(data.data.balance_x.value) / DECIMAL_MULTIPLIER),
                // AbhishekSharma price in Boson = Boson Reserve / AbhishekSharma Reserve
                abhishekPriceInBoson:
                  Number(data.data.balance_y.value) /
                  DECIMAL_MULTIPLIER /
                  (Number(data.data.balance_x.value) / DECIMAL_MULTIPLIER),
                // Inverse: Boson price in AbhishekSharma
                bosonPriceInAbhishek:
                  Number(data.data.balance_x.value) /
                  DECIMAL_MULTIPLIER /
                  (Number(data.data.balance_y.value) / DECIMAL_MULTIPLIER),
              }
            : null,
      };

      setTokenPrices({
        current: priceInfo,
        lastUpdated: new Date(),
      });

      return priceInfo;
    } catch (error) {
      console.error("❌ Failed to fetch token pair price:", error);
      console.error("This might mean:");
      console.error("  1. The token pair doesn't exist yet");
      console.error("  2. The API endpoint is incorrect");
      console.error("  3. Network connectivity issues");

      // Don't throw error to prevent UI breaking
      setTokenPrices({
        current: null,
        lastUpdated: new Date(),
      });
    } finally {
      setIsLoading((prev) => ({ ...prev, price: false }));
    }
  };

  // Fetch on-chain token balances for all available tokens
  const fetchBalances = async () => {
    if (!account?.address || availableTokens.length === 0) return;

    setIsLoading((prev) => ({ ...prev, balance: true }));

    try {
      const newBalances: Record<string, number> = {};

      // Fetch BOSON balance
      try {
        const bosonBalance = await aptos.getAccountCoinAmount({
          accountAddress: account.address,
          coinType: BOSON_TOKEN.type as `${string}::${string}::${string}`,
        });
        newBalances.boson = bosonBalance / DECIMAL_MULTIPLIER;
      } catch (error) {
        console.log("BOSON balance not found:", error);
        newBalances.boson = 0;
      }

      // Fetch balances for all available player tokens
      for (const token of availableTokens) {
        try {
          const balance = await aptos.getAccountCoinAmount({
            accountAddress: account.address,
            coinType: token.type as `${string}::${string}::${string}`,
          });
          newBalances[token.name.toLowerCase()] = balance / DECIMAL_MULTIPLIER;
          console.log(`✅ ${token.displayName} balance: ${balance / DECIMAL_MULTIPLIER}`);
        } catch (error) {
          console.log(`${token.displayName} balance not found:`, error);
          newBalances[token.name.toLowerCase()] = 0;
        }
      }

      setBalances(newBalances);
      console.log("💰 All balances fetched:", newBalances);
    } catch (error) {
      console.error("Failed to fetch balances:", error);
      // Don't show alert for balance errors as they might be expected (no tokens)
    } finally {
      setIsLoading((prev) => ({ ...prev, balance: false }));
    }
  };

  // Get real-time price quote using AMM formula with on-chain reserves
  const fetchQuote = async (inputAmount: string) => {
    if (!inputAmount || Number(inputAmount) <= 0) {
      setReceiveAmount("");
      return;
    }

    setIsLoading((prev) => ({ ...prev, quote: true }));

    try {
      const tokens = getCurrentTokens();
      const amountIn = Math.floor(Number(inputAmount) * DECIMAL_MULTIPLIER);

      console.log("🔍 === FETCHING QUOTE ===");
      console.log("📊 Quote request details:", {
        inputAmount,
        amountIn,
        fromToken: tokens.from.name,
        toToken: tokens.to.name,
        fromTokenType: tokens.from.type,
        toTokenType: tokens.to.type,
        routerAddress: ROUTER_ADDRESS,
      });

      // Based on your contract, token_reserves is NOT a public view function!
      // Looking at your contract, there's no public view function to get reserves directly.
      // We need to use a different approach - calculate the quote using get_amount_in function

      console.log(
        "💡 SOLUTION: Using get_amount_in function instead of trying to read reserves directly"
      );
      console.log("📋 Your contract has these public functions we can use:");
      console.log("   - router::get_amount_in<X, Y>(y_out_amount: u64): u64");
      console.log(
        "   - This function internally calls token_reserves and calculates the input needed"
      );

      // Let's try to get a quote by asking: "how much input do I need for 1 output token?"
      const oneTokenOut = DECIMAL_MULTIPLIER; // 1 token in raw units

      const getAmountInFunction = `${ROUTER_ADDRESS}::router::get_amount_in`;

      console.log(`🧪 Testing get_amount_in function: ${getAmountInFunction}`);
      console.log("📦 View payload:", {
        function: getAmountInFunction,
        typeArguments: [tokens.from.type, tokens.to.type],
        functionArguments: [oneTokenOut.toString()],
      });

      const amountInForOneOut = await aptos.view({
        payload: {
          function: getAmountInFunction as `${string}::${string}::${string}`,
          typeArguments: [tokens.from.type, tokens.to.type],
          functionArguments: [oneTokenOut.toString()],
        },
      });

      console.log("✅ get_amount_in response:", amountInForOneOut);

      if (!Array.isArray(amountInForOneOut) || amountInForOneOut.length === 0) {
        throw new Error("Invalid response from get_amount_in function");
      }

      const inputNeededForOneOutput = Number(amountInForOneOut[0]);
      console.log("📊 Exchange rate calculation:", {
        inputNeededForOneOutput,
        inputNeededFormatted: inputNeededForOneOutput / DECIMAL_MULTIPLIER,
        exchangeRate: DECIMAL_MULTIPLIER / inputNeededForOneOutput,
      });

      // Calculate output for our actual input amount
      const exchangeRate = DECIMAL_MULTIPLIER / inputNeededForOneOutput; // How many output tokens per input token
      const amountOut = Math.floor(amountIn * exchangeRate);

      console.log("🧮 === REAL EXCHANGE RATE CALCULATION ===");
      console.log(
        "Formula: amountOut = amountIn * (1 / inputNeededForOneOutput) * DECIMAL_MULTIPLIER"
      );
      console.log("Calculation inputs:", {
        amountIn,
        inputNeededForOneOutput,
        exchangeRate,
        amountOut,
        formattedOutput: amountOut / DECIMAL_MULTIPLIER,
      });

      // Now we have the real exchange rate, let's set the receive amount
      setReceiveAmount((amountOut / DECIMAL_MULTIPLIER).toString());

      console.log("✅ === REAL QUOTE COMPLETE ===");
      console.log("Final result:", {
        inputAmount,
        outputAmount: amountOut / DECIMAL_MULTIPLIER,
        exchangeRate: exchangeRate,
        usingRealContractData: true,
      });

      // Compare with price data from API if available
      if (tokenPrices.current?.reserves) {
        const apiRatio = tokenPrices.current.reserves.ratio;
        const contractRatio = 1 / exchangeRate;
        console.log("📊 Price comparison:", {
          apiRatio,
          contractRatio,
          difference: Math.abs(apiRatio - contractRatio),
          percentDifference:
            Math.abs((apiRatio - contractRatio) / apiRatio) * 100,
        });
      }

      return; // Exit early since we got a real quote
    } catch (error) {
      console.error("❌ Failed to fetch quote:", error);
      console.error("Error details:", error);

      // Try fallback calculation using API price data if available
      if (tokenPrices.current?.reserves) {
        console.log(
          "🔄 Attempting fallback calculation using API price data..."
        );
        try {
          const tokens = getCurrentTokens();
          let fallbackOutput = 0;

          // Calculate based on which direction we're swapping
          if (tokens.from.name !== "BOSON") {
            // Swapping player token for Boson
            // Use the calculated exchange rate: Player -> Boson
            fallbackOutput =
              Number(inputAmount) *
              tokenPrices.current.reserves.abhishekPriceInBoson;
          } else {
            // Swapping Boson for player token
            // Use the inverse rate: Boson -> Player
            fallbackOutput =
              Number(inputAmount) *
              tokenPrices.current.reserves.bosonPriceInAbhishek;
          }

          setReceiveAmount(fallbackOutput.toString());

          console.log(
            "✅ Fallback quote calculated using liquidity pool formula:",
            {
              inputAmount,
              outputAmount: fallbackOutput,
              fromToken: tokens.from.name,
              toToken: tokens.to.name,
              playerPriceInBoson:
                tokenPrices.current.reserves.abhishekPriceInBoson,
              bosonPriceInPlayer:
                tokenPrices.current.reserves.bosonPriceInAbhishek,
              usingApiPriceData: true,
            }
          );

          return;
        } catch (fallbackError) {
          console.error("❌ Fallback calculation also failed:", fallbackError);
        }
      }

      // Set receive amount to 0 to indicate error
      setReceiveAmount("0");

      // Show error message to user
      console.error("Quote failed. This likely means:");
      console.error("  1. The liquidity pool doesn't exist yet");
      console.error("  2. No liquidity has been added to the pool");
      console.error("  3. Network connectivity issues");
      console.error("  4. Contract function parameters are incorrect");
    } finally {
      setIsLoading((prev) => ({ ...prev, quote: false }));
    }
  };

  // Debounced version of fetchQuote to prevent excessive API calls
  const debouncedFetchQuote = useCallback(
    debounce((inputAmount: string) => fetchQuote(inputAmount), 500),
    [isSwapped, tokenPrices]
  );

  // Execute the swap transaction using higgs::router
  const handleSwap = async () => {
    if (!account || !payAmount || Number(payAmount) <= 0) {
      toast.error("Please connect wallet and enter a valid amount");
      return;
    }

    const tokens = getCurrentTokens();
    const x_in = Math.floor(Number(payAmount) * DECIMAL_MULTIPLIER);
    const expectedAmountOut = Math.floor(
      Number(receiveAmount) * DECIMAL_MULTIPLIER
    );
    const y_min_out = Math.floor(expectedAmountOut * SLIPPAGE_TOLERANCE);

    console.log("🔄 === STARTING SWAP TRANSACTION ===");
    console.log("📊 Swap Details:", {
      fromToken: tokens.from.name,
      toToken: tokens.to.name,
      fromTokenType: tokens.from.type,
      toTokenType: tokens.to.type,
      inputAmount: payAmount,
      x_in: x_in.toString(),
      expectedOutput: receiveAmount,
      y_min_out: y_min_out.toString(),
      userAddress: account.address,
      routerAddress: ROUTER_ADDRESS,
    });

    // Pre-flight balance check
    if (tokens.fromBalance < Number(payAmount)) {
      toast.error(
        `Insufficient ${
          tokens.from.name
        } balance. You have ${tokens.fromBalance.toFixed(
          4
        )} but are trying to swap ${payAmount}`
      );
      return;
    }

    setIsLoading((prev) => ({ ...prev, swap: true }));

    try {
      // Check if wallet is available first
      if (!window.aptos) {
        throw new Error("Wallet not found. Please install Petra wallet.");
      }

      // Validate wallet methods exist
      if (typeof window.aptos.signAndSubmitTransaction !== "function") {
        throw new Error(
          "Wallet does not support required transaction methods. Please update your wallet."
        );
      }

      // Check if still connected
      if (!account?.address) {
        throw new Error("Wallet not connected. Please reconnect your wallet.");
      }

      // Build transaction payload
      const swapFunction = `${ROUTER_ADDRESS}::router::swap_exact_input`;

      const payload = {
        function: swapFunction as `${string}::${string}::${string}`,
        typeArguments: [tokens.from.type, tokens.to.type],
        functionArguments: [x_in.toString(), y_min_out.toString()],
      };

      console.log("🔧 === BUILDING TRANSACTION ===");
      console.log("📦 Payload:", {
        function: swapFunction,
        typeArguments: payload.typeArguments,
        functionArguments: payload.functionArguments,
        functionArgumentsDecimal: [
          `${x_in} (${Number(x_in) / DECIMAL_MULTIPLIER} tokens)`,
          `${y_min_out} (${Number(y_min_out) / DECIMAL_MULTIPLIER} tokens)`,
        ],
      });

      // Test transaction building first
      console.log("🏗️ Testing transaction building...");
      try {
        const testTx = await aptos.transaction.build.simple({
          sender: account.address,
          data: payload,
        });
        console.log("✅ Transaction building successful:", testTx);
      } catch (buildError: any) {
        console.error("❌ Transaction building failed:", buildError);
        throw new Error(`Transaction building failed: ${buildError.message}`);
      }

      // Check account info
      console.log("\n💰 === PRE-TRANSACTION CHECKS ===");
      try {
        const accountInfo = await aptos.getAccountInfo({
          accountAddress: account.address,
        });
        console.log("👤 Account info:", {
          sequence_number: accountInfo.sequence_number,
          authentication_key: accountInfo.authentication_key,
        });

        // Check APT balance for gas
        const aptBalance = await aptos.getAccountAPTAmount({
          accountAddress: account.address,
        });
        console.log(`⛽ APT balance for gas: ${aptBalance / 100000000} APT`);

        if (aptBalance < 1000000) {
          // Less than 0.01 APT
          console.warn("⚠️ Low APT balance for gas fees");
        }
      } catch (balanceError) {
        console.warn("⚠️ Could not check account info:", balanceError);
      }

      // Sign and submit transaction
      console.log("\n🔐 === SUBMITTING TRANSACTION ===");
      console.log("📝 Requesting wallet signature...");

      let response;
      try {
        // Use the correct Petra wallet transaction format
        response = await window.aptos.signAndSubmitTransaction({
          type: "entry_function_payload",
          function: payload.function,
          type_arguments: payload.typeArguments,
          arguments: payload.functionArguments,
        });

        // Validate response structure
        if (!response) {
          throw new Error("Transaction response is undefined");
        }

        if (!response.hash) {
          console.error("Invalid transaction response:", response);
          throw new Error("Transaction response missing hash");
        }

        console.log("✅ Transaction submitted successfully!");
        console.log("📋 Transaction response:", {
          hash: response.hash,
          sender: response.sender || "N/A",
          sequence_number: response.sequence_number || "N/A",
          max_gas_amount: response.max_gas_amount || "N/A",
          gas_unit_price: response.gas_unit_price || "N/A",
        });
      } catch (txError: any) {
        console.error("❌ Transaction submission failed:", txError);
        console.error("Error details:", {
          message: txError?.message,
          code: txError?.code,
          status: txError?.status,
          data: txError?.data,
          response: txError?.response,
          fullError: txError,
        });

        // Handle specific wallet errors
        if (txError?.code === 4001) {
          throw new Error("Transaction was rejected by user");
        } else if (txError?.message?.includes("User rejected")) {
          throw new Error("Transaction was rejected by user");
        } else if (
          txError?.message?.includes("Cannot read properties of undefined")
        ) {
          throw new Error(
            "Wallet response error. Please try again or check your wallet connection."
          );
        } else {
          throw new Error(
            `Transaction submission failed: ${
              txError.message || "Unknown error"
            }`
          );
        }
      }

      // Wait for transaction confirmation
      console.log("\n⏳ === WAITING FOR CONFIRMATION ===");
      console.log("Transaction hash:", response.hash);

      let confirmedTx;
      try {
        // Add timeout for transaction confirmation
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error("Transaction confirmation timeout")),
            30000
          );
        });

        const confirmationPromise = aptos.waitForTransaction({
          transactionHash: response.hash,
        });

        confirmedTx = await Promise.race([confirmationPromise, timeoutPromise]);

        // Validate confirmed transaction
        if (!confirmedTx) {
          throw new Error("Confirmed transaction is undefined");
        }

        console.log("🎉 Transaction confirmed!");
        console.log("📋 Confirmed transaction:", {
          version: (confirmedTx as any)?.version || "N/A",
          success: (confirmedTx as any)?.success,
          vm_status: (confirmedTx as any)?.vm_status || "N/A",
          gas_used: (confirmedTx as any)?.gas_used || "N/A",
          changes: Array.isArray((confirmedTx as any)?.changes)
            ? (confirmedTx as any).changes.length
            : 0,
        });
      } catch (confirmError: any) {
        console.error("❌ Transaction confirmation failed:", confirmError);

        // Still consider it potentially successful if we have a hash
        if (response?.hash) {
          console.log(
            "⚠️ Transaction submitted but confirmation failed. Check transaction manually:",
            response.hash
          );
          toast.error(
            `Transaction submitted (${response.hash}) but confirmation failed. Please check your wallet or explorer manually.`
          );
          return; // Exit without throwing error
        }

        throw new Error(
          `Transaction confirmation failed: ${
            confirmError.message || confirmError
          }`
        );
      }

      // Check transaction success
      if (confirmedTx && !(confirmedTx as any)?.success) {
        throw new Error(
          `Transaction failed on-chain: ${
            (confirmedTx as any)?.vm_status || "Unknown VM error"
          }`
        );
      }

      toast.success("Swap successful! 🎉");
      setPayAmount("");
      setReceiveAmount("");
      await fetchBalances(); // Refresh balances
    } catch (error: any) {
      console.error("❌ === SWAP FAILED ===");
      console.error("Error object:", error);
      console.error("Error message:", error?.message);
      console.error("Error stack:", error?.stack);
      console.error("Error type:", typeof error);
      console.error("Error constructor:", error?.constructor?.name);

      // Detailed error handling
      let errorMessage = "Swap failed. ";

      if (
        error?.message?.includes(
          "Cannot read properties of undefined (reading 'map')"
        )
      ) {
        errorMessage +=
          "Wallet response error. Please disconnect and reconnect your wallet, then try again.";
        console.error(
          "🔍 This error suggests the wallet response is malformed. Try refreshing and reconnecting wallet."
        );
      } else if (error?.message?.includes("Wallet response error")) {
        errorMessage +=
          "Wallet connection issue. Please disconnect and reconnect your wallet.";
        console.error("🔍 Wallet response validation failed");
      } else if (error?.message?.includes("map")) {
        errorMessage +=
          "Response parsing error. Try refreshing the page and reconnecting your wallet.";
        console.error("🔍 The transaction returned unexpected data format");
      } else if (error?.message?.includes("INSUFFICIENT_BALANCE")) {
        errorMessage += "Insufficient token balance.";
      } else if (error?.message?.includes("SLIPPAGE")) {
        errorMessage +=
          "Price changed too much. Try again or increase slippage tolerance.";
      } else if (error?.message?.includes("User rejected")) {
        errorMessage += "Transaction was rejected.";
      } else if (error?.message?.includes("Function does not exist")) {
        errorMessage += "Contract function not found. Check router address.";
      } else if (error?.message?.includes("Type does not exist")) {
        errorMessage += "Token type not found. Check token addresses.";
      } else if (error?.message?.includes("INSUFFICIENT_LIQUIDITY")) {
        errorMessage += "Not enough liquidity in the pool.";
      } else if (error?.message?.includes("gas")) {
        errorMessage += "Insufficient gas/APT for transaction fees.";
      } else if (error?.code === 4001) {
        errorMessage += "Transaction was rejected by user.";
      } else if (error?.message?.includes("Network")) {
        errorMessage += "Network connection error. Please try again.";
      } else {
        errorMessage += `Error: ${error?.message || "Unknown error"}`;
      }

      console.error("Detailed error info:", {
        message: error?.message,
        code: error?.code,
        data: error?.data,
        name: error?.name,
        cause: error?.cause,
      });

      toast.error(errorMessage);
    } finally {
      setIsLoading((prev) => ({ ...prev, swap: false }));
    }
  };

  // Test contract connectivity and functions
  const testContract = async () => {
    console.log("🧪 Testing contract setup...");

    try {
      // Test 1: Check if contract exists at the address
      console.log("📍 Testing contract address:", ROUTER_ADDRESS);

      // Test 2: Try calling the correct view function
      const testFunctions = [
        `${ROUTER_ADDRESS}::router::get_amount_in`, // The actual public view function we can use
      ];

      const selectedToken = availableTokens.find(token => token.name === selectedPlayerToken);
      const testTokenType = selectedToken?.type || `${ROUTER_ADDRESS}::AbhishekSharma::AbhishekSharma`;

      for (const func of testFunctions) {
        try {
          console.log(`🔍 Testing view function: ${func}`);
          const result = await aptos.view({
            payload: {
              function: func as `${string}::${string}::${string}`,
              typeArguments: [testTokenType, BOSON_TOKEN.type],
              functionArguments: [DECIMAL_MULTIPLIER.toString()], // Test with 1 token output
            },
          });
          console.log(`✅ Function works: ${func}`, result);
        } catch (error) {
          console.log(`❌ Function failed: ${func}`, (error as Error).message);
        }
      }

      // Test 3: Check token balances
      if (account) {
        try {
          const bosonBalance = await aptos.getAccountCoinAmount({
            accountAddress: account.address,
            coinType: BOSON_TOKEN.type as `${string}::${string}::${string}`,
          });
          console.log(`💰 BOSON balance: ${bosonBalance}`);
        } catch (error) {
          console.log(
            `❌ BOSON balance check failed:`,
            (error as Error).message
          );
        }

        // Test player token balance
        if (selectedToken) {
          try {
            const playerBalance = await aptos.getAccountCoinAmount({
              accountAddress: account.address,
              coinType: selectedToken.type as `${string}::${string}::${string}`,
            });
            console.log(`💰 ${selectedToken.displayName} balance: ${playerBalance}`);
          } catch (error) {
            console.log(
              `❌ ${selectedToken.displayName} balance check failed:`,
              (error as Error).message
            );
          }
        }
      }
    } catch (error) {
      console.error("❌ Contract test failed:", error);
    }
  };

  // Create liquidity pool if it doesn't exist
  const createPool = async () => {
    if (!account) {
      toast.error("Please connect wallet first");
      return;
    }

    try {
      console.log("🏗️ Creating liquidity pool...");

      const selectedToken = availableTokens.find(token => token.name === selectedPlayerToken);
      const tokenType = selectedToken?.type || `${ROUTER_ADDRESS}::AbhishekSharma::AbhishekSharma`;

      const payload = {
        function:
          `${ROUTER_ADDRESS}::router::create_pair` as `${string}::${string}::${string}`,
        typeArguments: [tokenType, BOSON_TOKEN.type],
        functionArguments: [],
      };

      console.log("📦 Create pool payload:", payload);

      const response = await window.aptos.signAndSubmitTransaction({
        type: "entry_function_payload",
        function: payload.function,
        type_arguments: payload.typeArguments,
        arguments: payload.functionArguments,
      });
      console.log(
        "⏳ Waiting for pool creation confirmation...",
        response.hash
      );

      const confirmedTx = await aptos.waitForTransaction({
        transactionHash: response.hash,
      });
      console.log("🎉 Pool created successfully!", confirmedTx);

      if (confirmedTx.success) {
        toast.success(
          "Liquidity pool created successfully! You can now add liquidity or swap tokens. 🎉"
        );
      } else {
        throw new Error(`Pool creation failed: ${confirmedTx.vm_status}`);
      }
    } catch (error: any) {
      console.error("❌ Pool creation failed:", error);
      toast.error(
        `Failed to create pool: ${
          error.message || "Please check console for details"
        }`
      );
    }
  };

  // Test swap function specifically
  const testSwapFunction = async () => {
    if (!account) {
      toast.error("Please connect wallet first");
      return;
    }

    try {
      console.log("🧪 === TESTING SWAP FUNCTION ===");

      const tokens = getCurrentTokens();
      const testAmount = "1"; // Test with 1 token
      const x_in = Math.floor(Number(testAmount) * DECIMAL_MULTIPLIER);
      const y_min_out = "1"; // Minimum 1 token out

      const swapFunction = `${ROUTER_ADDRESS}::router::swap_exact_input`;

      const payload = {
        function: swapFunction as `${string}::${string}::${string}`,
        typeArguments: [tokens.from.type, tokens.to.type],
        functionArguments: [x_in.toString(), y_min_out],
      };

      console.log("📦 Test swap payload:", payload);
      console.log("🔍 Testing transaction building...");

      // Test transaction building
      const testTx = await aptos.transaction.build.simple({
        sender: account.address,
        data: payload,
      });

      console.log("✅ Transaction building successful:", testTx);
      console.log("🎯 Swap function is working correctly!");

      toast.success(
        "Swap function test passed! The function exists and can build transactions. ✅"
      );
    } catch (error: any) {
      console.error("❌ Swap function test failed:", error);
      console.error("Error details:", {
        message: error?.message,
        code: error?.code,
        data: error?.data,
        fullError: error,
      });

      toast.error(
        `Swap function test failed: ${
          error.message || "Please check console for details"
        }`
      );
    }
  };

  const swapTokens = () => {
    // Clear amounts when swapping
    setPayAmount("");
    setReceiveAmount("");
    setIsSwapped(!isSwapped);
  };

  // ===== REACT EFFECTS =====

  // Fetch liquidity pairs on component mount
  useEffect(() => {
    fetchLiquidityPairs();
  }, []);

  // Fetch balances when account or available tokens change
  useEffect(() => {
    if (account && availableTokens.length > 0) {
      fetchBalances();
    }
  }, [account, availableTokens]);

  // Fetch token prices when selected token changes
  useEffect(() => {
    if (selectedPlayerToken) {
      const selectedToken = availableTokens.find(token => token.name === selectedPlayerToken);
      if (selectedToken) {
        fetchTokenPairPrice(selectedToken.type, BOSON_TOKEN.type);
      }
    }
  }, [selectedPlayerToken, availableTokens]);

  // Set up periodic price updates every 30 seconds
  useEffect(() => {
    if (selectedPlayerToken) {
      const priceInterval = setInterval(() => {
        const selectedToken = availableTokens.find(token => token.name === selectedPlayerToken);
        if (selectedToken) {
          fetchTokenPairPrice(selectedToken.type, BOSON_TOKEN.type);
        }
      }, 30000);

      return () => clearInterval(priceInterval);
    }
  }, [selectedPlayerToken, availableTokens]);

  // ===== UI HELPER FUNCTIONS =====

  const setPercent = (pct: number) => {
    const tokens = getCurrentTokens();
    const currentBalance = tokens.fromBalance;
    const amt = ((currentBalance * pct) / 100).toString();
    setPayAmount(amt);
    debouncedFetchQuote(amt);
  };

  const handlePayChange = (v: string) => {
    const cleaned = v.replace(/[^0-9.]/g, "");
    setPayAmount(cleaned);
    debouncedFetchQuote(cleaned);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-1">
              Token Swap
            </h1>
            <p className="text-foreground-muted text-sm sm:text-base">
              Exchange your tokens instantly with live pricing
            </p>
          </div>

          {/* Wallet Status */}
          {account ? (
            <div className="flex items-center gap-3 bg-surface-elevated border border-border rounded-xl px-4 py-3">
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
              <div className="text-left">
                <div className="text-sm font-medium text-foreground">Aptos Testnet</div>
              </div>
            </div>
          ) : (
            <div className="bg-warning-bg border border-warning rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-warning mb-1">
                Wallet not connected
              </p>
              <p className="text-xs text-warning">
                Use the Connect Wallet button in the navbar
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Left Column - Swap Interface */}
          <div className="lg:col-span-7">
            <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-surface-elevated to-surface px-6 py-4 border-b border-border">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Swap Tokens
                </h2>
              </div>

              <div className="p-6 space-y-3">
                {/* You Pay */}
                <div className="bg-surface rounded-2xl p-5 border-2 border-border hover:border-primary/50 transition-all duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-foreground-muted uppercase tracking-wide">
                      You Pay
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPercent(25)}
                        className="px-3 py-1.5 bg-surface-elevated text-foreground rounded-lg text-xs font-medium hover:bg-muted transition-all shadow-sm active:scale-95 border border-border"
                      >
                        25%
                      </button>
                      <button
                        onClick={() => setPercent(50)}
                        className="px-3 py-1.5 bg-surface-elevated text-foreground rounded-lg text-xs font-medium hover:bg-muted transition-all shadow-sm active:scale-95 border border-border"
                      >
                        50%
                      </button>
                      <button
                        onClick={() => setPercent(100)}
                        className="px-3 py-1.5 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-all shadow-sm active:scale-95"
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 mb-3">
                    <input
                      inputMode="decimal"
                      value={payAmount}
                      onChange={(e) => handlePayChange(e.target.value)}
                      placeholder="0.00"
                      className="bg-transparent text-4xl font-bold outline-none placeholder:text-foreground-subtle flex-1 text-foreground min-w-0"
                    />
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {!isSwapped ? (
                        <>
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-surface-elevated to-muted shadow-lg flex items-center justify-center ring-2 ring-border">
                            <span className="text-foreground font-bold text-lg">B</span>
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-foreground text-lg leading-tight">
                              BOSON
                            </div>
                            <div className="text-xs text-foreground-subtle font-medium">
                              Base Token
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary via-primary-hover to-primary shadow-lg flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-sm">
                              {getCurrentTokens().from.avatar}
                            </span>
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-foreground text-lg leading-tight">
                              {getCurrentTokens().from.displayName}
                            </div>
                            <div className="text-xs text-foreground-subtle font-medium">
                              {getCurrentTokens().from.team} • {getCurrentTokens().from.position}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground-muted font-medium">Balance:</span>
                    <span className="text-foreground font-semibold">
                      {isLoading.balance
                        ? "Loading..."
                        : `${getCurrentTokens().fromBalance.toFixed(4)} ${
                            getCurrentTokens().from.displayName || getCurrentTokens().from.name
                          }`}
                    </span>
                  </div>
                </div>

                {/* Swap Direction Button */}
                <div className="flex justify-center -my-1 relative z-10">
                  <button
                    onClick={swapTokens}
                    className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary-hover shadow-lg shadow-primary/20 flex items-center justify-center text-primary-foreground hover:shadow-xl hover:scale-110 transition-all duration-300 group border-4 border-background"
                  >
                    <svg
                      className="h-6 w-6 group-hover:rotate-180 transition-transform duration-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                      />
                    </svg>
                  </button>
                </div>

                {/* You Receive */}
                <div className="bg-surface-elevated rounded-2xl p-5 border-2 border-primary/30 hover:border-primary/50 transition-all duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-foreground-muted uppercase tracking-wide">
                      You Receive
                    </span>
                    {isLoading.quote && (
                      <span className="text-xs font-semibold text-primary animate-pulse flex items-center gap-1">
                        <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" />
                        Calculating...
                      </span>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-4 mb-3">
                    <input
                      inputMode="decimal"
                      value={isLoading.quote ? "..." : receiveAmount}
                      placeholder="0.00"
                      className="bg-transparent text-4xl font-bold outline-none placeholder:text-foreground-subtle flex-1 text-foreground min-w-0"
                      readOnly
                    />
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {!isSwapped ? (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary via-primary-hover to-primary shadow-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-primary-foreground font-bold text-sm">
                                {availableTokens.find(t => t.name === selectedPlayerToken)?.avatar || 'AS'}
                              </span>
                            </div>
                            <select
                              value={selectedPlayerToken}
                              onChange={(e) => {
                                setSelectedPlayerToken(e.target.value);
                                setPayAmount("");
                                setReceiveAmount("");
                              }}
                              className="bg-input-bg border-2 border-input rounded-lg px-3 py-2 text-foreground font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer hover:border-primary/50 transition-colors min-w-[160px]"
                              disabled={isLoading.liquidity}
                            >
                              {isLoading.liquidity ? (
                                <option value="">Loading...</option>
                              ) : (
                                availableTokens.map((token) => (
                                  <option key={token.name} value={token.name}>
                                    {token.displayName}
                                  </option>
                                ))
                              )}
                            </select>
                          </div>
                          <div className="text-xs text-foreground-muted font-medium text-right">
                            {availableTokens.find(t => t.name === selectedPlayerToken)?.team} • {availableTokens.find(t => t.name === selectedPlayerToken)?.position}
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-surface-elevated to-muted shadow-lg flex items-center justify-center ring-2 ring-border">
                            <span className="text-foreground font-bold text-lg">B</span>
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-foreground text-lg leading-tight">
                              BOSON
                            </div>
                            <div className="text-xs text-foreground-subtle font-medium">
                              Base Token
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground-muted font-medium">Balance:</span>
                    <span className="text-foreground font-semibold">
                      {isLoading.balance
                        ? "Loading..."
                        : `${getCurrentTokens().toBalance.toFixed(4)} ${
                            getCurrentTokens().to.displayName || getCurrentTokens().to.name
                          }`}
                    </span>
                  </div>
                </div>

                {/* Exchange Rate Info */}
                {payAmount && receiveAmount && Number(receiveAmount) > 0 && (
                  <div className="bg-info-bg/20 border border-info/30 rounded-xl p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-info font-medium flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        Exchange Rate:
                      </span>
                      <span className="text-foreground font-bold">
                        1 {getCurrentTokens().from.displayName} ≈ {(Number(receiveAmount) / Number(payAmount)).toFixed(4)} {getCurrentTokens().to.displayName}
                      </span>
                    </div>
                  </div>
                )}

                {/* Swap Button */}
                <button
                  onClick={handleSwap}
                  disabled={
                    !account ||
                    !payAmount ||
                    Number(payAmount) <= 0 ||
                    isLoading.swap
                  }
                  className={`w-full py-5 text-lg font-bold rounded-2xl transition-all duration-300 shadow-lg ${
                    account &&
                    payAmount &&
                    Number(payAmount) > 0 &&
                    !isLoading.swap
                      ? "bg-gradient-to-r from-primary via-primary-hover to-primary text-primary-foreground hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] shadow-primary/30"
                      : "bg-muted text-foreground-subtle cursor-not-allowed"
                  }`}
                >
                  {!account
                    ? "Connect Wallet First"
                    : isLoading.swap
                    ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Swapping...
                      </span>
                    )
                    : payAmount && Number(payAmount) > 0
                    ? "Swap Tokens"
                    : "Enter Amount"}
                </button>

                {/* Slippage Info */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  {/* <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg> */}
                  {/* <span>Max slippage: <span className="font-semibold text-gray-700">{((1 - SLIPPAGE_TOLERANCE) * 100).toFixed(1)}%</span></span> */}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Live Token Prices */}
          <div className="lg:col-span-5">
            <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden sticky top-6">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-primary to-primary-hover px-6 py-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-primary-foreground flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Live Prices
                  </h2>
                  {tokenPrices.lastUpdated && (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-success rounded-full animate-pulse" />
                      <span className="text-xs text-primary-foreground/90 font-medium">
                        {tokenPrices.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6">
                {isLoading.price ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="bg-surface rounded-xl p-5 animate-pulse"
                      >
                        <div className="h-4 bg-surface-elevated rounded w-1/3 mb-3" />
                        <div className="h-8 bg-surface-elevated rounded w-2/3" />
                      </div>
                    ))}
                  </div>
                ) : tokenPrices.current?.reserves ? (
                  <div className="space-y-4">
                    {/* Token Pair Status */}
                    <div className="bg-surface-elevated rounded-xl p-4 border-2 border-primary/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-foreground">
                          {availableTokens.find(t => t.name === selectedPlayerToken)?.displayName || 'Player Token'}/BOSON
                        </span>
                        <span className="flex items-center gap-1.5 text-xs px-3 py-1 bg-primary/20 text-primary rounded-full font-bold border border-primary/30">
                          <div className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse" />
                          Active
                        </span>
                      </div>
                      <div className="text-xs text-foreground-muted font-medium">
                        Liquidity Pool • Real-time pricing
                      </div>
                    </div>

                    {/* Token Price Cards */}
                    <div className="space-y-3">
                      {/* BOSON Price */}
                      <div className="bg-gradient-to-br from-surface-elevated to-surface rounded-xl p-5 shadow-lg border border-border">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-xs text-foreground-muted font-medium uppercase tracking-wide mb-1">
                              BOSON
                            </div>
                            <div className="text-3xl font-black mb-1 text-foreground">$1.00</div>
                          </div>
                          <div className="h-14 w-14 bg-primary rounded-2xl shadow-lg flex items-center justify-center transform rotate-12 hover:rotate-0 transition-transform">
                            <span className="text-primary-foreground font-black text-xl">B</span>
                          </div>
                        </div>
                      </div>

                      {/* Player Token Price */}
                      <div className="bg-gradient-to-br from-primary via-primary-hover to-primary rounded-xl p-5 shadow-lg border border-primary/30">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-xs text-primary-foreground/80 font-medium uppercase tracking-wide mb-1">
                              {availableTokens.find(t => t.name === selectedPlayerToken)?.displayName || 'Player Token'}
                            </div>
                            <div className="text-3xl font-black mb-1 text-primary-foreground">
                              ${tokenPrices.current.reserves.abhishekPriceUSD.toFixed(6)}
                            </div>
                          </div>
                          <div className="h-14 w-14 bg-primary-foreground rounded-2xl shadow-lg flex items-center justify-center transform -rotate-12 hover:rotate-0 transition-transform">
                            <span className="text-primary font-black text-lg">
                              {availableTokens.find(t => t.name === selectedPlayerToken)?.avatar || 'P'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Exchange Rates */}
                    <div className="bg-surface rounded-xl p-5 border-2 border-border">
                      <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Exchange Rates
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-surface-elevated rounded-lg border border-border">
                          <span className="text-sm text-foreground-muted font-medium">
                            1 {availableTokens.find(t => t.name === selectedPlayerToken)?.displayName || 'Player Token'}
                          </span>
                          <span className="text-sm font-bold text-foreground">
                            {tokenPrices.current.reserves.abhishekPriceInBoson.toFixed(6)} BOSON
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-surface-elevated rounded-lg border border-border">
                          <span className="text-sm text-foreground-muted font-medium">
                            1 BOSON
                          </span>
                          <span className="text-sm font-bold text-foreground">
                            {tokenPrices.current.reserves.bosonPriceInAbhishek.toFixed(2)} {availableTokens.find(t => t.name === selectedPlayerToken)?.displayName || 'Player Token'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Trade Value */}
                    {receiveAmount && Number(receiveAmount) > 0 && (
                      <div className="bg-success-bg/20 border-2 border-success/30 rounded-xl p-5">
                        <h3 className="text-sm font-bold text-success mb-3 uppercase tracking-wide flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Trade Value
                        </h3>
                        {getCurrentTokens().to.name === "BOSON" ? (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-foreground-muted font-medium">Total Value:</span>
                              <span className="text-2xl font-black text-success">
                                ${Number(receiveAmount).toFixed(4)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-foreground-muted font-medium">Total Value:</span>
                              <span className="text-2xl font-black text-success">
                                ${(Number(receiveAmount) * tokenPrices.current.reserves.abhishekPriceUSD).toFixed(4)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Refresh Button */}
                    <button
                      onClick={() => {
                        const selectedToken = availableTokens.find(token => token.name === selectedPlayerToken);
                        if (selectedToken) {
                          fetchTokenPairPrice(selectedToken.type, BOSON_TOKEN.type);
                        }
                      }}
                      disabled={isLoading.price}
                      className="w-full py-4 bg-gradient-to-r from-surface-elevated to-surface border border-border text-foreground rounded-xl hover:bg-muted transition-all shadow-lg hover:shadow-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
                    >
                      <svg className={`w-5 h-5 ${isLoading.price ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {isLoading.price ? "Refreshing..." : "Refresh Prices"}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="mx-auto h-16 w-16 bg-surface-elevated rounded-2xl flex items-center justify-center mb-4 border border-border">
                      <svg className="h-8 w-8 text-foreground-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="text-foreground-muted font-medium mb-2">
                      No price data available
                    </div>
                    <p className="text-sm text-foreground-subtle mb-4">
                      Load token prices to see live market data
                    </p>
                    <button
                      onClick={() => {
                        fetchLiquidityPairs();
                        const selectedToken = availableTokens.find(token => token.name === selectedPlayerToken);
                        if (selectedToken) {
                          fetchTokenPairPrice(selectedToken.type, BOSON_TOKEN.type);
                        }
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground rounded-xl hover:opacity-90 transition-all shadow-lg hover:shadow-xl font-bold active:scale-95"
                    >
                      Load Token Prices
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
