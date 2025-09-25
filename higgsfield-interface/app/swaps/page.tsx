"use client";

import { useState, useEffect, useCallback } from "react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import debounce from "lodash/debounce";

// Extend Window interface for Aptos wallet
declare global {
  interface Window {
    aptos?: any;
  }
}

// ===== CONFIGURATION =====
// Initialize Aptos client for devnet
const config = new AptosConfig({ network: Network.DEVNET });
const aptos = new Aptos(config);

// TODO: Replace these placeholders with actual devnet deployed addresses
const ROUTER_ADDRESS = "0xaf230e3024e92da6a3a15f5a6a3f201c886891268717bf8a21157bb73a1c027b"; // PLACEHOLDER - Replace with the actual address where higgs::router module is deployed on devnet

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
const APTOS_FULLNODE_URL = "https://fullnode.devnet.aptoslabs.com/v1";

const BOSON_TOKEN = {
  name: "BOSON",
  type: "0xaf230e3024e92da6a3a15f5a6a3f201c886891268717bf8a21157bb73a1c027b::Boson::Boson",
  priceUSD: 1.00 // Base price: 1 BOSON = $1 USD
};

const CRICKET_TOKENS = {
  ABHISHEK: {
    name: "ABHISHEK",
    displayName: "Abhishek Sharma",
    type: "0xaf230e3024e92da6a3a15f5a6a3f201c886891268717bf8a21157bb73a1c027b::AbhishekSharma::AbhishekSharma"
  },
  KOHLI: {
  name: "KOHLI", 
    displayName: "Virat Kohli", 
    type: "0xaf230e3024e92da6a3a15f5a6a3f201c886891268717bf8a21157bb73a1c027b::ViratKohli::ViratKohli"
  },
  BEN_STOKES: {
    name: "BEN_STOKES",
    displayName: "Ben Stokes",
    type: "0xaf230e3024e92da6a3a15f5a6a3f201c886891268717bf8a21157bb73a1c027b::BenStokes::BenStokes"
  },
  TRAVIS_HEAD: {
    name: "TRAVIS_HEAD", 
    displayName: "Travis Head",
    type: "0xaf230e3024e92da6a3a15f5a6a3f201c886891268717bf8a21157bb73a1c027b::TravisHead::TravisHead"
  },
  GLEN_MAXWELL: {
    name: "GLEN_MAXWELL",
    displayName: "Glen Maxwell",
    type: "0xaf230e3024e92da6a3a15f5a6a3f201c886891268717bf8a21157bb73a1c027b::GlenMaxwell::GlenMaxwell"
  },
  HARDIK_PANDYA: {
    name: "HARDIK_PANDYA",
    displayName: "Hardik Pandya", 
    type: "0xaf230e3024e92da6a3a15f5a6a3f201c886891268717bf8a21157bb73a1c027b::HardikPandya::HardikPandya"
  },
  SHUBHMAN_GILL: {
    name: "SHUBHMAN_GILL",
    displayName: "Shubhman Gill",
    type: "0xaf230e3024e92da6a3a15f5a6a3f201c886891268717bf8a21157bb73a1c027b::ShubhmanGill::ShubhmanGill"
  },
  KANE_WILLIAMSON: {
    name: "KANE_WILLIAMSON",
    displayName: "Kane Williamson",
    type: "0xaf230e3024e92da6a3a15f5a6a3f201c886891268717bf8a21157bb73a1c027b::KaneWilliamson::KaneWilliamson"
  },
  JASPRIT_BUMRAH: {
    name: "JASPRIT_BUMRAH",
    displayName: "Jasprit Bumrah",
    type: "0xaf230e3024e92da6a3a15f5a6a3f201c886891268717bf8a21157bb73a1c027b::JaspreetBumhrah::JaspreetBumhrah"
  },
  SURYAKUMAR_YADAV: {
    name: "SURYAKUMAR_YADAV", 
    displayName: "Suryakumar Yadav",
    type: "0xaf230e3024e92da6a3a15f5a6a3f201c886891268717bf8a21157bb73a1c027b::SuryakumarYadav::SuryakumarYadav"
  },
  SHUBHAM_DUBE: {
    name: "SHUBHAM_DUBE",
    displayName: "Shubham Dube", 
    type: "0xaf230e3024e92da6a3a15f5a6a3f201c886891268717bf8a21157bb73a1c027b::ShubhamDube::ShubhamDube"
  }
};

// For backward compatibility
const KOHLI_TOKEN = CRICKET_TOKENS.KOHLI;
const ABHISHEK_SHARMA_TOKEN = CRICKET_TOKENS.ABHISHEK;

// Token decimals - assuming 8 decimals for both tokens
const TOKEN_DECIMALS = 8;
const DECIMAL_MULTIPLIER = Math.pow(10, TOKEN_DECIMALS);

// Slippage tolerance (99.5% = 0.5% slippage)
const SLIPPAGE_TOLERANCE = 0.995;

