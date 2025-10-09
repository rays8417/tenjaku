"use client";

import { useState, useEffect } from "react";
import { useWallet } from "../../contexts/WalletContext";
import SwapCard from "@/components/swaps/SwapCard";
import LivePricesCard from "@/components/swaps/LivePricesCard";
import { useLiquidityPairs } from "@/hooks/useLiquidityPairs";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { useSwapQuote } from "@/hooks/useSwapQuote";
import { useSwapTransaction } from "@/hooks/useSwapTransaction";
import { useTokenPairPrice } from "@/hooks/useTokenPairPrice";
import { BOSON_TOKEN } from "@/lib/constants";

export default function SwapsPage() {
  const { account } = useWallet();
  
  const [payAmount, setPayAmount] = useState("");
  const [isSwapped, setIsSwapped] = useState(false);
  const [selectedPlayerToken, setSelectedPlayerToken] = useState("AbhishekSharma");

  const { availableTokens, loading: loadingPairs } = useLiquidityPairs();
  const { balances, loading: loadingBalances } = useTokenBalances(account?.address, availableTokens);
  
  const getCurrentTokens = () => {
    const selectedToken = availableTokens.find(token => token.name === selectedPlayerToken);
    
    if (!selectedToken) {
      const fallbackToken = {
        name: "AbhishekSharma",
        type: `${BOSON_TOKEN.type.split("::")[0]}::AbhishekSharma::AbhishekSharma`,
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

  const tokens = getCurrentTokens();
  const selectedToken = availableTokens.find(t => t.name === selectedPlayerToken);
  
  const { tokenPrices, loading: priceLoading, refetchPrice } = useTokenPairPrice(
    selectedToken?.type,
    BOSON_TOKEN.type
  );

  const { receiveAmount, loading: quoteLoading, fetchQuote, setReceiveAmount } = useSwapQuote(
    tokens.from.type,
    tokens.to.type,
    tokenPrices
  );

  const { executeSwap, loading: swapLoading } = useSwapTransaction();

  const handleSwap = async () => {
    const result = await executeSwap(
      account,
      payAmount,
      receiveAmount,
      tokens.from.type,
      tokens.to.type,
      tokens.from.name,
      tokens.fromBalance
    );

    if (result.success) {
      setPayAmount("");
      setReceiveAmount("");
    }
  };

  const swapTokens = () => {
    setPayAmount("");
    setReceiveAmount("");
    setIsSwapped(!isSwapped);
  };

  const setPercent = (pct: number) => {
    const currentBalance = tokens.fromBalance;
    const amt = ((currentBalance * pct) / 100).toString();
    setPayAmount(amt);
    fetchQuote(amt, tokens.from.type, tokens.to.type);
  };

  const handlePayChange = (v: string) => {
    const cleaned = v.replace(/[^0-9.]/g, "");
    setPayAmount(cleaned);
    fetchQuote(cleaned, tokens.from.type, tokens.to.type);
  };

  useEffect(() => {
    // Reset amounts when swapping direction
    setPayAmount("");
    setReceiveAmount("");
  }, [isSwapped, selectedPlayerToken]);

  const combinedLoading = {
    balance: loadingBalances,
    quote: quoteLoading,
    swap: swapLoading,
    price: priceLoading,
    liquidity: loadingPairs,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-1">Token Swap</h1>
            <p className="text-foreground-muted text-sm sm:text-base">
              Exchange your tokens instantly with live pricing
            </p>
          </div>

          {account ? (
            <div className="flex items-center gap-3 bg-surface-elevated border border-border rounded-xl px-4 py-3">
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
              <div className="text-left">
                <div className="text-sm font-medium text-foreground">Aptos Testnet</div>
              </div>
            </div>
          ) : (
            <div className="bg-warning-bg border border-warning rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-warning mb-1">Wallet not connected</p>
              <p className="text-xs text-warning">Use the Connect Wallet button in the navbar</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          <div className="lg:col-span-7">
            <SwapCard
              payAmount={payAmount}
              receiveAmount={receiveAmount}
              isSwapped={isSwapped}
              fromToken={tokens.from}
              toToken={tokens.to}
              fromBalance={tokens.fromBalance}
              toBalance={tokens.toBalance}
              isLoading={combinedLoading}
              account={account}
              availableTokens={availableTokens}
              selectedPlayerToken={selectedPlayerToken}
              onPayAmountChange={handlePayChange}
              onSwapDirection={swapTokens}
              onSwap={handleSwap}
              onSetPercent={setPercent}
              onTokenChange={(tokenName) => {
                setSelectedPlayerToken(tokenName);
                setPayAmount("");
                setReceiveAmount("");
              }}
            />
          </div>

          <div className="lg:col-span-5">
            <LivePricesCard
              isLoading={priceLoading}
              tokenPrices={tokenPrices}
              selectedToken={selectedToken}
              receiveAmount={receiveAmount}
              getCurrentTokens={getCurrentTokens}
              onRefresh={() => {
                if (selectedToken) {
                  refetchPrice(selectedToken.type, BOSON_TOKEN.type);
                }
              }}
              onLoadPrices={() => {
                if (selectedToken) {
                  refetchPrice(selectedToken.type, BOSON_TOKEN.type);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
