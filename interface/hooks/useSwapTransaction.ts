import { useState } from "react";
import { Aptos, AptosConfig } from "@aptos-labs/ts-sdk";
import toast from "react-hot-toast";
import { NETWORK, ROUTER_ADDRESS, DECIMAL_MULTIPLIER, SLIPPAGE_TOLERANCE } from "@/lib/constants";

const config = new AptosConfig({ network: NETWORK });
const aptos = new Aptos(config);

declare global {
  interface Window {
    aptos?: any;
  }
}

export function useSwapTransaction() {
  const [loading, setLoading] = useState(false);

  const executeSwap = async (
    account: any,
    payAmount: string,
    receiveAmount: string,
    fromTokenType: string,
    toTokenType: string,
    fromTokenName: string,
    fromBalance: number
  ) => {
    if (!account || !payAmount || Number(payAmount) <= 0) {
      toast.error("Please connect wallet and enter a valid amount");
      return { success: false };
    }

    const x_in = Math.floor(Number(payAmount) * DECIMAL_MULTIPLIER);
    const expectedAmountOut = Math.floor(Number(receiveAmount) * DECIMAL_MULTIPLIER);
    const y_min_out = Math.floor(expectedAmountOut * SLIPPAGE_TOLERANCE);

    if (fromBalance < Number(payAmount)) {
      toast.error(
        `Insufficient ${fromTokenName} balance. You have ${fromBalance.toFixed(4)} but are trying to swap ${payAmount}`
      );
      return { success: false };
    }

    setLoading(true);

    try {
      if (!window.aptos) throw new Error("Wallet not found. Please install Petra wallet.");
      if (typeof window.aptos.signAndSubmitTransaction !== "function") {
        throw new Error("Wallet does not support required transaction methods. Please update your wallet.");
      }
      if (!account?.address) throw new Error("Wallet not connected. Please reconnect your wallet.");

      const swapFunction = `${ROUTER_ADDRESS}::router::swap_exact_input`;
      const payload = {
        function: swapFunction as `${string}::${string}::${string}`,
        typeArguments: [fromTokenType, toTokenType],
        functionArguments: [x_in.toString(), y_min_out.toString()],
      };

      // Test transaction building
      await aptos.transaction.build.simple({
        sender: account.address,
        data: payload,
      });

      // Submit transaction
      const response = await window.aptos.signAndSubmitTransaction({
        type: "entry_function_payload",
        function: payload.function,
        type_arguments: payload.typeArguments,
        arguments: payload.functionArguments,
      });

      if (!response?.hash) throw new Error("Transaction response missing hash");

      // Wait for confirmation
      const confirmedTx = await aptos.waitForTransaction({ transactionHash: response.hash });
      
      if (confirmedTx && !(confirmedTx as any)?.success) {
        throw new Error(`Transaction failed on-chain: ${(confirmedTx as any)?.vm_status || "Unknown VM error"}`);
      }

      toast.success("Swap successful! 🎉");
      return { success: true };
    } catch (error: any) {
      console.error("❌ === SWAP FAILED ===", error);
      let errorMessage = "Swap failed. ";
      
      if (error?.message?.includes("User rejected")) {
        errorMessage += "Transaction was rejected.";
      } else if (error?.message?.includes("INSUFFICIENT_BALANCE")) {
        errorMessage += "Insufficient token balance.";
      } else if (error?.code === 4001) {
        errorMessage += "Transaction was rejected by user.";
      } else {
        errorMessage += `Error: ${error?.message || "Unknown error"}`;
      }

      toast.error(errorMessage);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return { executeSwap, loading };
}

