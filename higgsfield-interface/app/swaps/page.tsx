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

  // Web3 State
  const [balances, setBalances] = useState({
    boson: 0,
    kohli: 0,
    abhishek: 0,
  });
  const [isLoading, setIsLoading] = useState({
    balance: false,
    quote: false,
    swap: false,
    price: false,
  });
  const [tokenPrices, setTokenPrices] = useState({
    abhishekBoson: null as any,
    lastUpdated: null as Date | null,
  });

  // Get current token configuration based on swap state
  const getCurrentTokens = () => {
    if (isSwapped) {
      return {
        from: BOSON_TOKEN,
        to: ABHISHEK_SHARMA_TOKEN,
        fromBalance: balances.boson,
        toBalance: balances.abhishek || 0,
      };
    } else {
      return {
        from: ABHISHEK_SHARMA_TOKEN,
        to: BOSON_TOKEN,
        fromBalance: balances.abhishek || 0,
        toBalance: balances.boson,
      };
    }
  };

  // ===== WEB3 FUNCTIONS =====

  // Fetch token pair price from Aptos fullnode API
  const fetchTokenPairPrice = async (tokenA?: string, tokenB?: string) => {
    setIsLoading((prev) => ({ ...prev, price: true }));

    try {
      // Use provided tokens or default to ABHISHEK/BOSON pair
      const token1 = tokenA || ABHISHEK_SHARMA_TOKEN.type;
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
        abhishekBoson: priceInfo,
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
        abhishekBoson: null,
        lastUpdated: new Date(),
      });
    } finally {
      setIsLoading((prev) => ({ ...prev, price: false }));
    }
  };

  // Fetch on-chain token balances
  const fetchBalances = async () => {
    if (!account?.address) return;

    setIsLoading((prev) => ({ ...prev, balance: true }));

    try {
      // Fetch BOSON balance
      const bosonBalance = await aptos.getAccountCoinAmount({
        accountAddress: account.address,
        coinType: BOSON_TOKEN.type as `${string}::${string}::${string}`,
      });

      // Fetch KOHLI token balance
      const kohliBalance = await aptos.getAccountCoinAmount({
        accountAddress: account.address,
        coinType: KOHLI_TOKEN.type as `${string}::${string}::${string}`,
      });

      // Fetch AbhishekSharma token balance
      const abhishekBalance = await aptos.getAccountCoinAmount({
        accountAddress: account.address,
        coinType:
          ABHISHEK_SHARMA_TOKEN.type as `${string}::${string}::${string}`,
      });

      setBalances({
        boson: bosonBalance / DECIMAL_MULTIPLIER,
        kohli: kohliBalance / DECIMAL_MULTIPLIER,
        abhishek: abhishekBalance / DECIMAL_MULTIPLIER,
      });
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
      if (tokenPrices.abhishekBoson?.reserves) {
        const apiRatio = tokenPrices.abhishekBoson.reserves.ratio;
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
      if (tokenPrices.abhishekBoson?.reserves) {
        console.log(
          "🔄 Attempting fallback calculation using API price data..."
        );
        try {
          const tokens = getCurrentTokens();
          let fallbackOutput = 0;

          // Calculate based on which direction we're swapping
          if (
            tokens.from.name === "ABHISHEK" ||
            tokens.from.type.includes("AbhishekSharma")
          ) {
            // Swapping AbhishekSharma for Boson
            // Use the calculated exchange rate: AbhishekSharma -> Boson
            fallbackOutput =
              Number(inputAmount) *
              tokenPrices.abhishekBoson.reserves.abhishekPriceInBoson;
          } else {
            // Swapping Boson for AbhishekSharma
            // Use the inverse rate: Boson -> AbhishekSharma
            fallbackOutput =
              Number(inputAmount) *
              tokenPrices.abhishekBoson.reserves.bosonPriceInAbhishek;
          }

          setReceiveAmount(fallbackOutput.toString());

          console.log(
            "✅ Fallback quote calculated using liquidity pool formula:",
            {
              inputAmount,
              outputAmount: fallbackOutput,
              fromToken: tokens.from.name,
              toToken: tokens.to.name,
              abhishekPriceInBoson:
                tokenPrices.abhishekBoson.reserves.abhishekPriceInBoson,
              bosonPriceInAbhishek:
                tokenPrices.abhishekBoson.reserves.bosonPriceInAbhishek,
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

      for (const func of testFunctions) {
        try {
          console.log(`🔍 Testing view function: ${func}`);
          const result = await aptos.view({
            payload: {
              function: func as `${string}::${string}::${string}`,
              typeArguments: [BOSON_TOKEN.type, KOHLI_TOKEN.type],
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

        try {
          const kohliBalance = await aptos.getAccountCoinAmount({
            accountAddress: account.address,
            coinType: KOHLI_TOKEN.type as `${string}::${string}::${string}`,
          });
          console.log(`💰 KOHLI balance: ${kohliBalance}`);
        } catch (error) {
          console.log(
            `❌ KOHLI balance check failed:`,
            (error as Error).message
          );
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

      const payload = {
        function:
          `${ROUTER_ADDRESS}::router::create_pair` as `${string}::${string}::${string}`,
        typeArguments: [BOSON_TOKEN.type, KOHLI_TOKEN.type],
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

  // Fetch balances when account changes
  useEffect(() => {
    if (account) {
      fetchBalances();
    }
  }, [account]);

  // Fetch token prices on component mount and periodically
  useEffect(() => {
    // Fetch prices immediately
    fetchTokenPairPrice();

    // Set up periodic price updates every 30 seconds
    const priceInterval = setInterval(() => {
      fetchTokenPairPrice();
    }, 30000);

    return () => clearInterval(priceInterval);
  }, []);

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
            <p className="text-gray-500 text-sm mt-1">
              Exchange your tokens instantly with live pricing
            </p>
          </div>

          {/* Wallet Status */}
          {account ? (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-semibold text-black">
                  {account.address.slice(0, 6)}...{account.address.slice(-4)}
                </div>
                <div className="text-xs text-gray-500">Aptos Devnet</div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">Connect your wallet to start swapping</p>
              <p className="text-xs text-gray-400">Use the Connect Wallet button in the navbar</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Left Column - Swap Interface */}
          <div className="col-span-12 lg:col-span-7">
            <div className="border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-bold text-black mb-6">Swap Tokens</h2>

              {/* You Pay */}
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-600">
                      You Pay
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPercent(25)}
                        className="px-3 py-1 bg-black text-white rounded-lg text-xs hover:bg-gray-800 transition-colors"
                      >
                        25%
                      </button>
                      <button
                        onClick={() => setPercent(50)}
                        className="px-3 py-1 bg-black text-white rounded-lg text-xs hover:bg-gray-800 transition-colors"
                      >
                        50%
                      </button>
                      <button
                        onClick={() => setPercent(100)}
                        className="px-3 py-1 bg-black text-white rounded-lg text-xs hover:bg-gray-800 transition-colors"
                      >
                        MAX
                      </button>
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
                      <div
                        className={`h-8 w-8 rounded-full ${
                          isSwapped
                            ? "bg-black"
                            : "bg-gradient-to-r from-blue-500 to-purple-600"
                        }`}
                      />
                      <span className="font-bold text-black text-lg">
                        {getCurrentTokens().from.name}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-500">
                    Balance:{" "}
                    {isLoading.balance
                      ? "Loading..."
                      : `${getCurrentTokens().fromBalance.toFixed(4)} ${
                          getCurrentTokens().from.name
                        }`}
                  </div>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center">
                  <button
                    onClick={swapTokens}
                    className="h-12 w-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-300 hover:bg-gray-50 transition-colors group"
                  >
                    <svg
                      className="h-5 w-5 group-hover:rotate-180 transition-transform duration-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                      />
                    </svg>
                  </button>
                </div>

                {/* You Receive */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-600">
                      You Receive
                    </span>
                    {isLoading.quote && (
                      <span className="text-xs text-blue-600 animate-pulse">
                        Calculating...
                      </span>
                    )}
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
                      <div
                        className={`h-8 w-8 rounded-full ${
                          isSwapped
                            ? "bg-gradient-to-r from-blue-500 to-purple-600"
                            : "bg-black"
                        }`}
                      />
                      <span className="font-bold text-black text-lg">
                        {getCurrentTokens().to.name}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-500">
                    Balance:{" "}
                    {isLoading.balance
                      ? "Loading..."
                      : `${getCurrentTokens().toBalance.toFixed(4)} ${
                          getCurrentTokens().to.name
                        }`}
                  </div>
                </div>

                {/* Swap Button */}
                <button
                  onClick={handleSwap}
                  disabled={
                    !account ||
                    !payAmount ||
                    Number(payAmount) <= 0 ||
                    isLoading.swap
                  }
                  className={`w-full py-4 text-lg font-semibold rounded-xl transition-colors ${
                    account &&
                    payAmount &&
                    Number(payAmount) > 0 &&
                    !isLoading.swap
                      ? "bg-black text-white hover:bg-gray-800"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {!account
                    ? "Connect Wallet First"
                    : isLoading.swap
                    ? "Swapping..."
                    : payAmount && Number(payAmount) > 0
                    ? "Swap Tokens"
                    : "Enter Amount"}
                </button>
              </div>

              {/* Debug Section */}
              
            </div>
          </div>

          {/* Right Column - Live Token Prices */}
          <div className="col-span-12 lg:col-span-5">
            <div className="border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-black">
                  Live Token Prices
                </h2>
                <div className="flex items-center gap-2">
                  {isLoading.price && (
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  )}
                  <span className="text-xs text-gray-500">
                    {tokenPrices.lastUpdated
                      ? `Updated ${tokenPrices.lastUpdated.toLocaleTimeString()}`
                      : isLoading.price
                      ? "Updating..."
                      : "No data"}
                  </span>
                </div>
              </div>

              {isLoading.price ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-gray-50 rounded-lg p-4 animate-pulse"
                    >
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                      <div className="h-6 bg-gray-200 rounded w-2/3" />
                    </div>
                  ))}
                </div>
              ) : tokenPrices.abhishekBoson?.reserves ? (
                <div className="space-y-4">
                  {/* Token Pair Overview */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900">
                        {tokenPrices.abhishekBoson.token1}/
                        {tokenPrices.abhishekBoson.token2} Pair
                      </span>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                        Active
                      </span>
                    </div>
                    <div className="text-xs text-blue-700">
                      Liquidity Pool Status
                    </div>
                  </div>

                  {/* Token Prices */}
                  <div className="space-y-3">
                    <div className="bg-black text-white rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-300">
                            BOSON (BOSON)
                          </div>
                          <div className="text-2xl font-bold">$1.00</div>
                          <div className="text-xs text-gray-400">USD</div>
                        </div>
                        <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center">
                          <span className="text-black font-bold text-sm">
                            B
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-blue-100">
                            ABHISHEK (ABHISHEK)
                          </div>
                          <div className="text-2xl font-bold">
                            $
                            {tokenPrices.abhishekBoson.reserves.abhishekPriceUSD.toFixed(
                              6
                            )}
                          </div>
                          <div className="text-xs text-blue-200">USD</div>
                        </div>
                        <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-sm">
                            A
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Exchange Rates */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Exchange Rates
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">1 ABHISHEK =</span>
                        <span className="font-semibold text-black">
                          {tokenPrices.abhishekBoson.reserves.abhishekPriceInBoson.toFixed(
                            6
                          )}{" "}
                          BOSON
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">1 BOSON =</span>
                        <span className="font-semibold text-black">
                          {tokenPrices.abhishekBoson.reserves.bosonPriceInAbhishek.toFixed(
                            2
                          )}{" "}
                          ABHISHEK
                        </span>
                      </div>
                    </div>
                  </div>

                 

                  {/* Price Details */}
                  {receiveAmount && Number(receiveAmount) > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-green-800 mb-3">
                        💰 Current Trade Value
                      </h3>
                      {getCurrentTokens().to.name === "ABHISHEK" ? (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-green-700">Unit Price:</span>
                            <span className="font-semibold text-green-900">
                              $
                              {tokenPrices.abhishekBoson.reserves.abhishekPriceUSD.toFixed(
                                6
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-green-700">Total Value:</span>
                            <span className="font-semibold text-green-900">
                              $
                              {(
                                Number(receiveAmount) *
                                tokenPrices.abhishekBoson.reserves
                                  .abhishekPriceUSD
                              ).toFixed(4)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-green-700">Unit Price:</span>
                            <span className="font-semibold text-green-900">
                              $1.00
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-green-700">Total Value:</span>
                            <span className="font-semibold text-green-900">
                              ${Number(receiveAmount).toFixed(4)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Refresh Button */}
                  <button
                    onClick={() => fetchTokenPairPrice()}
                    disabled={isLoading.price}
                    className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 font-medium"
                  >
                    {isLoading.price ? "Refreshing..." : "Refresh Prices"}
                  </button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📊</div>
                  <div className="text-gray-500 mb-4">
                    No price data available
                  </div>
                  <button
                    onClick={() => fetchTokenPairPrice()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
  );
}