export default function SwapsPage() {
  // UI State
  const [payAmount, setPayAmount] = useState("");
  const [receiveAmount, setReceiveAmount] = useState("");
  const [isSwapped, setIsSwapped] = useState(false);
  
  // Web3 State
  const [account, setAccount] = useState<any>(null);
  const [balances, setBalances] = useState({
    boson: 0,
    kohli: 0,
    abhishek: 0
  });
  const [balanceErrors, setBalanceErrors] = useState({
    boson: null as string | null,
    kohli: null as string | null,
    abhishek: null as string | null
  });
  const [isLoading, setIsLoading] = useState({
    balance: false,
    quote: false,
    swap: false,
    price: false
  });
  const [tokenPrices, setTokenPrices] = useState({
    allReserves: [] as any[],
    cricketTokenPrices: {} as Record<string, number>,
    lastUpdated: null as Date | null
  });

  // Get current token configuration based on swap state
  const getCurrentTokens = () => {
    if (isSwapped) {
      return {
        from: BOSON_TOKEN,
        to: CRICKET_TOKENS.ABHISHEK,
        fromBalance: balances.boson,
        toBalance: balances.abhishek || 0
      };
    } else {
      return {
        from: CRICKET_TOKENS.ABHISHEK,
        to: BOSON_TOKEN,
        fromBalance: balances.abhishek || 0,
        toBalance: balances.boson
      };
    }
  };

  // ===== WEB3 FUNCTIONS =====
  
  // Connect to Aptos wallet (like Petra)
  const connectWallet = async () => {
    try {
      if (!window.aptos) {
        alert("Please install Petra wallet or another Aptos wallet extension");
        return;
      }
      
      const response = await window.aptos.connect();
      setAccount(response);
      console.log("Connected account:", response);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      alert("Failed to connect wallet. Please try again.");
    }
  };

  // Disconnect from Aptos wallet
  const disconnectWallet = async () => {
    try {
      if (window.aptos && window.aptos.disconnect) {
        await window.aptos.disconnect();
      }
      
      // Clear local state
      setAccount(null);
      setBalances({ boson: 0, kohli: 0, abhishek: 0 });
      setPayAmount("");
      setReceiveAmount("");
      
      console.log("Wallet disconnected");
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
      // Still clear local state even if disconnect call fails
      setAccount(null);
      setBalances({ boson: 0, kohli: 0, abhishek: 0 });
      setPayAmount("");
      setReceiveAmount("");
    }
  };

  // Calculate token price using liquidity pool formula
  // Formula: P_x = (R_y × P_y) / R_x
  // Where P_x is price of token X, R_x is reserve of token X, R_y is reserve of token Y, P_y is price of token Y
  const calculateTokenPrice = (reserveX: string, reserveY: string, basePriceY: number = 1.0) => {
    const rx = Number(reserveX) / DECIMAL_MULTIPLIER; // Convert from raw units
    const ry = Number(reserveY) / DECIMAL_MULTIPLIER; // Convert from raw units
    
    if (rx === 0 || ry === 0) return null;
    
    // P_x = (R_y × P_y) / R_x
    const priceX = (ry * basePriceY) / rx;
    
    return {
      priceUSD: priceX,
      reserveX: rx,
      reserveY: ry,
      priceInBoson: ry / rx, // How many BOSON per token
      bosonPriceInToken: rx / ry, // How many tokens per BOSON
    };
  };

  // Fetch all token pair reserves from the API
  const fetchAllTokenPrices = async () => {
    setIsLoading(prev => ({ ...prev, price: true }));
    
    try {
      console.log("🔍 === FETCHING ALL TOKEN RESERVES ===");
      
      // Fetch all resources with TokenPairReserve
      const url = `${APTOS_FULLNODE_URL}/accounts/${ROUTER_ADDRESS}/resources`;
      
      console.log("📊 API request:", { url, routerAddress: ROUTER_ADDRESS });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const allResources = await response.json();
      
      // Filter for TokenPairReserve resources
      const reserveResources = allResources.filter((resource: any) => 
        resource.type.includes('TokenPairReserve')
      );
      
      console.log("✅ Found TokenPairReserve resources:", reserveResources.length);
      
      // Calculate prices for all cricket tokens
      const cricketTokenPrices: Record<string, number> = {};
      const processedReserves: any[] = [];
      
      reserveResources.forEach((resource: any) => {
        try {
          const typeString = resource.type;
          const { reserve_x, reserve_y, block_timestamp_last } = resource.data;
          
          // Extract token types from the type string
          const tokenMatch = typeString.match(/TokenPairReserve<([^,]+),\s*([^>]+)>/);
          if (!tokenMatch) return;
          
          const [, token1Type, token2Type] = tokenMatch;
          const token1Name = token1Type.split('::').pop() || '';
          const token2Name = token2Type.split('::').pop() || '';
          
          console.log(`📊 Processing pair: ${token1Name} / ${token2Name}`, {
            reserve_x,
            reserve_y,
            timestamp: block_timestamp_last
          });
          
          // Determine which token is BOSON and which is the cricket player
          let cricketTokenName = '';
          let cricketTokenReserve = '';
          let bosonReserve = '';
          let cricketTokenType = '';
          
          if (token1Name === 'Boson') {
            cricketTokenName = token2Name;
            cricketTokenType = token2Type;
            bosonReserve = reserve_x;
            cricketTokenReserve = reserve_y;
          } else if (token2Name === 'Boson') {
            cricketTokenName = token1Name;
            cricketTokenType = token1Type;
            bosonReserve = reserve_y;
            cricketTokenReserve = reserve_x;
          } else {
            // Skip pairs that don't include BOSON
            return;
          }
          
          // Calculate price using the liquidity pool formula
          const priceData = calculateTokenPrice(cricketTokenReserve, bosonReserve, BOSON_TOKEN.priceUSD);
          
          // Skip if calculation failed
          if (priceData === null) {
            console.warn(`⚠️ Skipping ${cricketTokenName}: Invalid reserves`);
            return;
          }
          
          cricketTokenPrices[cricketTokenName] = priceData.priceUSD;
          
          // Store processed reserve data
          processedReserves.push({
            cricketToken: cricketTokenName,
            cricketTokenType,
            bosonReserve: Number(bosonReserve) / DECIMAL_MULTIPLIER,
            cricketReserve: Number(cricketTokenReserve) / DECIMAL_MULTIPLIER,
            priceUSD: priceData.priceUSD,
            priceInBoson: priceData.priceInBoson,
            bosonPriceInToken: priceData.bosonPriceInToken,
            lastUpdated: block_timestamp_last,
            rawData: resource.data
          });
          
          console.log(`💰 ${cricketTokenName} Price: $${priceData.priceUSD.toFixed(6)} USD`);
          
        } catch (error) {
          console.error("❌ Error processing reserve:", error, resource);
        }
      });
      
      setTokenPrices({
        allReserves: processedReserves,
        cricketTokenPrices,
        lastUpdated: new Date()
      });
      
      console.log("✅ === ALL TOKEN PRICES CALCULATED ===");
      console.log("📊 Cricket token prices:", cricketTokenPrices);
      
      return { reserves: processedReserves, prices: cricketTokenPrices };
      
    } catch (error) {
      console.error("❌ Failed to fetch token reserves:", error);
      console.error("This might mean:");
      console.error("  1. The router contract doesn't exist at this address");
      console.error("  2. No liquidity pools have been created yet");
      console.error("  3. Network connectivity issues");
      
      // Don't throw error to prevent UI breaking
      setTokenPrices({
        allReserves: [],
        cricketTokenPrices: {},
        lastUpdated: new Date()
      });
    } finally {
      setIsLoading(prev => ({ ...prev, price: false }));
    }
  };

  // For backward compatibility
  const fetchTokenPairPrice = fetchAllTokenPrices;

  // Fetch on-chain token balances
  const fetchBalances = async () => {
    if (!account?.address) {
      console.warn("❌ Cannot fetch balances: No account connected");
      return;
    }
    
    setIsLoading(prev => ({ ...prev, balance: true }));
    
    // Reset previous errors
    setBalanceErrors({
      boson: null,
      kohli: null,
      abhishek: null
    });
    
    try {
      console.log("🔍 === FETCHING BALANCES FOR ACCOUNT ===");
      console.log("👤 Account address:", account.address);
      console.log("🌐 Network:", "Aptos Devnet");
      console.log("📦 Using Aptos SDK version:", "Latest");
      
      // Initialize balances and errors
      let bosonBalance = 0;
      let kohliBalance = 0;
      let abhishekBalance = 0;
      const errors: any = {};
      
      // Fetch BOSON balance
      console.log("\n💰 === FETCHING BOSON BALANCE ===");
      console.log("🔧 BOSON token type:", BOSON_TOKEN.type);
      try {
        const bosonBalanceRaw = await aptos.getAccountCoinAmount({
          accountAddress: account.address,
          coinType: BOSON_TOKEN.type as `${string}::${string}::${string}`
        });
        bosonBalance = bosonBalanceRaw / DECIMAL_MULTIPLIER;
        console.log("✅ BOSON balance SUCCESS:");
        console.log("   Raw balance:", bosonBalanceRaw);
        console.log("   Formatted balance:", bosonBalance);
        console.log("   Decimals used:", TOKEN_DECIMALS);
      } catch (bosonError: any) {
        const errorMsg = bosonError?.message || bosonError?.toString() || "Unknown error";
        errors.boson = errorMsg;
        console.error("❌ BOSON balance fetch FAILED:");
        console.error("   Error message:", errorMsg);
        console.error("   Error code:", bosonError?.code);
        console.error("   Error status:", bosonError?.status);
        console.error("   Full error:", bosonError);
        
        // Check for specific error types
        if (errorMsg.includes("not found") || errorMsg.includes("does not exist")) {
          console.log("🔍 This likely means the account has never received BOSON tokens");
        } else if (errorMsg.includes("resource not found")) {
          console.log("🔍 This likely means the BOSON token type doesn't exist or is incorrect");
        } else if (errorMsg.includes("network")) {
          console.log("🔍 This likely means a network connectivity issue");
        }
      }
      
      // Fetch KOHLI token balance  
      console.log("\n🏏 === FETCHING KOHLI BALANCE ===");
      console.log("🔧 KOHLI token type:", KOHLI_TOKEN.type);
      try {
        const kohliBalanceRaw = await aptos.getAccountCoinAmount({
          accountAddress: account.address,
          coinType: KOHLI_TOKEN.type as `${string}::${string}::${string}`
        });
        kohliBalance = kohliBalanceRaw / DECIMAL_MULTIPLIER;
        console.log("✅ KOHLI balance SUCCESS:");
        console.log("   Raw balance:", kohliBalanceRaw);
        console.log("   Formatted balance:", kohliBalance);
      } catch (kohliError: any) {
        const errorMsg = kohliError?.message || kohliError?.toString() || "Unknown error";
        errors.kohli = errorMsg;
        console.error("❌ KOHLI balance fetch FAILED:");
        console.error("   Error:", errorMsg);
        console.error("   Full error:", kohliError);
      }
      
      // Fetch AbhishekSharma token balance
      console.log("\n🏏 === FETCHING ABHISHEK BALANCE ===");
      console.log("🔧 ABHISHEK token type:", ABHISHEK_SHARMA_TOKEN.type);
      try {
        const abhishekBalanceRaw = await aptos.getAccountCoinAmount({
          accountAddress: account.address,
          coinType: ABHISHEK_SHARMA_TOKEN.type as `${string}::${string}::${string}`
        });
        abhishekBalance = abhishekBalanceRaw / DECIMAL_MULTIPLIER;
        console.log("✅ ABHISHEK balance SUCCESS:");
        console.log("   Raw balance:", abhishekBalanceRaw);
        console.log("   Formatted balance:", abhishekBalance);
      } catch (abhishekError: any) {
        const errorMsg = abhishekError?.message || abhishekError?.toString() || "Unknown error";
        errors.abhishek = errorMsg;
        console.error("❌ ABHISHEK balance fetch FAILED:");
        console.error("   Error:", errorMsg);
        console.error("   Full error:", abhishekError);
      }
      
      const newBalances = {
        boson: bosonBalance,
        kohli: kohliBalance,
        abhishek: abhishekBalance
      };
      
      console.log("\n✅ === BALANCE FETCH COMPLETE ===");
      console.log("📊 Final balances:", newBalances);
      console.log("🔍 Balance summary:");
      console.log(`   BOSON: ${bosonBalance} (${bosonBalance > 0 ? 'HAS BALANCE' : 'ZERO BALANCE'})`);
      console.log(`   KOHLI: ${kohliBalance} (${kohliBalance > 0 ? 'HAS BALANCE' : 'ZERO BALANCE'})`);
      console.log(`   ABHISHEK: ${abhishekBalance} (${abhishekBalance > 0 ? 'HAS BALANCE' : 'ZERO BALANCE'})`);
      
      // Update state
      setBalances(newBalances);
      setBalanceErrors(errors);
      
      // Check if user has any tokens
      const hasAnyTokens = bosonBalance > 0 || kohliBalance > 0 || abhishekBalance > 0;
      if (!hasAnyTokens) {
        console.warn("⚠️ Account has no token balances");
        console.log("💡 If you believe you should have tokens, check:");
        console.log("   1. You're connected to the correct wallet");
        console.log("   2. You're on the correct network (Aptos Devnet)");
        console.log("   3. The token contracts are deployed at the expected addresses");
        console.log("   4. Your wallet actually received the tokens");
      }
      
    } catch (error) {
      console.error("❌ Failed to fetch balances:", error);
      console.error("Error details:", {
        message: (error as Error)?.message,
        stack: (error as Error)?.stack,
        account: account?.address,
        tokenTypes: {
          boson: BOSON_TOKEN.type,
          kohli: KOHLI_TOKEN.type,
          abhishek: ABHISHEK_SHARMA_TOKEN.type
        }
      });
      // Don't show alert for balance errors as they might be expected (no tokens)
    } finally {
      setIsLoading(prev => ({ ...prev, balance: false }));
    }
  };

  // Calculate quote using live pricing data from API
  const fetchQuote = async (inputAmount: string) => {
    if (!inputAmount || Number(inputAmount) <= 0) {
      setReceiveAmount("");
      return;
    }
  
    setIsLoading(prev => ({ ...prev, quote: true }));
    
    try {
      const tokens = getCurrentTokens();
      
      console.log("🔍 === CALCULATING QUOTE USING LIVE PRICING ===");
      console.log("📊 Quote request details:", {
        inputAmount,
        fromToken: tokens.from.name,
        toToken: tokens.to.name,
        fromTokenType: tokens.from.type,
        toTokenType: tokens.to.type,
        availableReserves: tokenPrices.allReserves.length,
        availablePrices: Object.keys(tokenPrices.cricketTokenPrices),
        isSwapped: isSwapped
      });
      
      // Enhanced debugging for pricing data
      console.log("🔧 Available token reserves:", tokenPrices.allReserves.map(r => ({
        token: r.cricketToken,
        priceUSD: r.priceUSD,
        priceInBoson: r.priceInBoson,
        bosonPriceInToken: r.bosonPriceInToken,
        cricketReserve: r.cricketReserve,
        bosonReserve: r.bosonReserve
      })));
      
      if (tokenPrices.allReserves.length === 0) {
        console.log("⚠️ No pricing data available, fetching...");
        await fetchAllTokenPrices();
        // Re-check after fetching
        if (tokenPrices.allReserves.length === 0) {
          console.error("❌ Still no pricing data after fetch");
          setReceiveAmount("0");
          return;
        }
      }
      
      let outputAmount = 0;
      const fromTokenName = tokens.from.name;
      const toTokenName = tokens.to.name;
      
      console.log("🧮 Calculating quote for:", `${fromTokenName} → ${toTokenName}`);
      
      if (fromTokenName === "BOSON" && toTokenName !== "BOSON") {
        // Swapping BOSON for cricket token
        console.log("💰 Case: BOSON → Cricket token");
        const toReserve = tokenPrices.allReserves.find(r => r.cricketToken === toTokenName);
        console.log("🔍 Looking for reserve data for:", toTokenName);
        console.log("📊 Found reserve:", toReserve);
        
        if (toReserve) {
          outputAmount = Number(inputAmount) * toReserve.bosonPriceInToken;
          console.log("✅ BOSON → Cricket token calculation:", {
            inputAmount,
            inputAmountNumber: Number(inputAmount),
            rate: toReserve.bosonPriceInToken,
            outputAmount,
            formula: `${inputAmount} BOSON × ${toReserve.bosonPriceInToken} = ${outputAmount} ${toTokenName}`
          });
        } else {
          console.warn("⚠️ No reserve data found for token:", toTokenName);
        }
      } else if (toTokenName === "BOSON" && fromTokenName !== "BOSON") {
        // Swapping cricket token for BOSON
        console.log("🏏 Case: Cricket token → BOSON");
        const fromReserve = tokenPrices.allReserves.find(r => r.cricketToken === fromTokenName);
        console.log("🔍 Looking for reserve data for:", fromTokenName);
        console.log("📊 Found reserve:", fromReserve);
        
        if (fromReserve) {
          outputAmount = Number(inputAmount) * fromReserve.priceInBoson;
          console.log("✅ Cricket token → BOSON calculation:", {
            inputAmount,
            inputAmountNumber: Number(inputAmount),
            rate: fromReserve.priceInBoson,
            outputAmount,
            formula: `${inputAmount} ${fromTokenName} × ${fromReserve.priceInBoson} = ${outputAmount} BOSON`
          });
        } else {
          console.warn("⚠️ No reserve data found for token:", fromTokenName);
        }
      } else if (fromTokenName !== "BOSON" && toTokenName !== "BOSON") {
        // Swapping cricket token for cricket token (through BOSON)
        console.log("🔄 Case: Cricket token → Cricket token (via BOSON)");
        const fromReserve = tokenPrices.allReserves.find(r => r.cricketToken === fromTokenName);
        const toReserve = tokenPrices.allReserves.find(r => r.cricketToken === toTokenName);
        
        console.log("🔍 Looking for reserve data:");
        console.log("   From token:", fromTokenName, "→", fromReserve);
        console.log("   To token:", toTokenName, "→", toReserve);
        
        if (fromReserve && toReserve) {
          // Convert: fromToken → BOSON → toToken
          const bosonAmount = Number(inputAmount) * fromReserve.priceInBoson;
          outputAmount = bosonAmount * toReserve.bosonPriceInToken;
          console.log("✅ Cricket token → Cricket token calculation:", {
        inputAmount,
            inputAmountNumber: Number(inputAmount),
            fromToken: fromTokenName,
            toToken: toTokenName,
            bosonAmount,
            outputAmount,
            step1Rate: fromReserve.priceInBoson,
            step2Rate: toReserve.bosonPriceInToken,
            step1: `${inputAmount} ${fromTokenName} × ${fromReserve.priceInBoson} = ${bosonAmount} BOSON`,
            step2: `${bosonAmount} BOSON × ${toReserve.bosonPriceInToken} = ${outputAmount} ${toTokenName}`
          });
        } else {
          console.warn("⚠️ Missing reserve data:");
          console.warn("   From token reserve:", fromReserve ? "Found" : "Missing");
          console.warn("   To token reserve:", toReserve ? "Found" : "Missing");
        }
      } else {
        console.warn("⚠️ Unsupported swap case:", `${fromTokenName} → ${toTokenName}`);
      }
      
      if (outputAmount > 0) {
        const outputAmountStr = outputAmount.toString();
        setReceiveAmount(outputAmountStr);
        
        console.log("✅ === QUOTE CALCULATION COMPLETE ===");
        console.log("📊 Final result:", {
          input: `${inputAmount} ${fromTokenName}`,
          output: `${outputAmountStr} ${toTokenName}`,
          outputNumber: outputAmount,
          usingLivePricingData: true,
          calculationSuccessful: true
        });
      } else {
        console.warn("⚠️ Could not calculate quote - no pricing data found or calculation failed");
        console.warn("🔧 Debug info:", {
          hasReserves: tokenPrices.allReserves.length > 0,
          fromToken: fromTokenName,
          toToken: toTokenName,
          inputAmount,
          reserveCount: tokenPrices.allReserves.length
        });
        setReceiveAmount("0");
      }
      
    } catch (error) {
      console.error("❌ Failed to calculate quote:", error);
      console.error("Error details:", {
        message: (error as Error)?.message,
        stack: (error as Error)?.stack,
        inputAmount,
        tokenPricesState: {
          reserveCount: tokenPrices.allReserves.length,
          priceCount: Object.keys(tokenPrices.cricketTokenPrices).length,
          lastUpdated: tokenPrices.lastUpdated
        }
      });
      setReceiveAmount("0");
    } finally {
      setIsLoading(prev => ({ ...prev, quote: false }));
    }
  };

  // Debounced version of fetchQuote to prevent excessive API calls
  const debouncedFetchQuote = useCallback(
    debounce((inputAmount: string) => fetchQuote(inputAmount), 500),
    [isSwapped, tokenPrices.allReserves, tokenPrices.cricketTokenPrices]
  );

  // Execute the swap transaction using higgs::router
  const handleSwap = async () => {
    if (!account || !payAmount || Number(payAmount) <= 0) {
      alert("Please connect wallet and enter a valid amount");
      return;
    }
  
    const tokens = getCurrentTokens();
    const x_in = Math.floor(Number(payAmount) * DECIMAL_MULTIPLIER);
    const expectedAmountOut = Math.floor(Number(receiveAmount) * DECIMAL_MULTIPLIER);
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
      routerAddress: ROUTER_ADDRESS
    });
  
    // Pre-flight balance check
    if (tokens.fromBalance < Number(payAmount)) {
      alert(`Insufficient ${tokens.from.name} balance. You have ${tokens.fromBalance.toFixed(4)} but are trying to swap ${payAmount}`);
      return;
    }
    
    setIsLoading(prev => ({ ...prev, swap: true }));
  
    try {
      // Check if wallet is available first
      if (!window.aptos) {
        throw new Error("Wallet not found. Please install Petra wallet.");
      }

      // Validate wallet methods exist
      if (typeof window.aptos.signAndSubmitTransaction !== 'function') {
        throw new Error("Wallet does not support required transaction methods. Please update your wallet.");
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
          `${y_min_out} (${Number(y_min_out) / DECIMAL_MULTIPLIER} tokens)`
        ]
      });

      // Test transaction building first
      console.log("🏗️ Testing transaction building...");
      try {
        const testTx = await aptos.transaction.build.simple({
          sender: account.address,
          data: payload
        });
        console.log("✅ Transaction building successful:", testTx);
      } catch (buildError: any) {
        console.error("❌ Transaction building failed:", buildError);
        throw new Error(`Transaction building failed: ${buildError.message}`);
      }

      // Check account info
      console.log("\n💰 === PRE-TRANSACTION CHECKS ===");
      try {
        const accountInfo = await aptos.getAccountInfo({ accountAddress: account.address });
        console.log("👤 Account info:", {
          sequence_number: accountInfo.sequence_number,
          authentication_key: accountInfo.authentication_key
        });
        
        // Check APT balance for gas
        const aptBalance = await aptos.getAccountAPTAmount({ accountAddress: account.address });
        console.log(`⛽ APT balance for gas: ${aptBalance / 100000000} APT`);
        
        if (aptBalance < 1000000) { // Less than 0.01 APT
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
        // Try the primary wallet method
        response = await window.aptos.signAndSubmitTransaction(payload);
        
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
          sender: response.sender || 'N/A',
          sequence_number: response.sequence_number || 'N/A',
          max_gas_amount: response.max_gas_amount || 'N/A',
          gas_unit_price: response.gas_unit_price || 'N/A'
        });
      } catch (txError: any) {
        console.error("❌ Transaction submission failed:", txError);
        console.error("Error details:", {
          message: txError?.message,
          code: txError?.code,
          status: txError?.status,
          data: txError?.data,
          response: txError?.response,
          fullError: txError
        });
        
        // Handle specific wallet errors
        if (txError?.code === 4001) {
          throw new Error("Transaction was rejected by user");
        } else if (txError?.message?.includes("User rejected")) {
          throw new Error("Transaction was rejected by user");
        } else if (txError?.message?.includes("Cannot read properties of undefined")) {
          throw new Error("Wallet response error. Please try again or check your wallet connection.");
        } else {
          throw new Error(`Transaction submission failed: ${txError.message || 'Unknown error'}`);
        }
      }

      // Wait for transaction confirmation
      console.log("\n⏳ === WAITING FOR CONFIRMATION ===");
      console.log("Transaction hash:", response.hash);
      
      let confirmedTx;
      try {
        // Add timeout for transaction confirmation
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Transaction confirmation timeout")), 30000);
        });
        
        const confirmationPromise = aptos.waitForTransaction({ 
          transactionHash: response.hash 
        });
        
        confirmedTx = await Promise.race([confirmationPromise, timeoutPromise]);
        
        // Validate confirmed transaction
        if (!confirmedTx) {
          throw new Error("Confirmed transaction is undefined");
        }
        
        console.log("🎉 Transaction confirmed!");
        console.log("📋 Confirmed transaction:", {
          version: (confirmedTx as any)?.version || 'N/A',
          success: (confirmedTx as any)?.success,
          vm_status: (confirmedTx as any)?.vm_status || 'N/A',
          gas_used: (confirmedTx as any)?.gas_used || 'N/A',
          changes: Array.isArray((confirmedTx as any)?.changes) ? (confirmedTx as any).changes.length : 0
        });
        
      } catch (confirmError: any) {
        console.error("❌ Transaction confirmation failed:", confirmError);
        
        // Still consider it potentially successful if we have a hash
        if (response?.hash) {
          console.log("⚠️ Transaction submitted but confirmation failed. Check transaction manually:", response.hash);
          alert(`Transaction submitted (${response.hash}) but confirmation failed. Please check your wallet or explorer manually.`);
          return; // Exit without throwing error
        }
        
        throw new Error(`Transaction confirmation failed: ${confirmError.message || confirmError}`);
      }

      // Check transaction success
      if (confirmedTx && !(confirmedTx as any)?.success) {
        throw new Error(`Transaction failed on-chain: ${(confirmedTx as any)?.vm_status || 'Unknown VM error'}`);
      }
  
      alert("Swap successful!");
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
      
      if (error?.message?.includes("Cannot read properties of undefined (reading 'map')")) {
        errorMessage += "Wallet response error. Please disconnect and reconnect your wallet, then try again.";
        console.error("🔍 This error suggests the wallet response is malformed. Try refreshing and reconnecting wallet.");
      } else if (error?.message?.includes("Wallet response error")) {
        errorMessage += "Wallet connection issue. Please disconnect and reconnect your wallet.";
        console.error("🔍 Wallet response validation failed");
      } else if (error?.message?.includes("map")) {
        errorMessage += "Response parsing error. Try refreshing the page and reconnecting your wallet.";
        console.error("🔍 The transaction returned unexpected data format");
      } else if (error?.message?.includes("INSUFFICIENT_BALANCE")) {
        errorMessage += "Insufficient token balance.";
      } else if (error?.message?.includes("SLIPPAGE")) {
        errorMessage += "Price changed too much. Try again or increase slippage tolerance.";
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
        cause: error?.cause
      });
      
      alert(errorMessage);
    } finally {
      setIsLoading(prev => ({ ...prev, swap: false }));
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
      
      for (const func of testFunctions) {
        try {
          console.log(`🔍 Testing view function: ${func}`);
          const result = await aptos.view({
            payload: {
              function: func as `${string}::${string}::${string}`,
              typeArguments: [BOSON_TOKEN.type, KOHLI_TOKEN.type],
              functionArguments: [DECIMAL_MULTIPLIER.toString()] // Test with 1 token output
            }
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
            coinType: BOSON_TOKEN.type as `${string}::${string}::${string}`
          });
          console.log(`💰 BOSON balance: ${bosonBalance}`);
        } catch (error) {
          console.log(`❌ BOSON balance check failed:`, (error as Error).message);
        }
        
        try {
          const kohliBalance = await aptos.getAccountCoinAmount({
            accountAddress: account.address,
            coinType: KOHLI_TOKEN.type as `${string}::${string}::${string}`
          });
          console.log(`💰 KOHLI balance: ${kohliBalance}`);
        } catch (error) {
          console.log(`❌ KOHLI balance check failed:`, (error as Error).message);
        }
      }
      
    } catch (error) {
      console.error("❌ Contract test failed:", error);
    }
  };

  // Create liquidity pool if it doesn't exist
  const createPool = async () => {
    if (!account) {
      alert("Please connect wallet first");
      return;
    }

    try {
      console.log("🏗️ Creating liquidity pool...");
      
      const payload = {
        function: `${ROUTER_ADDRESS}::router::create_pair` as `${string}::${string}::${string}`,
        typeArguments: [BOSON_TOKEN.type, KOHLI_TOKEN.type],
        functionArguments: []
      };

      console.log("📦 Create pool payload:", payload);
      
      const response = await window.aptos.signAndSubmitTransaction(payload);
      console.log("⏳ Waiting for pool creation confirmation...", response.hash);
      
      const confirmedTx = await aptos.waitForTransaction({ transactionHash: response.hash });
      console.log("🎉 Pool created successfully!", confirmedTx);
      
      if (confirmedTx.success) {
        alert("Liquidity pool created successfully! You can now add liquidity or swap tokens.");
      } else {
        throw new Error(`Pool creation failed: ${confirmedTx.vm_status}`);
      }
      
    } catch (error: any) {
      console.error("❌ Pool creation failed:", error);
      alert(`Failed to create pool: ${error.message || "Please check console for details"}`);
    }
  };

  // Test swap function specifically
  const testSwapFunction = async () => {
    if (!account) {
      alert("Please connect wallet first");
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
        data: payload
      });
      
      console.log("✅ Transaction building successful:", testTx);
      console.log("🎯 Swap function is working correctly!");
      
      alert("Swap function test passed! The function exists and can build transactions.");
      
    } catch (error: any) {
      console.error("❌ Swap function test failed:", error);
      console.error("Error details:", {
        message: error?.message,
        code: error?.code,
        data: error?.data,
        fullError: error
      });
      
      alert(`Swap function test failed: ${error.message || "Please check console for details"}`);
    }
  };

  // Inspect account resources to see what tokens exist
  const inspectAccountResources = async () => {
    if (!account) {
      alert("Please connect wallet first");
      return;
    }

    try {
      console.log("🔍 === INSPECTING ACCOUNT RESOURCES ===");
      console.log("👤 Account address:", account.address);
      
      // Fetch all account resources
      const url = `https://fullnode.devnet.aptoslabs.com/v1/accounts/${account.address}/resources`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch account resources: ${response.status}`);
      }
      
      const resources = await response.json();
      console.log("📊 Total resources found:", resources.length);
      
      // Filter for coin store resources (token balances)
      const coinStores = resources.filter((resource: any) => 
        resource.type.includes('CoinStore') || resource.type.includes('coin::CoinStore')
      );
      
      console.log("💰 === TOKEN BALANCES FOUND ===");
      console.log("🔍 Found", coinStores.length, "coin stores:");
      
      coinStores.forEach((coinStore: any, index: number) => {
        const balance = coinStore.data?.coin?.value || '0';
        const coinType = coinStore.type.match(/CoinStore<(.+)>/)?.[1] || 'Unknown';
        const formattedBalance = Number(balance) / DECIMAL_MULTIPLIER;
        
        console.log(`${index + 1}. ${coinType}`);
        console.log(`   Raw Balance: ${balance}`);
        console.log(`   Formatted Balance: ${formattedBalance}`);
        console.log(`   Resource Type: ${coinStore.type}`);
        console.log("---");
        
        // Check if this matches our expected tokens
        if (coinType === BOSON_TOKEN.type) {
          console.log("✅ FOUND BOSON TOKEN!");
        } else if (coinType === ABHISHEK_SHARMA_TOKEN.type) {
          console.log("✅ FOUND ABHISHEK TOKEN!");
        } else if (coinType === KOHLI_TOKEN.type) {
          console.log("✅ FOUND KOHLI TOKEN!");
        }
      });
      
      // Also check for APT balance
      const aptStores = coinStores.filter((store: any) => 
        store.type.includes('0x1::aptos_coin::AptosCoin')
      );
      
      if (aptStores.length > 0) {
        const aptBalance = aptStores[0].data?.coin?.value || '0';
        const formattedAptBalance = Number(aptBalance) / 100000000; // APT has 8 decimals
        console.log("💎 APT Balance:", formattedAptBalance, "APT");
      }
      
      // Check what our expected tokens should look like
      console.log("\n🎯 === EXPECTED TOKEN TYPES ===");
      console.log("Expected BOSON:", BOSON_TOKEN.type);
      console.log("Expected ABHISHEK:", ABHISHEK_SHARMA_TOKEN.type);
      console.log("Expected KOHLI:", KOHLI_TOKEN.type);
      
      alert(`Account inspection complete! Found ${coinStores.length} token types. Check console for details.`);
      
    } catch (error: any) {
      console.error("❌ Account inspection failed:", error);
      alert(`Account inspection failed: ${error.message}`);
    }
  };

  const swapTokens = () => {
    // Clear amounts when swapping
    setPayAmount("");
    setReceiveAmount("");
    setIsSwapped(!isSwapped);
  };

  // ===== REACT EFFECTS =====
  
  // Fetch balances when account changes
  useEffect(() => {
    if (account) {
      fetchBalances();
    }
  }, [account]);

  // Fetch token prices on component mount and periodically
  useEffect(() => {
    // Fetch prices immediately
    fetchAllTokenPrices();
    
    // Set up periodic price updates every 30 seconds
    const priceInterval = setInterval(() => {
      fetchAllTokenPrices();
    }, 30000);
    
    return () => clearInterval(priceInterval);
  }, []);

  // Recalculate quote when pricing data becomes available or changes
  useEffect(() => {
    if (payAmount && tokenPrices.allReserves.length > 0) {
      console.log("🔄 Pricing data updated, recalculating quote...");
      fetchQuote(payAmount);
    }
  }, [tokenPrices.allReserves, tokenPrices.cricketTokenPrices, payAmount]);

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
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
          {/* Header */}
        <div className="flex items-center justify-between mb-8">
              <div>
            <h1 className="text-2xl font-bold text-black">Token Swap</h1>
            <p className="text-gray-500 text-sm mt-1">Exchange your tokens instantly with live pricing</p>
              </div>
              
              {/* Wallet Connection */}
              {!account ? (
                <button
                  onClick={connectWallet}
              className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                  Connect Wallet
                </button>
              ) : (
            <div className="flex items-center gap-4">
                <div className="text-right">
                <div className="text-sm font-semibold text-black">
                    {account.address.slice(0, 6)}...{account.address.slice(-4)}
                  </div>
                <div className="text-xs text-gray-500">Aptos Devnet</div>
              </div>
                    <button
                      onClick={disconnectWallet}
                className="text-sm text-red-600 hover:text-red-800 transition-colors font-medium px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50"
                    >
                      Disconnect
                    </button>
                </div>
              )}
            </div>
            
        <div className="flex justify-center">
          {/* Swap Interface */}
          <div className="w-full max-w-md">
            <div className="border border-gray-200 rounded-xl p-6">

              <h2 className="text-xl font-bold text-black mb-6">Swap Tokens</h2>

          {/* You Pay */}
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-600">You Pay</span>
              <div className="flex items-center gap-2">
                      <button onClick={() => setPercent(25)} className="px-3 py-1 bg-black text-white rounded-lg text-xs hover:bg-gray-800 transition-colors">25%</button>
                      <button onClick={() => setPercent(50)} className="px-3 py-1 bg-black text-white rounded-lg text-xs hover:bg-gray-800 transition-colors">50%</button>
                      <button onClick={() => setPercent(100)} className="px-3 py-1 bg-black text-white rounded-lg text-xs hover:bg-gray-800 transition-colors">MAX</button>
              </div>
            </div>
                  
            <div className="flex items-center justify-between mb-4">
              <input
                inputMode="decimal"
                value={payAmount}
                onChange={(e) => handlePayChange(e.target.value)}
                      placeholder="0.00"
                      className="bg-transparent text-3xl font-semibold outline-none placeholder:text-gray-300 flex-1 text-black"
                    />
                    <div className="flex items-center gap-3 ml-4">
                      <div className={`h-8 w-8 rounded-full ${isSwapped ? 'bg-black' : 'bg-gradient-to-r from-blue-500 to-purple-600'} flex items-center justify-center text-white font-bold text-xs`}>
                        {isSwapped ? '🏏' : 'A'}
            </div>
                      <span className="font-bold text-black text-lg">
                        {isSwapped ? 'BOSON' : 'ABHISHEK'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    Balance: {isLoading.balance ? (
                      "Loading..."
                    ) : (
                      `${getCurrentTokens().fromBalance.toFixed(4)} ${isSwapped ? 'BOSON' : 'ABHISHEK'}`
                    )}
            </div>
          </div>

                {/* Swap Button */}
                <div className="flex justify-center">
            <button 
              onClick={swapTokens}
                    className="h-12 w-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-300 hover:bg-gray-50 transition-colors group"
            >
                    <svg className="h-5 w-5 group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
            </button>
          </div>

          {/* You Receive */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-600">You Receive</span>
                    {isLoading.quote && <span className="text-xs text-blue-600 animate-pulse">Calculating...</span>}
            </div>
                  
            <div className="flex items-center justify-between mb-4">
              <input
                inputMode="decimal"
                value={isLoading.quote ? "..." : receiveAmount}
                      placeholder="0.00"
                      className="bg-transparent text-3xl font-semibold outline-none placeholder:text-gray-300 flex-1 text-black"
                readOnly
              />
                    <div className="flex items-center gap-3 ml-4">
                      <div className={`h-8 w-8 rounded-full ${isSwapped ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-black'} flex items-center justify-center text-white font-bold text-xs`}>
                        {isSwapped ? 'A' : '🏏'}
            </div>
                      <span className="font-bold text-black text-lg">
                        {isSwapped ? 'ABHISHEK' : 'BOSON'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    Balance: {isLoading.balance ? (
                "Loading..."
              ) : (
                `${getCurrentTokens().toBalance.toFixed(4)} ${isSwapped ? 'ABHISHEK' : 'BOSON'}`
              )}
                  </div>
            </div>
            
                {/* Swap Button */}
                <button
                  onClick={handleSwap}
                  disabled={!account || !payAmount || Number(payAmount) <= 0 || isLoading.swap}
                  className={`w-full py-4 text-lg font-semibold rounded-xl transition-colors ${
                    account && payAmount && Number(payAmount) > 0 && !isLoading.swap
                      ? "bg-black text-white hover:bg-gray-800"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {!account 
                    ? "Connect Wallet" 
                    : isLoading.swap 
                      ? "Swapping..." 
                      : payAmount && Number(payAmount) > 0 
                        ? "Swap Tokens" 
                        : "Enter Amount"
                  }
                </button>
          </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

