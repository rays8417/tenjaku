"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useWallet } from "../../contexts/WalletContext";
import SwapCard from "@/components/swaps/SwapCard";
import LivePricesCard from "@/components/swaps/LivePricesCard";
import { useLiquidityPairs } from "@/hooks/useLiquidityPairs";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { useSwapQuote } from "@/hooks/useSwapQuote";
import { useSwapTransaction } from "@/hooks/useSwapTransaction";
import { useTokenPairPrice } from "@/hooks/useTokenPairPrice";
import { BOSON_TOKEN } from "@/lib/constants";

function SwapsPageContent() {
  const { account } = useWallet();
  const searchParams = useSearchParams();
  
  const [payAmount, setPayAmount] = useState("");
  const [isSwapped, setIsSwapped] = useState(false);
  const [selectedPlayerToken, setSelectedPlayerToken] = useState<string>("");

  const { availableTokens, loading: loadingPairs } = useLiquidityPairs();
  const { balances, loading: loadingBalances } = useTokenBalances(account?.address, availableTokens);
  
  // Set initial selected player token when tokens load or from query params
  useEffect(() => {
    if (availableTokens.length > 0 && !selectedPlayerToken) {
      const playerParam = searchParams.get("player");
      
      if (playerParam) {
        // Normalize the player param for comparison (remove spaces)
        const normalizedParam = playerParam.replace(/\s+/g, "").toLowerCase();
        
        // Try to find the player in available tokens
        const playerToken = availableTokens.find(
          token => {
            const normalizedTokenName = token.name.replace(/\s+/g, "").toLowerCase();
            const normalizedDisplayName = token.displayName.replace(/\s+/g, "").toLowerCase();
            return normalizedTokenName === normalizedParam || 
                   normalizedDisplayName === normalizedParam ||
                   token.name === playerParam; // Also check exact match
          }
        );
        
        if (playerToken) {
          setSelectedPlayerToken(playerToken.name);
          // Set to buy the player token (BOSON -> Player)
          setIsSwapped(false);
        } else {
          // Fallback to first available token if player not found
          setSelectedPlayerToken(availableTokens[0].name);
        }
      } else {
        setSelectedPlayerToken(availableTokens[0].name);
      }
    }
  }, [availableTokens, selectedPlayerToken, searchParams]);
  
  const getCurrentTokens = () => {
    const selectedToken = availableTokens.find(token => token.name === selectedPlayerToken);
    
    // If no token is selected yet, return null to show loading state
    if (!selectedToken) {
      return null;
    }

    const tokenWithDefaults = {
      name: selectedToken.name,
      type: selectedToken.type,
      displayName: selectedToken.displayName,
      team: selectedToken.team,
      position: selectedToken.position,
      avatar: selectedToken.avatar,
      imageUrl: selectedToken.imageUrl,
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
    tokens?.from.type || "",
    tokens?.to.type || "",
    tokenPrices
  );

  const { executeSwap, loading: swapLoading } = useSwapTransaction();

  const handleSwap = async () => {
    if (!tokens) return;
    
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
    if (!tokens) return;
    
    const currentBalance = tokens.fromBalance;
    const amt = ((currentBalance * pct) / 100).toString();
    setPayAmount(amt);
    fetchQuote(amt, tokens.from.type, tokens.to.type);
  };

  const handlePayChange = (v: string) => {
    if (!tokens) return;
    
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

  // Show loading skeleton while tokens are being fetched or no token selected yet
  if (loadingPairs || !tokens) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Token Swap</h1>
              <p className="text-foreground-muted text-sm">
                Exchange your tokens instantly with live pricing
              </p>
            </div>

            {account ? (
              <div className="flex items-center gap-3 bg-surface-elevated border border-border rounded-xl px-4 py-3">
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                <div className="text-left">
                  <a 
                    href="https://boson-faucet.vercel.app/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    Get Testnet BOSON
                  </a>
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
              <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-surface-elevated to-surface px-6 py-4 border-b border-border">
                  <div className="h-6 bg-surface-elevated rounded w-32 animate-pulse"></div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="bg-surface border-2 border-border rounded-2xl p-5">
                    <div className="h-4 bg-surface-elevated rounded w-16 mb-4 animate-pulse"></div>
                    <div className="h-12 bg-surface-elevated rounded mb-3 animate-pulse"></div>
                    <div className="h-4 bg-surface-elevated rounded w-24 animate-pulse"></div>
                  </div>
                  <div className="flex justify-center">
                    <div className="h-14 w-14 rounded-2xl bg-surface-elevated animate-pulse"></div>
                  </div>
                  <div className="bg-surface-elevated border-2 border-primary/30 rounded-2xl p-5">
                    <div className="h-4 bg-surface rounded w-20 mb-4 animate-pulse"></div>
                    <div className="h-12 bg-surface rounded mb-3 animate-pulse"></div>
                    <div className="h-4 bg-surface rounded w-28 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden sticky top-6">
                <div className="bg-gradient-to-r from-primary to-primary-hover px-6 py-4 border-b border-border">
                  <div className="h-6 bg-primary-foreground/20 rounded w-24 animate-pulse"></div>
                </div>
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-surface rounded-xl p-5 animate-pulse">
                      <div className="h-4 bg-surface-elevated rounded w-1/3 mb-3" />
                      <div className="h-8 bg-surface-elevated rounded w-2/3" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Token Swap</h1>
            <p className="text-foreground-muted text-sm">
              Exchange your tokens instantly with live pricing
            </p>
          </div>

          {account ? (
            <div className="flex items-center gap-3 bg-surface-elevated border border-border rounded-xl px-4 py-3">
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
              <div className="text-left">
                <a 
                  href="https://boson-faucet.vercel.app/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  Get Testnet BOSON
                </a>
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

export default function SwapsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Token Swap</h1>
              <p className="text-foreground-muted text-sm">
                Exchange your tokens instantly with live pricing
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            <div className="lg:col-span-7">
              <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-surface-elevated to-surface px-6 py-4 border-b border-border">
                  <div className="h-6 bg-surface-elevated rounded w-32 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    }>
      <SwapsPageContent />
    </Suspense>
  );
}
