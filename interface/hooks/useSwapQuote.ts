import { useState, useCallback } from "react";
import { Aptos, AptosConfig } from "@aptos-labs/ts-sdk";
import debounce from "lodash/debounce";
import { NETWORK, ROUTER_ADDRESS, DECIMAL_MULTIPLIER } from "@/lib/constants";

const config = new AptosConfig({ network: NETWORK });
const aptos = new Aptos(config);

export function useSwapQuote(
  fromTokenType: string,
  toTokenType: string,
  tokenPrices: any
) {
  const [receiveAmount, setReceiveAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchQuote = async (inputAmount: string, fromType: string, toType: string) => {
    if (!inputAmount || Number(inputAmount) <= 0) {
      setReceiveAmount("");
      return;
    }

    setLoading(true);

    try {
      const amountIn = Math.floor(Number(inputAmount) * DECIMAL_MULTIPLIER);
      const oneTokenOut = DECIMAL_MULTIPLIER;
      const getAmountInFunction = `${ROUTER_ADDRESS}::router::get_amount_in`;

      const amountInForOneOut = await aptos.view({
        payload: {
          function: getAmountInFunction as `${string}::${string}::${string}`,
          typeArguments: [fromType, toType],
          functionArguments: [oneTokenOut.toString()],
        },
      });

      if (!Array.isArray(amountInForOneOut) || amountInForOneOut.length === 0) {
        throw new Error("Invalid response from get_amount_in function");
      }

      const inputNeededForOneOutput = Number(amountInForOneOut[0]);
      const exchangeRate = DECIMAL_MULTIPLIER / inputNeededForOneOutput;
      const amountOut = Math.floor(amountIn * exchangeRate);

      setReceiveAmount((amountOut / DECIMAL_MULTIPLIER).toString());
    } catch (error) {
      console.error("❌ Failed to fetch quote:", error);

      // Fallback to price calculation if available
      if (tokenPrices?.current?.reserves) {
        try {
          let fallbackOutput = 0;
          const fromName = fromType.split("::").pop();

          if (fromName !== "Boson") {
            // Converting Player -> BOSON: multiply by BOSON per Player
            fallbackOutput = Number(inputAmount) * tokenPrices.current.reserves.playerPriceInBoson;
          } else {
            // Converting BOSON -> Player: multiply by Player per BOSON
            fallbackOutput = Number(inputAmount) * tokenPrices.current.reserves.bosonPriceInPlayer;
          }

          setReceiveAmount(fallbackOutput.toString());
        } catch (fallbackError) {
          console.error("❌ Fallback calculation also failed:", fallbackError);
          setReceiveAmount("0");
        }
      } else {
        setReceiveAmount("0");
      }
    } finally {
      setLoading(false);
    }
  };

  const debouncedFetchQuote = useCallback(
    debounce(
      (inputAmount: string, fromType: string, toType: string) =>
        fetchQuote(inputAmount, fromType, toType),
      500
    ),
    [tokenPrices]
  );

  return {
    receiveAmount,
    loading,
    fetchQuote: debouncedFetchQuote,
    setReceiveAmount,
  };
}

